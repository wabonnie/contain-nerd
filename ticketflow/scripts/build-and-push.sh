#!/usr/bin/env bash
# =============================================================================
# Builda, tagga e pusha tutte le immagini dei servizi sul registry locale.
# Prerequisito: il registry deve essere in esecuzione (docker compose -f services-compose.yml up -d registry).
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

# Carica le variabili da .env se presente.
[ -f .env ] && export $(grep -v '^#' .env | xargs) || true

REGISTRY="${REGISTRY:-localhost:5000}"
TAG="${TAG:-1.0}"

echo "==> Avvio del registry locale (se non attivo)"
docker compose -f services-compose.yml up -d registry

echo "==> Attendo che il registry risponda su ${REGISTRY}"
for i in $(seq 1 30); do
  if curl -sf "http://${REGISTRY}/v2/" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "==> Build delle immagini (docker compose build)"
docker compose build

echo "==> Push sul registry ${REGISTRY}"
for svc in frontend gateway service-auth service-events service-orders service-notifications; do
  image="${REGISTRY}/ticketflow/${svc}:${TAG}"
  echo "    push ${image}"
  docker push "${image}"
done

echo "==> Immagini presenti nel registry:"
curl -s "http://${REGISTRY}/v2/_catalog"
echo
echo "Completato."
