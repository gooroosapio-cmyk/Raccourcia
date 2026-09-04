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
