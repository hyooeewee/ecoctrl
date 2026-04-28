# Authentication

EcoCtrl uses short-lived JWT access tokens combined with rotating refresh tokens. Optional OAuth providers (WeChat, Feishu) issue identical tokens after a third-party identity hand-off.

## Token model

| Token   | Lifetime   | Stored in                             | Issued by                                   |
| ------- | ---------- | ------------------------------------- | ------------------------------------------- |
| Access  | 15 minutes | Memory (admin) / `localStorage` (web) | `fastify.jwt.sign({ userId, username })`    |
| Refresh | 7 days     | `refresh_tokens` table (sha256 hash)  | `crypto.randomBytes(32).toString("base64")` |

The access token carries `{ userId, username }` and is verified by Fastify's `request.jwtVerify()` in the global `onRequest` hook on every protected route. The refresh token is opaque — only its sha256 hash hits the database, so a database leak does not yield usable tokens.

## Login flow

```
POST /api/auth/login { username, password }
        │
        ▼
  bcrypt.compare(password, user.password)
        │
        ▼
  delete refresh_tokens where userId = ...
  insert refresh_tokens (userId, sha256(newRefresh), now+7d)
        │
        ▼
  200 { accessToken, refreshToken, user }
```

The deletion-then-insert step means a successful login on a new device kicks any previous device off. This is intentional. Multi-device support is not currently exposed; if you need it, drop the `deleteRefreshTokensByUserId` call inside `routes/auth.ts`.

## Refresh flow

The frontend automatically refreshes when the access token expires. The endpoint returns **a new pair**:

```
POST /api/auth/refresh { refreshToken }
        │
        ▼
  hash = sha256(refreshToken)
  row  = SELECT * FROM refresh_tokens WHERE tokenHash = hash AND expiresAt > now
        │
        ▼
  delete that row              (old refresh token is invalidated immediately)
  insert new row with new hash (expiresAt = now + 7d)
        │
        ▼
  200 { accessToken, refreshToken }
```

This is _rotating refresh_: the previous refresh token cannot be reused. If a refresh request comes in with a hash that no longer exists, the response is `401` and the client must re-authenticate.

## Registration flow

Email verification is enforced before the account is created.

```
POST /auth/register/send-code { email }
        │  (server stores { code, expiresAt: now+5min, purpose: "register" } in memory)
        ▼
        smtp send 6-digit code

POST /auth/register { username, email, password, code }
        │
        ▼
  validate code (single use, 5 min)
  bcrypt.hash(password, 10)
  insert users
  delete refresh_tokens where userId = newUser.id
  insert new refresh_tokens row
        │
        ▼
  201 { accessToken, refreshToken, user }
```

The default role is the lowest entry of `USER_ROLE_LIST` (currently `viewer`). Promote a user from the admin dashboard's user management page.

## Password reset flow

Identical shape to registration:

1. `POST /auth/forgot-password/send-code` — server stores a 5-minute code with `purpose: "reset"`.
2. `POST /auth/forgot-password/reset { email, code, newPassword }` — verifies the code, hashes the new password, replaces it in `users`.

Existing access tokens remain valid until they expire, but no new ones can be issued without the new password. If you need to invalidate them right away, also delete the user's refresh tokens; the next refresh attempt will fail.

## OAuth flow (WeChat / Feishu)

Configure provider credentials in `packages/server/.env.local`:

```bash
WECHAT_APPID=...
WECHAT_SECRET=...
FEISHU_APPID=...
FEISHU_SECRET=...
```

Configured providers appear in `GET /api/auth/oauth/providers`; the admin UI uses that response to render OAuth buttons.

```
1. Browser → GET /api/auth/oauth/<provider>/authorize
              ← provider redirect URL
2. Browser → opens popup at provider's authorize page
3. Provider → callback URL → GET /api/auth/oauth/<provider>/callback
              server exchanges code for provider tokens, fetches user info
4. Two outcomes:
   a) An oauth_accounts row already links to a users row
      → server signs an EcoCtrl JWT pair and the popup posts it to the opener
   b) No link exists
      → frontend prompts the user to bind: POST /auth/oauth/bind
        (or /auth/oauth/register-and-bind if no EcoCtrl account yet)
```

Once linked, the user can log in either with username/password or via OAuth — both yield the same `users` row.

## Token storage on the client

| App          | Access token                                 | Refresh token                                 |
| ------------ | -------------------------------------------- | --------------------------------------------- |
| `apps/web`   | `localStorage`                               | `localStorage`                                |
| `apps/admin` | `localStorage`                               | `localStorage`                                |
| Swagger UI   | `localStorage` (`swagger_auto_access_token`) | `localStorage` (`swagger_auto_refresh_token`) |

The frontends share an Axios-like client (`apps/admin/src/api/request.ts`, `apps/web/app/lib/api.ts`) that:

1. Adds `Authorization: Bearer <accessToken>` to every request.
2. Catches `401`, calls `/auth/refresh` once, retries the original request with the new token.
3. On a refresh failure, clears storage and redirects to the login screen.

## Public routes

Refer to [API Routes — Public routes](/reference/api#public-routes-no-token) for the exact list. The hook in `routes/index.ts` checks `request.url.startsWith(p)` against an explicit allow-list, so any new public endpoint must be added to that list.

## Operational tips

- **Rotating `JWT_SECRET`**: invalidates every issued access token. Refresh tokens still work, so users can mint a new access token without a fresh login. Combine with a refresh-token wipe (`TRUNCATE refresh_tokens`) for a hard logout-everyone.
- **Session length**: increase access-token lifetime by editing `expiresIn: "15m"` in `packages/server/index.ts`. Increase refresh-token lifetime by editing the `7 * 24 * 60 * 60 * 1000` constant in `routes/auth.ts`.
- **Audit who is signed in**: `SELECT userId, COUNT(*) FROM refresh_tokens GROUP BY userId` shows live sessions (currently always 0 or 1 per user).
