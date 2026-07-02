#!/usr/bin/env bash
# =============================================================================
# Crea l'archivio ZIP di consegna escludendo file rigenerabili e temporanei.
# Uso:  bash scripts/create-zip.sh
# Output: ticketflow-<data>.zip nella cartella superiore.
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_NAME="ticketflow"
STAMP="$(date +%Y%m%d)"
OUT="../${PROJECT_NAME}-${STAMP}.zip"

echo "==> Creazione archivio ${OUT}"
rm -f "${OUT}"

# -x: pattern da escludere (dipendenze, build, cache, segreti, temporanei).
zip -r "${OUT}" . \
  -x "*/node_modules/*" \
  -x "*/dist/*" \
  -x "*/.vite/*" \
  -x "*/__pycache__/*" \
  -x "*.pyc" \
  -x "*/.venv/*" \
  -x "*/venv/*" \
  -x "*.log" \
  -x "*/.git/*" \
  -x ".git/*" \
  -x "*.zip" \
  -x ".env" \
  -x "*.DS_Store" \
  -x "*/tmp/*"

echo "==> Contenuto archivio (primo livello):"
unzip -l "${OUT}" | head -30
echo
echo "Archivio pronto: ${OUT}"
