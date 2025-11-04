# ONLINEGAMBLE

**PURE LOTTERY SYSTEM 10:90**

## Matka Solana MVP Monorepo

This repository hosts the scaffolding for the Solana Axie-style MVP, partitioned into smart contracts, backend services, frontend client, infrastructure automation, and supporting scripts.

## Directory Overview

- [`contracts`](contracts/) — Anchor-based Solana programs, including [`programs/battle_core/src/lib.rs`](contracts/programs/battle_core/src/lib.rs:1) and [`programs/payout_vault/src/lib.rs`](contracts/programs/payout_vault/src/lib.rs:1).
- [`backend`](backend/) — TypeScript Node service exposing matchmaking and compliance APIs, entrypoint at [`src/index.ts`](backend/src/index.ts:1).
- [`frontend`](frontend/) — Next.js client with Phantom wallet adapter, core pages at [`src/pages/_app.tsx`](frontend/src/pages/_app.tsx:1) and [`src/pages/index.tsx`](frontend/src/pages/index.tsx:1).
- [`infra`](infra/) — Deployment assets such as [`docker-compose.yaml`](infra/docker-compose.yaml:1) and GitHub Actions workflow [`github-actions/ci.yml`](infra/github-actions/ci.yml:1).
- [`scripts`](scripts/) — Automation helpers like [`bootstrap.sh`](scripts/bootstrap.sh:1) for workspace initialization.
- [`docs`](docs/) — Product and execution context, notably [`one-day-execution-plan.md`](docs/one-day-execution-plan.md).

## Getting Started

1. Review the execution objectives in [`docs/one-day-execution-plan.md`](docs/one-day-execution-plan.md) to understand deliverables and checkpoints.
2. Run the bootstrap script once the commands are finalized: `npm run bootstrap`.
3. Populate environment variables by copying each `.env.example` file to `.env` within its respective package.
4. Follow linting and formatting conventions defined by [`./.eslintrc.js`](.eslintrc.js:1) and [`./.prettierrc`](.prettierrc:1).

## Next Steps

- Implement Anchor program logic for battle resolution and payout vault guardrails.
- Flesh out backend routes with real matchmaking, compliance, and pump.fun integrations.
- Connect the frontend UI to backend APIs and Solana programs once IDs are available.
- Expand CI workflows and deployment scripts with concrete commands per the execution plan.

Refer back to [`docs/one-day-execution-plan.md`](docs/one-day-execution-plan.md) for the 24-hour execution milestones and testing requirements.
