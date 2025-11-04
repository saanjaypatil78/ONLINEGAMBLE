# Contributing Guidelines

This repository follows the rapid execution objectives outlined in [`docs/one-day-execution-plan.md`](docs/one-day-execution-plan.md). Adhere to the standards below to keep the delivery pipeline predictable and audit-friendly.

## Branching & Workflow

- Create feature branches off `develop` using the convention `feature/<area>-<short-description>` (e.g., `feature/backend-matchmaking-api`).
- Use `release/*` branches only when preparing go-live payloads; merge back into `main` after approvals.
- Prefer small, incremental pull requests linked to the relevant execution plan phase.

## Pull Requests & Reviews

- Include a concise summary and checklist referencing the plan milestones impacted.
- Request review from the functional area owner (Smart Contracts, Backend/API, Frontend/Web3, or DevOps & Compliance).
- Wait for at least one peer approval and one functional owner approval before merging.
- Ensure CI (lint, type-check, tests) is green; no merge overrides unless approved by the orchestrator.

## Testing Expectations

Minimum coverage aligns with the execution plan:

- **Smart Contracts:** Anchor unit tests covering battle resolution, NFT mint constraints, payout release guardrails.
- **Backend:** Integration tests for matchmaking queue operations, battle state transitions, and compliance log emission.
- **Frontend:** Cypress smoke tests validating wallet connect, match creation, battle turn display, and on-ramp modal.
- **Compliance/Infra:** Manual validation of KYC gate, AML alert logs, pump.fun alert triggers, plus CI smoke runs.

Add TODO markers when a test suite is deferred, and track follow-up issues in the project board.

## Code Quality

- Follow shared lint and format rules from [`./.eslintrc.js`](.eslintrc.js:1), [`./.prettierrc`](.prettierrc:1), and [`./rustfmt.toml`](rustfmt.toml:1).
- Document placeholder logic with `TODO:` comments describing the intended follow-up.
- Keep environment-sensitive values in `.env` files mirrored from `.env.example`.

## Deployment & Compliance

- Capture Solana program IDs and configuration changes in the deployment notes under [`infra`](infra/).
- Coordinate with compliance owners before enabling features gated by KYC/AML hooks.
- Update runbooks and hypercare notes per Phase 6–7 requirements of the execution plan.