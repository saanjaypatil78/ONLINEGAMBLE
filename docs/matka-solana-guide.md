# Matka Solana Guide

Welcome to the Matka Solana MVP. This guide walks you through the project in plain language so you can settle in, set up your workspace, and understand how the day-to-day flow works.

## Guide Map

1. [Project Overview & Goals](#project-overview--goals)
2. [What’s Inside the Repository](#whats-inside-the-repository)
3. [Prerequisites for Newcomers](#prerequisites-for-newcomers)
4. [Workspace Setup Path](#workspace-setup-path)
5. [One-Shot Deployment Checklist](#one-shot-deployment-checklist)
6. [Daily Operations & Monitoring](#daily-operations--monitoring)
7. [Getting Help](#getting-help)
8. [Glossary](#glossary)

---

## Project Overview & Goals

The Matka Solana MVP is an early version of a skill-based lottery-style game built on the Solana blockchain. The goal of this MVP is to prove out the core experience end-to-end: players enter matches, winners are determined, and rewards are distributed automatically and transparently.

### Success Looks Like

- A single repository that contains every moving part (smart contracts, services, website, and infrastructure).
- A straightforward setup process that any new teammate can complete in under an hour.
- A light-touch operations routine so the team can focus on player feedback and feature polish.

---

## What’s Inside the Repository

- **Smart Contracts (`contracts/`)**: On-chain programs that run the core game logic and handle payouts.
- **Backend Service (`backend/`)**: A Node.js service that talks to the blockchain and presents friendly APIs. Deep-dive notes live in `backend/DEV_BACKEND_GUIDE.md`.
- **Web Frontend (`frontend/`)**: A Next.js site that players use to join matches and see outcomes.
- **Infrastructure (`infra/`)**: Docker files, monitoring dashboards, and GitHub Actions workflows to ship and operate the project. Operator-focused notes sit in `infra/OPS_INFRA_GUIDE.md`.
- **Scripts (`scripts/`)**: Workspace automation such as the bootstrap helper.
- **Documentation (`docs/`)**: This guide plus playbooks and planning materials.

---

## Prerequisites for Newcomers

Before you start, make sure you have the basics in place:

- **Accounts**: GitHub access to the private repo and permission to run GitHub Actions.
- **Software**:
  - Node.js 18 or newer (use Volta, nvm, or the official installer).
  - Git installed and configured with your GitHub account.
  - (Optional but helpful) Solana CLI and Anchor CLI if you plan to touch the smart contracts.
- **Hardware**: A laptop capable of running Docker (for infrastructure testing) and standard Node.js tooling.
- **Access**: Invite to the team chat channel (Slack/Discord) and pager/alerting tools if you will be on support duty.

---

## Workspace Setup Path

Follow this once on any new machine:

1. **Clone** the repository and open it in your editor of choice.
2. **Install dependencies** from the monorepo root:  
   ```bash
   npm install
   ```
   This command installs packages for every workspace.
3. **Run the bootstrap helper** to nudge you through follow-up tasks:
   ```bash
   ./scripts/bootstrap.sh
   ```
4. **Copy environment files**: For each package, duplicate the `.env.example` file to `.env` and populate values the team shares in the secrets manager.
5. **Verify tooling**: Ensure Node.js 18 is active, and confirm prettier/eslint integrations in your editor are working.
6. **Smoke test**: Run `npm run lint` to confirm everything compiles before moving on.

---

## One-Shot Deployment Checklist

When you need to stand up a fresh environment or perform a full refresh:

1. **Pull the latest main branch** to capture updates.
2. **Install dependencies** (again) with `npm install` in case the lockfile changed.
3. **Prepare configuration**:
   - Copy `.env.example` to `.env` in `backend/`, `frontend/`, and the repo root.
   - Confirm Solana program IDs match the deployment target.
4. **Bootstrap scripts**: Execute `./scripts/bootstrap.sh` to run the guided setup tasks.
5. **Automated pipeline**: Trigger the GitHub Actions “One-Click Deploy” workflow from the Actions tab. It builds contracts, deploys services, and updates monitoring dashboards.
6. **Spot checks**:
   - Open the frontend preview URL to verify the site loads.
   - Review the backend health endpoint (documented in `backend/DEV_BACKEND_GUIDE.md`) for green status.
   - Ensure dashboards in `infra/observability/` reflect the new deployment.

---

## Daily Operations & Monitoring

- **Morning glance**: Review GitHub Actions builds for overnight failures.
- **Monitoring**: Check the dashboards defined under `infra/observability/` (alerts, dashboards, Prometheus config) for anomalies.
- **Support channel**: Keep an eye on the player feedback/chat channel; acknowledge incoming issues quickly.
- **Environment hygiene**: Rotate environment secrets according to the security calendar and confirm `.env` files are current.
- **Documentation refresh**: Note any manual tweaks you needed to make and feed them back into this guide or the developer guides.

---

## Getting Help

- **Team chat**: First stop for quick questions or blockers. Pin urgent issues so the team sees them.
- **Developer guides**: Use `backend/DEV_BACKEND_GUIDE.md` for service-specific instructions and `infra/OPS_INFRA_GUIDE.md` for operations runbooks.
- **Issue tracker**: Open a GitHub issue for anything that needs tracking beyond the current day.
- **Escalation**: If production is impacted, follow the on-call process described in the infrastructure guide and loop in the project lead.

---

## Glossary

- **Anchor**: A framework that simplifies writing Solana smart contracts.
- **Bootstrap Script**: `./scripts/bootstrap.sh` – a helper that installs dependencies and reminds you about setup chores.
- **GitHub Actions**: Automated workflows that build, test, and deploy the project.
- **Matchmaking Service**: Backend component that pairs players and records match outcomes.
- **Prometheus/Grafana**: Monitoring tools used to keep tabs on system health.
- **Solana Program**: The blockchain code (smart contract) that enforces game rules and payouts.

Keep this guide bookmarked; it is the single entry point for anyone joining or returning to the project. For deeper technical dives, jump into the developer guides linked above.