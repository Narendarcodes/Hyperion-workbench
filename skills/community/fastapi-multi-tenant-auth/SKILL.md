---
name: fastapi-multi-tenant-auth
description: "Add multi-tenant auth to FastAPI: argon2 + Redis + OAuth."
version: 1.0.0
author: Hermes Agent (distilled from omniWA implementation session)
license: MIT
---

# FastAPI Multi-Tenant Auth

Battle-tested recipe for turning a single-password FastAPI app into a real multi-tenant
SaaS: per-tenant logins, per-customer third-party OAuth tokens (e.g. Google), and an
owner-approval permission cascade. Every pattern here passed a full pytest suite
(78/78) against real Postgres + Redis.

## When to use

- Replacing a shared `ADMIN_PASSWORD` with per-user/per-tenant dashboard login.
- Storing each customer's OAuth tokens isolated per tenant.
- Gating inbound messages/actions through an owner-approve cascade.

## Core decisions (and why)

| Concern | Choice | Why |
|---|---|---|
| Password hash | argon2id (`argon2-cffi`, t=3, m=64MB, p=4) | OWASP default; GPU-resistant; multi-tenant leak = high impact |
| Sessions | Redis server-side (`dash_session:{sid}` → `"tenant_id:user_id"`, TTL 24h) | Instant revocation beats JWT (logout/compromise kill in one DEL) |
| OAuth state | Redis `oauth_state:{state}` → JSON `{phone, code_verifier, tenant_id}`, TTL 600s | PKCE verifier stays server-side; callback learns the tenant from state |
| Token storage | One row per (tenant_id, user_phone), Fernet-encrypted access+refresh | Tenant isolation at the storage layer; never a shared global token file |
| Cascade | owner/authorized → run; stranger → hold + short-code DM to owner | Product moat; reuses PendingDecision + `<CODE> yes/no` resolution |

## Schema essentials

- `Tenant(id SERIAL, slug UNIQUE)` — slug doubles as the engine/profile key.
- `DashboardUser(UNIQUE(tenant_id,email), argon2 hash, is_owner)`.
- `CustomerGoogleToken(UNIQUE(tenant_id,user_wa_phone), *_enc TEXT, scopes, expiry)`.
- Legacy tables get NULLable `tenant_id`; NULL = pre-migration rows. Never backfill destructively.
- If the repo uses plain SQL migrations (no Alembic), keep models and `migrations/*.sql`
  in lockstep — tests build schema from models via `Base.metadata.create_all`.

## Non-obvious pitfalls (each one bit us)

1. **Pre-migration DB breaks legacy login.** If `dashboard_users` doesn't exist yet, the
   SELECT raises `UndefinedTableError` → 500. Wrap the whole DashboardUser lookup branch in
   try/except and fall through to the legacy password path.
2. **Gate any legacy global-token sync by tenant.** If an old flow copies tokens into a
   shared engine slot/file, restrict it to `tenant_id in (None, 1)` — otherwise tenant B's
   consent leaks into a shared credential slot (cross-tenant data breach).
3. **Phone identity normalization.** Normalize consistently (`lstrip("+")`) between seed
   and lookup; a digit typo silently turns an authorized user into a "stranger held".
4. **Post-OAuth container restarts fail in dev.** Wrap docker-socket calls in try/except;
   they must never break the OAuth callback.
5. **Rehash on login.** If `check_needs_rehash(h)` is true, upgrade the stored hash with
   the just-verified password.

## Full recipe

See `references/multi-tenant-recipe.md` for complete code: models, migration SQL,
`core/auth.py`, login route, tenant-scoped OAuth authorize/callback, `decide()` cascade,
and the test-house pattern (AsyncClient + ASGITransport; mock only external sends).

## Related skills

- Conceptual auth theory: `auth-implementation-patterns` (user-owned).
- Engine-side integration facts (Hermes profiles, Baileys bridge):
  `hermes-integration-patterns` (user-owned).
