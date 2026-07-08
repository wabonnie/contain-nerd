#!/usr/bin/env bash
# Pulla tutte le immagini dal registry locale (verifica del round-trip push/pull).
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && export $(grep -v '^#' .env | xargs) || true
REGISTRY="${REGISTRY:-localhost:5000}"
TAG="${TAG:-1.0}"

for svc in frontend gateway service-auth service-events service-orders service-notifications; do
  image="${REGISTRY}/ticketflow/${svc}:${TAG}"
  echo "==> pull ${image}"
  docker pull "${image}"
done
echo "Pull completato."
