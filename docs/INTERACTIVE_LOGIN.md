# Interactive Usage login

Generic notes for OAuth Authorization Code login against SAP Datasphere.

## OAuth client setup

In **System → Administration → App Integration**, create an OAuth client with:

| Field | Value |
|-------|--------|
| Purpose | Interactive Usage |
| Authorization grant | Authorization Code |
| Redirect URI | Must match `DSP_OAUTH_REDIRECT_URI` exactly |

Copy **Client ID**, **Client Secret**, **Authorization URL**, and **Token URL** into `.env`.

## Flow

1. MCP or `npm run login` starts a localhost callback server.
2. Browser opens the authorize URL.
3. User completes IdP / SSO login.
4. Redirect to `DSP_OAUTH_REDIRECT_URI` with `?code=…`.
5. Server exchanges code for tokens; stores `.token.json`.

## Common issues

| Symptom | Check |
|---------|--------|
| HTTP 400 on authorize | Redirect URI mismatch; avoid unsupported `prompt=login` |
| Wrong account / tenant | Use private/incognito browser if another SSO session is cached |
| `client_id` with `\|` | Must be URL-encoded in manual links (`%7C`) |
| API 401 | Token expired — run `login_interactive` or rely on refresh token |
| Analytical 500 on `$top` only | Model may require input parameters — use `get_analytical_model` then `query_analytical_model` with `parameters` |
| Wrong host | `DSP_TENANT_URL` must be `*.hcs.cloud.sap`, not `*.authentication.*` |

## API headers

Consumption requests should include:

- `Authorization: Bearer <access_token>`
- `Accept: application/json` (or `application/xml` for `$metadata`)
- `Accept-Language: en` (recommended)

## Token storage

### Import existing tokens

Set `DSP_ACCESS_TOKEN` and optionally `DSP_REFRESH_TOKEN` in `.env`, then restart
the MCP. The access token must belong to the configured tenant; the refresh token
must belong to the configured OAuth client. No browser callback is needed for
token import or refresh.

On first use, changed environment tokens replace `.token.json`. A hash identifies
the imported pair so subsequent restarts retain refreshed tokens rather than
re-importing an old, possibly rotated refresh token. Remove environment tokens
when switching back to browser login. Logout suppresses re-import for the current
process; restarting with environment tokens still configured can import them again.

JWT expiry is read from `exp` with a 60-second safety margin; this is not signature
validation. For opaque tokens, set `DSP_ACCESS_TOKEN_EXPIRES_AT` to an ISO date-time.
Unknown expiry is treated as expired and requires a refresh token. Tokens and
`.token.json` are secrets and must not be committed or shared.

Tokens are stored in `.token.json` (gitignored). Access tokens are short-lived; refresh tokens are used automatically when present.
