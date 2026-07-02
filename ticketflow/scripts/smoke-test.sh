#!/usr/bin/env bash
# Test rapido delle API principali attraverso il gateway.
set -euo pipefail
GW="${1:-http://localhost:8000}"

echo "==> Health gateway"; curl -sf "$GW/health"; echo
echo "==> Login admin"
TOKEN=$(curl -sf -X POST "$GW/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ticketflow.dev","password":"admin123"}' | \
  sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "token: ${TOKEN:0:24}..."
echo "==> Lista eventi"; curl -sf "$GW/api/events/" | head -c 300; echo
EVENT_ID=$(curl -sf "$GW/api/events/" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
echo "==> Creazione ordine per evento $EVENT_ID"
curl -sf -X POST "$GW/api/orders/" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d "{\"event_id\":$EVENT_ID,\"quantity\":1}"; echo
echo "==> Notifiche (attendi ~2s per il consumer)"; sleep 2
curl -sf "$GW/api/notifications/" -H "Authorization: Bearer $TOKEN" | head -c 300; echo
echo "Smoke test completato."
