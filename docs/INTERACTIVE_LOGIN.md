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

Tokens are stored in `.token.json` (gitignored). Access tokens are short-lived; refresh tokens are used automatically when present.
