#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition de l'import du catalogue v7 sur une replique de la production.
#
# La replique (donnees de production, membres anonymises) n'est jamais
# commitee : elle se reconstitue a la demande et se passe en argument.
#
#   ./tests/db/repetition-catalogue-v7.sh /chemin/replica.sql
#
# Deroule : migrations du depot, replique, puis l'import v7 DEUX fois — une
# transaction chacun, comme en production — et la repetition annulee. Chaque
# passage doit reussir ; le second ne doit rien changer.
# ---------------------------------------------------------------------------
set -euo pipefail

REPLIQUE="${1:?Chemin de la replique SQL attendu}"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-v7}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_v7"

cleanup() { [[ -n "${GARDER:-}" ]] && return; "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORKDIR"; }
trap cleanup EXIT
# Un cluster garde par un passage precedent (GARDER=1) occuperait le meme
# socket : on l'arrete avant d'effacer son dossier.
[[ -f "$DATA_DIR/postmaster.pid" ]] && kill "$(head -1 "$DATA_DIR/postmaster.pid")" 2>/dev/null || true
rm -rf "$WORKDIR"; mkdir -p "$DATA_DIR" "$SOCKET_DIR"

RUNAS=""
if [[ "$(id -u)" -eq 0 ]]; then
  RUNAS="setpriv --reuid=postgres --regid=postgres --clear-groups"
  chown -R postgres:postgres "$WORKDIR"
fi
run() { if [[ -n "$RUNAS" ]]; then $RUNAS "$@"; else "$@"; fi }

run "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --no-sync >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCKET_DIR -h '' -c fsync=off" -w start >/dev/null
export PGHOST="$SOCKET_DIR" PGUSER=postgres
PSQL=("$PG_BIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc -h "$SOCKET_DIR" -U postgres -d "$DB_NAME")
run "$PG_BIN/createdb" -h "$SOCKET_DIR" -U postgres "$DB_NAME"

echo "==> Schema"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "${PSQL[@]}" >/dev/null < "$f"; done

echo "==> Replique de la production"
run "${PSQL[@]}" -At < "$REPLIQUE"

LOTS=("$ROOT"/supabase/seed/catalogue-v7/*.sql)
for passe in 1 2; do
  echo "==> Import v7, passage $passe (une transaction)"
  cat "${LOTS[@]}" | run "${PSQL[@]}" -At
done

echo "==> Repetition annulee (le message doit dire REPETITION)"
SANS_VALIDATION=("${LOTS[@]:0:${#LOTS[@]}-1}")
if cat "${SANS_VALIDATION[@]}" "$ROOT/supabase/seed/catalogue-v7-repetition.sql" \
   | run "${PSQL[@]}" -At 2>/tmp/repetition-v7.err; then
  echo "La repetition aurait du lever." >&2; exit 1
fi
grep -q 'REPETITION v7' /tmp/repetition-v7.err || { cat /tmp/repetition-v7.err >&2; exit 1; }
grep -o 'REPETITION v7.*' /tmp/repetition-v7.err

echo "==> Lecture par le site : chaque carte publiee rend son texte"
run "${PSQL[@]}" -At -c "
do \$v\$
declare v_vides integer;
begin
  select count(*) into v_vides from public.prompts p
  where p.status = 'published'
    and coalesce((select payload from public.lire_prompt_offert(p.id, null) where p.is_free), 'x') = '';
  if v_vides > 0 then raise exception '% carte(s) offerte(s) sans texte.', v_vides; end if;
end \$v\$;
select 'publiees=' || count(*) filter (where status = 'published') ||
       ' brouillons=' || count(*) filter (where status = 'draft') ||
       ' offertes=' || count(*) filter (where is_free and status = 'published')
from public.prompts;"
echo "OK"
