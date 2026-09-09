# Multi-Tenant Auth Recipe (session-verified, 78/78 tests green)

Complete implementation patterns. Stack: FastAPI + async SQLAlchemy 2.0 (`Mapped`) +
Postgres + Redis + pytest-asyncio.

## 1. Models (SQLAlchemy 2.0 style)

```python
class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class DashboardUser(Base):
    __tablename__ = "dashboard_users"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_tenant_email"),)

class CustomerGoogleToken(Base):
    __tablename__ = "customer_google_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), index=True, nullable=False)
    user_wa_phone: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    access_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token_enc: Mapped[str | None] = mapped_column(Text)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scopes: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(255))
    __table_args__ = (UniqueConstraint("tenant_id", "user_wa_phone", name="uq_tenant_phone_token"),)
```

Legacy `users` table gains NULLable `tenant_id` (NULL = pre-migration row).

## 2. Migration SQL (repos without Alembic)

```sql
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dashboard_users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(512) NOT NULL,
    is_owner BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_email UNIQUE (tenant_id, email)
);
CREATE TABLE IF NOT EXISTS customer_google_tokens (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_wa_phone VARCHAR(32) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    token_expiry TIMESTAMPTZ,
    scopes TEXT,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_phone_token UNIQUE (tenant_id, user_wa_phone)
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
```

Apply with: `docker exec -i <pg_container> psql -U <user> -d <db> < migrations/007_multi_tenant.sql`
then seed the default tenant and `UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL;`

## 3. argon2 hashing

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)
def hash_password(p): return _ph.hash(p)
def verify_password(p, h):
    try: return _ph.verify(h, p)
    except (VerifyMismatchError, InvalidHashError, ValueError): return False
def needs_rehash(h):
    try: return _ph.check_needs_rehash(h)
    except Exception: return False
```

## 4. Redis sessions (`core/auth.py`)

```python
SESSION_COOKIE = "omniwa_session"
SESSION_TTL_SECONDS = 86400

async def create_session(tenant_id: int, dashboard_user_id: int) -> str:
    sid = secrets.token_urlsafe(32)
    await cache_set(f"dash_session:{sid}", f"{tenant_id}:{dashboard_user_id}", ttl_seconds=SESSION_TTL_SECONDS)
    return sid

async def get_principal(request) -> DashboardPrincipal:
    sid = request.cookies.get(SESSION_COOKIE)
    if not sid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    val = await cache_get(f"dash_session:{sid}")
    if not val or ":" not in val:
        raise HTTPException(status_code=401, detail="Session expired")
    tenant_str, user_str = val.split(":", 1)
    return DashboardPrincipal(tenant_id=int(tenant_str), dashboard_user_id=int(user_str))

async def destroy_session(request):  # instant revoke — why not JWT
    sid = request.cookies.get(SESSION_COOKIE)
    if sid:
        await cache_set(f"dash_session:{sid}", "", ttl_seconds=1)
```

Cookie flags: HttpOnly, Secure, SameSite=lax, max_age=86400.

## 5. Login route (with legacy fallback)

```python
@router.post("/login")
async def login_submit(request: Request, password: str = Form(...), email: str = Form("")) -> Response:
    try:
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(DashboardUser).where(DashboardUser.email == email.strip().lower()))
            dash_user = res.scalar_one_or_none()
            if dash_user and verify_password(password, dash_user.password_hash):
                if needs_rehash(dash_user.password_hash):
                    dash_user.password_hash = hash_password(password); await db.commit()
                sid = await create_session(dash_user.tenant_id, dash_user.id)
                response = RedirectResponse(url="/dashboard", status_code=303)
                set_session_cookie(response, sid)
                return response
    except Exception:
        pass  # pre-migration DB (UndefinedTableError) → legacy path below

    if not email and password == settings.ADMIN_PASSWORD:
        # legacy single-owner fallback; optionally guard on zero DashboardUser rows
        ...
    return RedirectResponse(url="/login?error=true", status_code=303)
