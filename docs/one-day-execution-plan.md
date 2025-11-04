# Solana Axie-style MVP One-Day Execution Plan
## Sprint Window
- Duration: T0 to T0+24h (Asia/Calcutta timezone)
- Objective: Launch production-ready Axie-style MVP on Solana with pump.fun token integration, NFT pets, turn-based PvP, basic matchmaking, Phantom onboarding, fiat on-ramp guidance, compliance instrumentation, and deployment.

## Alignment References
- Strategic source: [pumpfun-matka-plan.md](docs/pumpfun-matka-plan.md)

## Scope Prioritisation
| Domain | Must-Ship (Day 0) | Deferrable (Post-Day 0) |
| --- | --- | --- |
| Token & Liquidity | pump.fun bonding curve integration (read metrics, trigger liquidity alerts), MATKA token metadata verification, reserve wallet wiring | Automated rebalance, Raydium/Orca migration scripts, advanced treasury dashboards |
| Smart Contracts | Devnet deployments of minimal `MatkaDrawProgram`, NFT pet minting/ticket issuance, `PayoutVault` escrow, turn-based battle resolver, compliance pause switch | Governance module extensions, staking boosters, circuit-breaker automation refinements |
| Backend Services | REST layer for matchmaking, battle turn relay, pump.fun data ingest, compliance event logging, basic KYC webhook listener | Advanced analytics warehouse, loyalty reward service, travel rule integrations beyond stubs |
| Frontend & Wallet | Phantom onboarding flow, NFT pet gallery, PvP lobby with battle replay basics, pump.fun token stats widget, fiat on-ramp guidance modal | Mobile-native shell, deep analytics dashboards, social features |
| Compliance & Ops | KYC gating hook, AML rule stubs, audit log streams, manual override console, go-live compliance checklist | Automated regulator reporting, jurisdictional geofencing, full SIEM dashboards |
| DevOps | Sandbox + production environments, CI smoke tests, Solana program migration pipeline, production deployment with rollback, 24h hypercare runbook | Multi-region DR automation, full Terraform IaC coverage, canary release automation |

## Functional Area Ownership and Coordination
| Functional Area | Placeholder Owner | Primary Deliverables | Coordination Checkpoints |
| --- | --- | --- | --- |
| Smart Contracts | {Smart Contract Lead} | Battle core program, NFT pet mint schema, payout vault, pump.fun state reader | Stand-ups at T0+1h, T0+5h, T0+17h to sync addresses and migrations |
| Backend/API | {Backend Lead} | Matchmaking API, battle turn service, pump.fun ingestion, compliance logging, wallet session broker | Cross-sync at T0+5h and T0+13h for contract integration; T0+20h go/no-go readiness |
| Frontend/Web3 | {Frontend Lead} | Phantom onboarding, NFT pet UI, battle UI, on-ramp guide, token dashboard | Integrations check at T0+9h with backend; final UX walkthrough T0+19h |
| DevOps & Compliance | {DevOps/Compliance Lead} | Environments, CI/CD, observability, policy docs, risk sign-off, deployment execution | Risk review T0+17h, deployment rehearsal T0+21h, launch bridge T0+23h |
| Product/Orchestrator | {Product/Orchestrator} | Scope governance, blocker resolution, stakeholder comms | Micro-scrums every 4h (T0+0h, +4h, +8h, +12h, +16h, +20h, +23h) |

