# Hosting VehicleShield (free tiers)

| Piece | Host | Notes |
|---|---|---|
| Web app | Vercel | Already deployed from `vehicle-web` |
| API and indexer | Render (Frankfurt, free) | Defined in `render.yaml`; sleep after 15 min idle |
| Database | Neon (Frankfurt, free) | One database shared by both; each uses its own schema |
| Photos | Filebase | Already in use; encrypted before upload |

## 1. Neon

1. Create a project in **AWS Europe Central (Frankfurt)** with Postgres only.
2. **Connect** → turn **Connection pooling off** → copy the connection string
   (`postgresql://…neon.tech/neondb?sslmode=require`). The indexer needs a direct connection.

## 2. Copy existing data (optional)

From `vehicle-api`, with the Neon string in your shell only (not in a file you commit):

```bash
SOURCE_DATABASE_URL=pglite:./.data/pglite TARGET_DATABASE_URL='postgresql://…' yarn copy-db
```

It creates the tables, copies profiles, vehicles, photo and claim records and notifications,
and skips rows already there, so running it twice is harmless. Stop the local API first.

## 3. Render

1. **New → Blueprint**, connect the GitHub repository, and apply `render.yaml`.
2. Fill in the secrets it asks for:
   - Both services: `DATABASE_URL` = the Neon string.
   - API: the same values as `vehicle-api/.env` (`QUOTE_SIGNER_PRIVATE_KEY`, `VEHICLE_ID_SALT`,
     `SESSION_SECRET`, `PHOTO_ENCRYPTION_KEY`, `FILEBASE_*`, `RPC_URL`, `RESEND_API_KEY`,
     `EMAIL_FROM`, `AT_USERNAME`, `AT_API_KEY`). `VEHICLE_ID_SALT` and `PHOTO_ENCRYPTION_KEY`
     must be exactly the local values, or existing vehicles and photos won't match.
   - Indexer: `INDEXER_RPC_URL` = a Sepolia RPC endpoint.
3. When both are live, check their addresses (e.g. `https://vehicleshield-api.onrender.com`).
   If the indexer's differs from `INDEXER_URL` in the API's settings, update it there.
4. Check `https://<api>/health` and `https://<indexer>/ready` answer.

The hosted API doesn't set `ALLOW_UNVERIFIED_VEHICLES`, so quotes are only signed for
vehicles an assessor has verified.

## 4. Vercel (vehicle-web project → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<api>.onrender.com` |
| `NEXT_PUBLIC_INDEXER_URL` | `https://<indexer>.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://vsi-app.vercel.app` |

Redeploy afterwards: `NEXT_PUBLIC_` values are built into the app.

## 5. Reown

In the Reown dashboard, add `vsi-app.vercel.app` to the project's allowed domains, or Google and
email sign-in won't open on the live site.

## Good to know

- A sleeping service wakes on its first request; the web app shows loading states meanwhile.
  The indexer catches up with the chain on waking, and notifications go out then.
- Each indexer deploy re-indexes into a new schema. Old `idx_…` schemas can be dropped in Neon's
  SQL editor once a newer deploy is live.
- Always-on instances cost about $7 a month per service on Render when you need them.
