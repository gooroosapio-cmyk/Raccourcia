#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Repetition de l'effacement des visuels anterieurs au 18 septembre 2026.
#
# Base jetable, migrations, replica des cartes, et les 1064 VRAIES lignes de
# visuels (memes identifiants, memes cartes, memes dates). Puis :
#   1. l'effacement, joue deux fois — il doit etre rejouable ;
#   2. la restauration — tout doit revenir, avec les memes identifiants ;
#   3. un piege : une ligne du manifeste datee apres le seuil. Le lot doit
#      refuser d'effacer, pas effacer quand meme.
#
#   ./tests/db/repetition-purge-visuels.sh
# ---------------------------------------------------------------------------
set -euo pipefail
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="${PGTEST_DIR:-/tmp/raccourcia-purge}"
DATA_DIR="$WORKDIR/data"; SOCKET_DIR="$WORKDIR/socket"; DB_NAME="raccourcia_purge"
cleanup() { "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORKDIR"; }
trap cleanup EXIT
rm -rf "$WORKDIR"; mkdir -p "$DATA_DIR" "$SOCKET_DIR"
RUNAS=""
if [[ "$(id -u)" -eq 0 ]]; then RUNAS="setpriv --reuid=postgres --regid=postgres --clear-groups"; chown -R postgres:postgres "$WORKDIR"; fi
run() { if [[ -n "$RUNAS" ]]; then $RUNAS "$@"; else "$@"; fi }
run "$PG_BIN/initdb" -D "$DATA_DIR" -U postgres --auth=trust --no-sync >/dev/null
run "$PG_BIN/pg_ctl" -D "$DATA_DIR" -o "-k $SOCKET_DIR -h '' -c fsync=off" -w start >/dev/null
PSQL=("$PG_BIN/psql" -v ON_ERROR_STOP=1 -q --no-psqlrc -h "$SOCKET_DIR" -U postgres -d "$DB_NAME")
run "$PG_BIN/createdb" -h "$SOCKET_DIR" -U postgres "$DB_NAME"
q() { run "${PSQL[@]}" -tAc "$1"; }
lot() { run "${PSQL[@]}" >/dev/null < "$1"; }

run "${PSQL[@]}" >/dev/null < "$ROOT/tests/db/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do lot "$f"; done
lot "$ROOT/tests/db/fixtures.sql"
lot "$ROOT/tests/db/replica-v5.sql"
lot "$ROOT/tests/db/replica-visuels.sql"

attendu() { local obtenu; obtenu=$(q "$1"); if [[ "$obtenu" != "$2" ]]; then echo "ECHEC : $3 (obtenu $obtenu, attendu $2)"; exit 1; fi; echo "  ok  $3 : $obtenu"; }
D=supabase/seed/purge-visuels-avant-18

echo "==> Avant"
attendu "select count(*) from public.prompt_media" 1064 "visuels en base"
READY_AVANT=$(q "select count(*) from public.prompts where media_ready")

echo "==> Effacement, deux passes"
for passe in 1 2; do for f in "$ROOT/$D"/*.sql; do lot "$f"; done; echo "  passe $passe jouee"; done
attendu "select count(*) from public.prompt_media" 374 "visuels restants"
attendu "select count(*) from public.prompt_media where created_at < '2026-09-18'" 0 "visuels anterieurs au seuil"
attendu "select count(*) from public.prompts p where p.show_image_card and not p.media_ready and exists (select 1 from jsonb_array_elements((select jsonb_agg(v) from jsonb_array_elements('$(python3 -c "import json;print(json.dumps([v['prompt_id'] for v in json.load(open('$ROOT/data/visuels/purge-avant-18-septembre.json'))['visuels']]))")'::jsonb) v)) x where x #>> '{}' = p.id::text)" 344 "cartes visuelles repassees « sans visuel » par le declencheur"
attendu "select count(*) from storage.objects where bucket_id='prompt-media'" 1063 "fichiers intacts (le lot SQL n'y touche pas)"

echo "==> Restauration"
lot "$ROOT/supabase/seed/purge-visuels-avant-18-restauration/100_restaurer.sql"
lot "$ROOT/supabase/seed/purge-visuels-avant-18-restauration/100_restaurer.sql"
attendu "select count(*) from public.prompt_media" 1064 "visuels revenus, memes identifiants"
attendu "select count(*) from public.prompts where media_ready" "$READY_AVANT" "indicateurs « visuel pret » revenus a l'identique"

echo "==> Piege : une ligne du manifeste datee apres le seuil"
q "update public.prompt_media set created_at = '2026-09-20' where id = (select (jsonb_array_elements(x) ->> 'id')::uuid from (select '$(python3 -c "import json;print(json.dumps(json.load(open('$ROOT/data/visuels/purge-avant-18-septembre.json'))['visuels'][:1]))")'::jsonb x) s)" >/dev/null
if run "${PSQL[@]}" >/dev/null 2>/tmp/purge-piege.log < "$ROOT/$D/100_effacer.sql"; then echo "ECHEC : le lot a efface malgre une ligne posterieure au seuil"; exit 1; fi
grep -q "datee apres le seuil" /tmp/purge-piege.log && echo "  ok  le lot refuse et n'efface rien"
attendu "select count(*) from public.prompt_media" 1064 "rien n'a ete efface pendant le refus"
echo "==> Repetition terminee"