## Execution Timeline (Timeboxed)
| Timebox (hrs) | Phase | Scope & Critical Tasks | Dependencies | Entry Criteria | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| 0-1 | Phase 0: Kickoff and Environment Readiness | Confirm scope, finalize success metrics, assign placeholders, validate pump.fun configs, bootstrap repos/CI, ensure Solana devnet + Phantom test wallets available | Pre-read strategy, infra access | Team assembled, briefed, access to required services | Shared Slack/bridge, trackers live, env checks green |
| 1-5 | Phase 1: On-Chain Core & pump.fun Hooks | Scaffold `MatkaDrawProgram`, NFT pet mint + metadata, `PayoutVault` escrow, battle turn resolver skeleton, pump.fun bonding-curve read + alert stub, unit tests via Anchor | Kickoff completion, token metadata, devnet | Repo ready, pump.fun configs validated | Deployed devnet programs, greybox tests pass, pump.fun metrics API reachable, addresses documented |
| 5-9 | Phase 2: Backend & Compliance Spine | Build matchmaking REST endpoints, battle turn relay, session service for Phantom sign-ins, pump.fun metric ingestion + alarms, compliance event logger, KYC webhook stub, fixture data seeding | Phase 1 addresses, environment readiness | Program IDs published, backend scaffolds | API responds to core routes, compliance events persist, matchmaking queue works with mocks |
| 9-13 | Phase 3: Frontend & Wallet Experience | Implement Phantom connect flow, NFT pet mint/claim UI, PvP lobby + turn UI, pump.fun dashboard widget, fiat on-ramp guidance modal, responsible gaming copy, QA with devnet | Backend endpoints, contract interfaces | API stable, wallet adapter configured | End-to-end wallet flow works (connect, mint, match), CTA for on-ramp live, UI passes accessibility sweep |
| 13-17 | Phase 4: Gameplay & Matchmaking Integration | Wire frontend to backend battle flow, finalize turn resolution (win/loss/draw states), integrate compliance pause and audit logging, add minimal leaderboard, smoke run of pump.fun alerts | Phases 1-3 | Stable UI + API, contract interactions | Seamless battle loop on devnet with NFT pets, compliance toggle triggers, alert notifications firing |
| 17-20 | Phase 5: Integrated QA, Security, Observability | Execute battle flow regression, load test (synthetic 50 matches), verify KYC gating, review logs/metrics, implement fallback instructions for pump.fun outage, finalize runbooks | Phases 1-4, monitoring stack | Observability configured, test scripts ready | QA sign-off, issues triaged, runbooks published, monitoring dashboards with alerts |
| 20-23 | Phase 6: Production Hardening & Approvals | Deploy Solana programs to mainnet gating accounts, configure production API + frontend, run compliance and legal review, perform dry-run deployment, rollback rehearsal | QA exit, compliance involvement | Test results, risk review schedule | Deployment artefacts ready, compliance sign-off secured, hypercare roster confirmed |
| 23-24 | Phase 7: Launch & Hypercare | Execute production deploy, verify pump.fun data, perform smoke tests (wallet, match, battle, on-ramp guide), publish status update, commence 24h monitoring, open war-room | Phase 6 go/no-go | Go decision logged, release artifacts staged | MVP live, monitoring active, owners on-call, incident comms templates queued |

### Parallelisation Notes
- Smart Contracts and Backend may overlap between hours 1-9; coordinate through shared schema documents.
- Frontend may begin UI scaffolding during Phase 2 using mocked APIs; real integration timed with Phase 3 exit criteria.
- Compliance reviews should shadow development to prevent late surprises; aim for rolling reviews at each checkpoint.

## Risk Mitigation Plan
| Risk | Impact | Mitigation | Trigger Action |
| --- | --- | --- | --- |
| Solana network instability | Blocks delays battle settlement | Prepare devnet replay script, maintain localnet fallback for demos | Switch to localnet for demos, communicate downtime |
| pump.fun API latency/outage | Token metrics unavailable | Cache last-known metrics, add manual update path | Enable manual override, notify users via status page |
| Compliance hook not ready | Launch blocked | Pair DevOps/compliance early, keep manual override console | Invoke manual KYC gate, delay launch if gating fails |
| Wallet onboarding friction | Drop-off in first session | Provide guided tour, captured metrics, fallback to burner devnet wallet for QA | Deploy updated copy, escalate to frontend owner |

## Testing Requirements (Minimum)
- Smart Contracts: Anchor unit tests covering battle resolution, NFT mint constraints, payout release guardrails.
- Backend: Integration tests for matchmaking enqueue/dequeue, battle state transitions, compliance log emission.
- Frontend: Cypress smoke for wallet connect, match creation, battle turn display, on-ramp modal.
- Compliance: Manual validation of KYC gate, AML alert log entries, pump.fun alert triggers.
- DevOps: CI pipeline run, automated lint + security scan, deployment rollback rehearsal.

## Deployment Checklist
1. Confirm final Solana program IDs and update environment configs.
2. Validate pump.fun bonding curve endpoints and API keys in production env.
3. Rotate Phantom application keys, ensure wallet connect works against mainnet-beta.
4. Populate production NFT metadata (pets) in Arweave/IPFS with verified URIs.
5. Enable compliance pause switch and verify manual override console.
6. Run pre-launch health check script (API 200 responses, websocket status, alert destinations).
7. Publish internal release notes, incident contacts, and user-facing launch announcement.
8. Initiate hypercare bridge and set monitoring thresholds for battles, wallet connects, pump.fun metrics, compliance alerts.

## Exit Criteria for One-Day Sprint
- All must-ship scope deployed and verified in production.
- Compliance owner signs launch checklist.
- Monitoring alerts firing to on-call rotation.
- War-room staffed for first 24h post-launch.