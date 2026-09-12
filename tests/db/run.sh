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

# Les fichiers SQL sont fournis a psql par redirection plutot que par -f :
# le shell les ouvre avec les droits de l'appelant (root), la ou -f les ferait
# lire par le compte postgres. Sur un runner GitHub, le depot est cheque sous
# /home/runner, que ce compte ne peut pas traverser, et chaque -f echouait sur
# "Permission denied". La redirection ne change rien au comportement : avec
# ON_ERROR_STOP, psql sort toujours en non-zero et interrompt le script des la
# premiere erreur.

echo "==> Initialisation du cluster de test"
run "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --no-sync >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCKET_DIR -h '' -c fsync=off" -w start >/dev/null

export PGHOST="$SOCKET_DIR" PGUSER=postgres
PSQL=("$PG_BIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc)

run "$PG_BIN/createdb" -h "$SOCKET_DIR" -U postgres "$DB_NAME"

echo "==> Environnement Supabase simule"
run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"

echo "==> Application des migrations"
for file in "$ROOT"/supabase/migrations/*.sql; do
  printf '    %s\n' "$(basename "$file")"
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$file"
done

echo "==> Jeu de donnees de test"
run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$ROOT/tests/db/fixtures.sql"

if [[ -f "$ROOT/supabase/seed/catalogue.sql" ]]; then
  # Applique deux fois : le seed doit etre idempotent (aucun doublon).
  echo "==> Import du catalogue (x2, verification d'idempotence)"
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" \
    >/dev/null < "$ROOT/supabase/seed/catalogue.sql"
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" \
    >/dev/null < "$ROOT/supabase/seed/catalogue.sql"
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

if compgen -G "$ROOT/supabase/seed/v3/*.sql" > /dev/null; then
  # Catalogue V2 : lots numerotes, appliques deux fois pour verifier
  # l'idempotence. Chaque lot porte son propre controle de completude — c'est
  # l'absence de ce controle qui avait laisse 99 raccourcis en arriere lors de
  # l'import precedent.
  echo "==> Catalogue V2 (x2, verification d'idempotence)"
  for passe in 1 2; do
    for file in "$ROOT"/supabase/seed/v3/*.sql; do
      run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$file"
    done
    # La bascule vient apres les lots : elle refuse de s'executer sur un
    # catalogue partiel, et c'est elle qui expose les treize categories.
    run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null \
      < "$ROOT/supabase/seed/bascule-navigation-v2.sql"
  done
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -A -t -c "
    select '    ' || count(*) || ' raccourcis, ' ||
           (select count(*) from public.categories where external_ref is not null) || ' categories, ' ||
           (select count(*) from public.prompt_questions) || ' questions'
    from public.prompts where catalog_version = 'v2.1';"
fi

if compgen -G "$ROOT/supabase/seed/v5/*.sql" > /dev/null; then
  # Catalogue V5 : le texte editorial, les payloads par moteur, les questions
  # et les alias. Applique deux fois, comme les lots V2 : un lot qui cree un
  # doublon ou une version de trop au second passage est un lot casse.
  #
  # Rien n'est publie ici et aucune commande ne change de famille : les
  # quatorze familles V5 restent invisibles jusqu'a la bascule.
  echo "==> Catalogue V5 (x2, verification d'idempotence)"
  for passe in 1 2; do
    for file in "$ROOT"/supabase/seed/v5/*.sql; do
      run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$file"
    done
  done
  # Trois raccourcis n'ont aucune destination dans le catalogue V5 :
  # /voiceguide, /financecases et /goalsystem. La production les a archives
  # il y a longtemps ; le seed V2, lui, publie tout ce qu'il importe. On
  # remet donc la base de recette dans l'etat de la production avant de
  # basculer — sans quoi le garde-fou de la bascule refuse, et il a raison.
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null -c "
    update public.prompts set status = 'archived'
    where command::text in ('/voiceguide', '/financecases', '/goalsystem');"

  # La bascule vient apres les lots, et deux fois : une bascule qui ne
  # supporte pas d'etre rejouee est une bascule qu'on n'ose plus lancer.
  for passe in 1 2; do
    run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null \
      < "$ROOT/supabase/seed/bascule-taxonomie-v5.sql"
  done
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -A -t -c "
    select '    ' || count(*) || ' commandes V5, ' ||
           (select count(*) from public.prompt_versions where version_label = 'v5-final' and is_current) || ' payloads courants, ' ||
           (select count(*) from public.prompt_aliases) || ' alias'
    from public.prompts where level is not null;"
fi

# Extensions IMAGE : des commandes neuves dans les familles existantes.
# Chacune est appliquee deux fois — un lot d'insertion qui creerait un
# doublon au second passage serait un lot casse — et dans l'ordre des
# versions, chaque extension supposant les precedentes posees.
#
# Elles arrivent en brouillon : rien n'apparait a l'ecran tant que
# l'administration ne les publie pas.
for dossier in "$ROOT"/supabase/seed/v5-[0-9]*/; do
  [ -d "$dossier" ] || continue
  version="$(basename "$dossier")"
  echo "==> Extension ${version/v5-/V5.} (x2, verification d'idempotence)"
  for passe in 1 2; do
    for file in "$dossier"*.sql; do
      run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$file"
    done
  done
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -A -t -c "
    select '    ' || count(*) || ' commandes ${version/v5-/v5.}, ' ||
           (select count(*) from public.prompt_versions pv
              join public.prompt_variants v on v.id = pv.variant_id
              join public.prompts p on p.id = v.prompt_id
                   and p.catalog_version = '${version/v5-/v5.}'
            where pv.is_current) || ' payloads, ' ||
           count(*) filter (where status = 'published') || ' publiees'
    from public.prompts where catalog_version = '${version/v5-/v5.}';"
done

# Refonte globale des payloads : les trois textes de 533 commandes sont
# remplaces. Applique deux fois : au second passage la version courante porte
# deja le nouveau texte, rien ne doit bouger.
if [ -d "$ROOT/supabase/seed/v6-payloads" ]; then
  echo "==> Refonte V6 des payloads (x2, verification d'idempotence)"
  for passe in 1 2; do
    for file in "$ROOT"/supabase/seed/v6-payloads/*.sql; do
      run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/dev/null < "$file"
    done
  done
  run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" -A -t -c "
    select '    ' || count(*) filter (where is_current and version_label = 'v6-payloads') ||
           ' payloads refondus, ' ||
           count(*) filter (where status = 'retired') || ' versions conservees en historique'
    from public.prompt_versions;"
fi

echo "==> Tests d'integration"
status=0
for file in "$ROOT"/tests/integration/*.sql; do
  name="$(basename "$file")"
  if run "${PSQL[@]}" -h "$SOCKET_DIR" -U postgres -d "$DB_NAME" >/tmp/pgtest.out 2>&1 < "$file"; then
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
