# VehicleShield

Car insurance on Ethereum. Owners verify their car with photos, buy cover with USDC against a
signed price, file claims with encrypted photo evidence, and collect payouts from the contract.
Anyone can check a car's cover live on-chain.

Running on the **Sepolia test network** with test USDC. Live app: https://vsi-app.vercel.app

## How it fits together

```
vehicle-web (Next.js) ──► vehicle-api (Hono)  ──► Postgres, Filebase (encrypted photos)
      │                        │ signs quotes (EIP-712), checks roles on-chain
      │                        ▼
      ├──────────────► InsuranceCore + PolicyNFT (Solidity, Sepolia)
      │                        ▲
      └──► vehicle-indexer (Ponder) reads the contract's events
```

| Folder | What it is |
|---|---|
| `vehicle-backend/` | Contracts (`InsuranceCore`, `PolicyNFT`, `MockUSDC`), Hardhat tests, deploy and admin scripts |
| `packages/protocol/` | Shared ABIs, deployment addresses, pricing and quote signing |
| `vehicle-api/` | Quotes, Sign-In with Ethereum, vehicles and photos, claim evidence, assessor console API, public cover check |
| `vehicle-indexer/` | Policies, claims and pool totals from on-chain events, served as REST and GraphQL |
| `vehicle-web/` | The app: quotes, sign-in (Google, email or wallet), dashboard, buy, claims, assessor console, proof of cover |

## Run it locally

Needs Node 20+ and Yarn 1. Python tools (Slither) run with `uvx`.

```bash
yarn install

# Contracts
yarn workspace vehicle-shield-contracts test

# API: copy vehicle-api/.env.example to .env and fill it in (comments explain each value)
yarn workspace vehicle-shield-api dev            # http://localhost:8787

# Indexer against Sepolia
INDEXER_NETWORK=sepolia INDEXER_RPC_URL=<sepolia rpc> yarn workspace vehicle-shield-indexer dev   # http://localhost:42069

# Web: NEXT_PUBLIC_REOWN_PROJECT_ID in vehicle-web/.env.local
yarn workspace vehicle-shield-web dev            # http://localhost:3000
```

Notifications (in-app, email via Resend, SMS via Africa's Talking) are configured in
`vehicle-api/.env`; see `.env.example`. Without provider keys, emails and texts are logged
instead of sent, and with `INDEXER_URL` set the API follows the chain for claim, policy and
renewal events.

Web settings (all optional except the Reown id): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_INDEXER_URL`,
`NEXT_PUBLIC_REOWN_PROJECT_ID`, `NEXT_PUBLIC_SEPOLIA_RPC_URL`, `NEXT_PUBLIC_SITE_URL` (used in
proof-of-cover QR codes).

## Roles

`InsuranceCore` uses OpenZeppelin access control. From `vehicle-backend`:

- `yarn list-roles --network sepolia` shows who holds each role.
- `ROLE=ASSESSOR_ROLE ACCOUNT=0x… yarn grant-role --network sepolia` grants one, and `yarn revoke-role`
  (same settings) takes one away; it won't leave a role with nobody holding it.
- `SAFE=0x… yarn hand-over-admin --network sepolia` moves the admin, treasurer and pauser roles to a
  Safe multisig and has the deployer give up all of its roles. Without `CONFIRM=yes` it only prints
  the plan. Afterwards, granting roles (e.g. a new assessor), withdrawing and pausing are done as
  Safe transactions.

| Role | Can |
|---|---|
| `QUOTE_SIGNER_ROLE` | Sign prices that buyers pay against (held only by the API's key) |
| `ASSESSOR_ROLE` | Review, approve and decline claims; use the assessor console |
| `TREASURER_ROLE` | Withdraw free funds from the pool |
| `PAUSER_ROLE` | Pause buying and payouts in an emergency |

## CI and deploys

Every pull request runs contract tests and coverage, Slither, API and indexer tests, local-chain
end-to-end flows, and the web type-check, tests and build. `main` is protected; changes land
through pull requests. Sepolia deploys are manual and need approval (`contracts-deploy-sepolia`).

## Hosting

The API and indexer run on Render and the database on Neon, both on free tiers in Frankfurt;
see [docs/hosting.md](docs/hosting.md) and `render.yaml`.

## Security

- **Secrets** live only in `.env` files (never committed) and the hosts' secret settings. Hosted
  services start through `scripts/run-redacted.mjs`, which masks API keys, database passwords
  and tokens in their logs.
- **Photos** are encrypted with AES-256-GCM before storage; EXIF location data is stripped.
- **API:** Sign-In with Ethereum sessions, per-client rate limits (stricter for sign-in, writes
  and uploads), protective headers, and roles checked on-chain.
- **Web:** a Content-Security-Policy (scripts only from the site, no framing), HSTS and related
  headers, set in `vehicle-web/next.config.ts`.
- **Scanning:** Slither on the contracts, CodeQL on the TypeScript, and Dependabot for
  dependencies, on every pull request or weekly.

Found a vulnerability? Please report it privately to the maintainers rather than opening a
public issue.

## Before going live

- Independent contract audit; on the live network, admin roles held by a multisig from day one.
- A real stablecoin on the chosen network, and an insurance licence (IRA in Kenya).
- Hosted API, indexer and Postgres, with monitoring and backups. Back up `PHOTO_ENCRYPTION_KEY`
  and `VEHICLE_ID_SALT`: losing either can't be undone.
