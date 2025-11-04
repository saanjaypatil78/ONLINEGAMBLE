# Infrastructure Overview

This directory houses deployment, CI/CD, and operations tooling for the Solana Axie-style MVP.

## Structure

- [`docker-compose.yaml`](docker-compose.yaml) – TODO: define local stack for backend, proxy, and ancillary services.
- [`github-actions/ci.yml`](github-actions/ci.yml) – TODO: configure lint, type-check, and Anchor test workflows.
- [`scripts/deploy.sh`](scripts/deploy.sh) – TODO: automate Solana program and application deployment.

Refer to the agreed execution plan in [`docs/one-day-execution-plan.md`](../docs/one-day-execution-plan.md) for expectations around CI smoke tests, migration pipelines, and production hardening.