```

## 6. Tenant-scoped OAuth state + token storage

Authorize endpoint (dashboard-authenticated):

```python
principal = await get_principal(request)          # tenant scope for the token
state = secrets.token_urlsafe(24)
auth_url, code_verifier = build_authorization_url(state)   # google_auth_oauthlib Flow; PKCE
await cache_set(f"oauth_state:{state}", json.dumps({
    "phone": owner_phone, "code_verifier": code_verifier, "tenant_id": principal.tenant_id,
}), ttl_seconds=600)
return RedirectResponse(url=auth_url)
```

Callback:

```python
data = json.loads(await cache_get(f"oauth_state:{state}"))
creds = exchange_code_for_tokens(code, code_verifier=data["code_verifier"])
await store_user_credentials(db, user, creds, tenant_id=data["tenant_id"])
```

Token store upsert (inside `store_user_credentials`, when `tenant_id` given):

```python
tok = (await db.execute(select(CustomerGoogleToken).where(
    CustomerGoogleToken.tenant_id == tenant_id,
    CustomerGoogleToken.user_wa_phone == user.wa_phone))).scalar_one_or_none()
if tok is None:
    tok = CustomerGoogleToken(tenant_id=tenant_id, user_wa_phone=user.wa_phone); db.add(tok)
tok.access_token_enc = encrypt_token(creds.token)          # Fernet
tok.refresh_token_enc = encrypt_token(creds.refresh_token) if creds.refresh_token else None
tok.token_expiry = creds.expiry.replace(tzinfo=timezone.utc) if creds.expiry else None
tok.scopes = " ".join(creds.scopes) if creds.scopes else None
await db.commit()
if tenant_id in (None, 1):   # GATE legacy global-token sync to default tenant ONLY
    sync_credentials_to_hermes(creds)
```

## 7. Permission cascade `decide()`

```python
async def decide(self, db, sender_phone, message_text, tenant_id=None, is_group=False) -> dict:
    phone = (sender_phone or "").lstrip("+")           # normalize!
    user = (await db.execute(select(User).where(User.wa_phone == phone))).scalar_one_or_none()
    if user is None:
        user = User(wa_phone=phone, tenant_id=tenant_id, has_permission=False)
        db.add(user); await db.commit(); await db.refresh(user)
    if user.is_owner or user.has_permission:
        return {"action": "run", "needs_owner_approval": False, "decision": None, "user": user}
    decision = await self.request_permission(db, user, action_type="message_task",
        proposed_action={"text": message_text[:300], "is_group": is_group}, source_chat=phone)
    return {"action": "hold", "needs_owner_approval": True, "decision": decision, "user": user}
```

Wire into the chat worker AFTER `_get_or_create_user`, BEFORE any engine dispatch. On
`hold`: reply `🔒 Your request was forwarded to the owner for approval (ref: {CODE}).`
Owner resolves by replying `<CODE> yes|no` (existing short-code resolver).

## 8. Test house pattern

- conftest: rewrite host `postgres`→`localhost`, append `_test` to DB name, auto-create DB,
  generate Fernet key if unset; `test_engine` fixture drop+create ALL tables.
- Route tests: `AsyncClient(transport=ASGITransport(app=app), base_url="http://test")`,
  `follow_redirects=False`; read the `set-cookie` list to grab the session cookie.
- Mock ONLY external sends (`whatsapp_service.send_text`) with `AsyncMock`; keep DB/Redis real.
- Isolation proof test: run tenant A's OAuth store flow, assert tenant B has NO token row.
- Cascade loop test: stranger → hold → `try_resolve(db, f"{code} yes")` → status approved.
- PITFALL: seed/lookup phone strings must match exactly after normalization — a digit typo
  fails silently as "stranger held".

## 9. Slim compose (11 → 5)

Keep postgres, redis, hermes/gateway, backend, tunnel. Drop litellm / mcp-server /
Evolution-API / whisper / kokoro when the engine natively covers them. Remove the obsolete
top-level `version:` key from compose files.
