#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition generale de la refonte V5 sur un Postgres jetable.
#
# Monte un cluster neuf, applique toutes les migrations, charge un replica de
# la production (memes identifiants, memes statuts, memes visuels), puis passe
# les 40 lots — deux fois, parce qu'un lot qui n'est pas rejouable n'est pas
# un lot.
#
#   ./tests/db/repetition-v5.sh
# ---------------------------------------------------------------------------
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-v5}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_v5"

cleanup() { "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORKDIR"; }
trap cleanup EXIT
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

echo "==> Socle"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do run "${PSQL[@]}" >/dev/null < "$f"; done
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/fixtures.sql"

echo "==> Replica de production"
run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/replica-v5.sql"
run "${PSQL[@]}" -c "select 'avant : '||count(*)||' cartes, '||
  (select count(*) from public.prompt_media)||' visuels' from public.prompts;"

for passe in 1 2; do
  echo "==> Passe $passe sur les lots"
  for f in "$ROOT"/supabase/seed/catalogue-final-v5/*.sql; do
    printf '    %s' "$(basename "$f")"
    if run "${PSQL[@]}" >/dev/null < "$f"; then echo "  ok"; else echo "  ECHEC"; exit 1; fi
  done
done

echo "==> Etat final"
run "${PSQL[@]}" -c "select status, count(*) from public.prompts where catalog_version='v5' group by 1 order by 1;"
run "${PSQL[@]}" -c "select 'visuels'   as quoi, count(*) from public.prompt_media
                     union all select 'actives hors V5', count(*) from public.prompts
                       where catalog_version is distinct from 'v5' and status <> 'archived'
                     union all select 'alias', count(*) from public.prompt_aliases
                     union all select 'champs', count(*) from public.prompt_fields;"
echo "==> Repetition terminee"
