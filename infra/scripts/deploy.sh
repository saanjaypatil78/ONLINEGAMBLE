#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-devnet}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() {
  printf '[deploy][%s] %s\n' "${ENVIRONMENT}" "${1}"
}

log "Starting deployment pipeline from ${ROOT_DIR}"

log "Step 1: Installing dependencies"
npm install --prefer-offline

log "Step 2: Running lint across workspaces"
npm run lint

log "Step 3: Running tests across workspaces"
npm run test

log "Step 4: Type-checking backend and frontend"
(
  cd "${ROOT_DIR}/backend" && npm run typecheck
)
(
  cd "${ROOT_DIR}/frontend" && npm run typecheck
)

log "Step 5: Building frontend and backend artifacts"
npm run build

log "Step 6: Building Anchor programs"
(
  cd "${ROOT_DIR}/contracts" && anchor build
)

log "Step 7: Deploying Anchor programs to ${ENVIRONMENT}"
# TODO: Replace with anchor deploy --provider.cluster once addresses are finalized.
echo ">> Skipping actual deploy - integrate with Solana CLI or Anchor once ready."

log "Step 8: Syncing program IDs to environment files"
# TODO: propagate new program IDs into backend/.env, frontend/.env, and secrets manager.

log "Step 9: Executing backend migrations"
# TODO: call database migration scripts once persistence layer exists.
echo ">> No migrations defined yet."

log "Step 10: Publishing artifacts"
# TODO: upload build outputs to artifact storage (S3, GitHub Releases, etc.).

log "Step 11: Triggering infrastructure automation for ${ENVIRONMENT}"
# TODO: integrate with Terraform or deployment orchestrator.
echo ">> Skipping infra automation - provide implementation when ready."

log "Deployment skeleton completed. Review TODOs before using in production."