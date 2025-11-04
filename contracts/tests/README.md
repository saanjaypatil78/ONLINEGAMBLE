# Contracts Testing Guide

This directory will host Anchor-based integration and unit tests for the Solana programs defined under `programs/`.

## Getting Started

1. Install Anchor CLI and Solana toolchain matching the versions agreed in the execution plan.
2. Configure your local validator or devnet RPC endpoint.
3. Copy environment variables into a `.env` file if sensitive keys are required for tests.

## Planned Test Suites

- `battle_core`: Deterministic happy-path battle flow coverage via [`battle-core.spec.ts`](battle-core.spec.ts:1). TODO: extend with payout vault CPI and randomness assertions.
- `payout_vault`: TODO: cover escrow initialization, payout release guardrails, and compliance pause switch.

## Execution

```bash
anchor test -- --features battle_core
```

Execution notes:

1. Ensure `solana-test-validator` or `anchor localnet` is running before invoking the suite.
2. Confirm the wallet specified in [`Anchor.toml`](../Anchor.toml:1) has sufficient airdropped SOL (Anchor automatically requests airdrops for local providers).
3. Export any required overrides, for example:

```bash
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=~/.config/solana/id.json
```

Anchor will generate program type definitions under `target/types` during the first `anchor build`/`anchor test`.

Refer back to the agreed deliverables in [`docs/one-day-execution-plan.md`](../../docs/one-day-execution-plan.md) for minimum coverage expectations.