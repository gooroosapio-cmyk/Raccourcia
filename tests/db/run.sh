#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Rejoue toutes les migrations sur un Postgres jetable puis execute les tests
# d'integration (RLS, idempotence, cascade de visibilite).
#
#   ./tests/db/run.sh              applique les migrations + lance les tests
#   ./tests/db/run.sh --keep       laisse le cluster ouvert pour inspection
# ---------------------------------------------------------------------------
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-pgtest}"
DATA_DIR="$WORKDIR/data"
SOCKET_DIR="$WORKDIR/socket"
DB_NAME="raccourcia_test"
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1

cleanup() {
  if [[ $KEEP -eq 0 ]]; then
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

rm -rf "$WORKDIR"
mkdir -p "$DATA_DIR" "$SOCKET_DIR"

# Postgres refuse de tourner en root : on delegue au compte postgres si besoin.
RUNAS=""
if [[ "$(id -u)" -eq 0 ]]; then
  RUNAS="setpriv --reuid=postgres --regid=postgres --clear-groups"
  chown -R postgres:postgres "$WORKDIR"
fi

run() { if [[ -n "$RUNAS" ]]; then $RUNAS "$@"; else "$@"; fi }

echo "==> Initialisation du cluster de test"
run "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --no-sync >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCKET_DIR -h '' -c fsync=off" -w start >/dev/null

export PGHOST="$SOCKET_DIR" PGUSER=postgres
PSQL=("$PG_BIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc)

run "$PG_BIN/createdb" -h "$SOCKET_DIR" -U postgres "$DB_NAME"

echo "==> Environnement Supabase simule"
run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -f "$ROOT/tests/db/supabase_stub.sql" >/dev/null

echo "==> Application des migrations"
for file in "$ROOT"/supabase/migrations/*.sql; do
  printf '    %s\n' "$(basename "$file")"
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -f "$file" >/dev/null
done

echo "==> Jeu de donnees de test"
run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -f "$ROOT/tests/db/fixtures.sql" >/dev/null

if [[ -f "$ROOT/supabase/seed/catalogue.sql" ]]; then
  # Applique deux fois : le seed doit etre idempotent (aucun doublon).
  echo "==> Import du catalogue (x2, verification d'idempotence)"
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" \
    -f "$ROOT/supabase/seed/catalogue.sql" >/dev/null
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" \
    -f "$ROOT/supabase/seed/catalogue.sql" >/dev/null
fi

# Le seed factorise les valeurs communes : on verifie que la base contient
# bien, champ par champ, ce que decrit le catalogue editorial source.
if [[ -f "$ROOT/supabase/seed/catalogue.sql" ]]; then
  echo "==> Fidelite du catalogue"
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -A -t -o /tmp/pgdump.json -c "
    select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
      select p.external_ref, p.command::text, p.name, p.mode::text, p.short_description,
             p.intention, p.use_cases, p.usage_example, p.tags,
             p.required_variables, p.optional_variables,
             p.minimal_context, p.sufficient_context, p.default_values,
             p.expected_output, p.output_format, p.quality_criteria, p.preserve_rules,
             p.avoid_rules, p.limitations, p.fallback_if_incomplete,
             p.usage_conditions, p.primary_input, p.accepted_inputs, p.attachment_rule,
             p.blocking_condition, p.questionnaire_mode, p.max_questions,
             p.thumbnail_spec, p.thumbnail_layout, p.copy_rule,
             p.test_nominal, p.test_incomplete_context, p.test_blocking,
             p.risk_level::text, p.priority, p.source_status, p.catalog_version,
             p.show_image_card,
             (select count(*) from public.prompt_variants v where v.prompt_id = p.id) as variant_count,
             (select count(*) from public.prompt_variants v
                join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
              where v.prompt_id = p.id) as current_version_count,
             (select distinct pv.payload from public.prompt_variants v
                join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
              where v.prompt_id = p.id) as payload,
             (select distinct pv.qcm from public.prompt_variants v
                join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
              where v.prompt_id = p.id) as qcm,
             (select distinct pv.qcm_trigger from public.prompt_variants v
                join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
              where v.prompt_id = p.id) as qcm_trigger,
             -- Bloc QCM tel qu'il apparait dans le payload, extrait entre
             -- l'en-tete des questions et la section EXECUTION.
             nullif(substring(
               (select distinct pv.payload from public.prompt_variants v
                  join public.prompt_versions pv on pv.variant_id = v.id and pv.is_current
                where v.prompt_id = p.id)
               from 'maximum [0-9]+\.' || chr(10) || '(.*)' || chr(10) || chr(10) || '3\. EXÉCUTION'
             ), '') as qcm_block
      from public.prompts p where p.external_ref like 'RCI-%'
    ) x;"
  if node "$ROOT/tests/db/verify-fidelity.mjs" /tmp/pgdump.json; then :; else exit 1; fi
fi

echo "==> Tests d'integration"
status=0
for file in "$ROOT"/tests/integration/*.sql; do
  name="$(basename "$file")"
  if run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -f "$file" >/tmp/pgtest.out 2>&1; then
    printf '    \033[32mOK\033[0m   %s\n' "$name"
  else
    printf '    \033[31mFAIL\033[0m %s\n' "$name"
    sed 's/^/         /' /tmp/pgtest.out
    status=1
  fi
done

if [[ $KEEP -eq 1 ]]; then
  echo "==> Cluster conserve : psql -h $SOCKET_DIR -U postgres -d $DB_NAME"
fi

exit $status
