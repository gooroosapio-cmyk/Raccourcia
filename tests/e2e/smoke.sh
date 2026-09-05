#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Tests de fumee end-to-end contre une instance en cours d'execution.
#
#   npm run dev &                       # puis, dans un autre terminal :
#   ./tests/e2e/smoke.sh                # cible http://localhost:3000
#   BASE_URL=https://... ./tests/e2e/smoke.sh
#
# Verifie la surface publique : ce qu'un visiteur non authentifie obtient.
# Aucun secret n'est lu, aucune donnee n'est ecrite.
# ---------------------------------------------------------------------------
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
FAILED=0

# Compare le code HTTP obtenu au code attendu, et l'en-tete Location si fourni.
check() {
  local label="$1" method="$2" path="$3" expected="$4" expected_location="${5:-}"
  local headers body code location
  headers="$(mktemp)"
  body="$(mktemp)"

  if [[ "$method" == GET ]]; then
    code="$(curl -sS -o "$body" -D "$headers" -w '%{http_code}' "$BASE_URL$path")"
  else
    local extra=()
    [[ -n "${SIGNATURE:-}" ]] && extra=(-H "x-chariow-signature: $SIGNATURE")
    code="$(curl -sS -o "$body" -D "$headers" -w '%{http_code}' \
      -X "$method" "$BASE_URL$path" \
      -H 'Content-Type: application/json' \
      "${extra[@]}" \
      -d "${PAYLOAD:-{\}}")"
  fi

  location="$(grep -i '^location:' "$headers" | tr -d '\r' | sed 's/^[Ll]ocation: *//')"
  rm -f "$headers" "$body"

  if [[ "$code" != "$expected" ]]; then
    printf '  \033[31mECHEC\033[0m %-44s attendu %s, obtenu %s\n' "$label" "$expected" "$code"
    FAILED=1
    return
  fi
  if [[ -n "$expected_location" && "$location" != "$expected_location" ]]; then
    printf '  \033[31mECHEC\033[0m %-44s Location attendu %s, obtenu %s\n' \
      "$label" "$expected_location" "$location"
    FAILED=1
    return
  fi
  printf '  \033[32mOK\033[0m    %-44s %s\n' "$label" "$code"
}

echo "==> Cible : $BASE_URL"

echo "==> Pages publiques"
check "accueil"       GET /              200
check "connexion"     GET /connexion     200
check "activation"    GET /activation    200
check "recuperation"  GET /recuperation  200
check "page inconnue" GET /nawak-404     404

# L'intention de depart doit survivre a la redirection (Spec UX/UI, section 17).
echo "==> Espaces proteges : redirection vers /connexion"
check "/app"              GET /app              307 '/connexion?suite=%2Fapp'
check "/app/favoris"      GET /app/favoris      307 '/connexion?suite=%2Fapp%2Ffavoris'
check "/app/recents"      GET /app/recents      307 '/connexion?suite=%2Fapp%2Frecents'
check "/compte"           GET /compte           307 '/connexion?suite=%2Fcompte'
check "/admin"            GET /admin            307 '/connexion?suite=%2Fadmin'
check "/admin/raccourcis" GET /admin/raccourcis 307 '/connexion?suite=%2Fadmin%2Fraccourcis'

echo "==> Webhook Chariow : aucune signature valide, aucun traitement"
PAYLOAD='{"event":"successful.sale","data":{}}' \
  check "webhook sans signature" POST /api/webhooks/chariow 401
PAYLOAD='{"event":"successful.sale","data":{}}' SIGNATURE=deadbeef \
  check "webhook signature invalide" POST /api/webhooks/chariow 401

echo "==> Resolution de payload : reservee aux membres"
check "GET refuse (methode)" GET /api/resolve-prompt 405
PAYLOAD='{"promptId":"pas-un-uuid","provider":"chatgpt","surface":"detail"}' \
  check "corps invalide" POST /api/resolve-prompt 400
# UUID v4 valide mais sans session : le refus doit venir de l'authentification.
PAYLOAD='{"promptId":"5dd47efd-1736-458c-872f-55a337abe63f","provider":"chatgpt","surface":"detail"}' \
  check "sans session" POST /api/resolve-prompt 401

if [[ $FAILED -eq 0 ]]; then
  echo "==> Tous les tests de fumee passent."
else
  echo "==> Des tests de fumee ont echoue." >&2
fi
exit $FAILED
