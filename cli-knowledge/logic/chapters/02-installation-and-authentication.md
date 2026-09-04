# 2 Installation and Authentication

> **With this Interactive Usage MCP:** prefer `login_interactive` (stores `.token.json`). Then `datasphere_cli_status` / `datasphere_cli_run` reuse that token — do **not** also run `datasphere login` on port 8080. The rest of this chapter still documents standalone CLI OAuth for terminals outside the MCP.

## 2.1 Prerequisites

From `package.json` of **@sap/datasphere-cli@2026.14.0**:

| Component | Supported Versions |
|---|---|
| Node.js | `^20 \|\| ^21 \|\| ^22 \|\| ^23 \|\| ^24` |
| npm | `^9 \|\| ^10 \|\| ^11` |

```bash
node -v
npm -v
```

> The PDF guide 2026.02 still lists Node 20–22 and npm 8–10 — that is **outdated**.

## 2.2 Installation and Update

```bash
npm install -g @sap/datasphere-cli
datasphere --version
```

Update to latest:

```bash
npm install -g @sap/datasphere-cli@latest
```

Yarn:

```bash
yarn global add @sap/datasphere-cli
```

## 2.3 Set Host

After login (since 2026.10), the CLI often saves the host automatically. Manual setup:

```bash
datasphere config host set https://<tenant>.<region>.hcs.cloud.sap
datasphere config host show
datasphere config host clean
```

With the host set, `--host` is omitted on subsequent commands.

## 2.4 Create OAuth Client (Tenant)

In SAP Datasphere: **Administration → App Integration**.

| Purpose | Flow | Use |
|---|---|---|
| **Interactive Usage** | `authorization_code` | Recommended for CLI login (browser) |
| **Technical User** | `client_credentials` | MCP server (and limited CLI automation) |

Redirect URI for Interactive: `http://localhost:8080/callback` (port: env `CLI_HTTP_PORT`; path must match the registered URI).

Example Interactive Usage client (CLI):

![Edit OAuth Client — Interactive Usage for CLI](../../../../DataphereCLI/docs/Datasphere%20Admin%20-%20Interactive%20Usage.png)

MCP Technical User client setup (screenshot + `.env` mapping): [`sap-datasphere-mcp/docs/OAUTH_SETUP.md`](../../../../sap-datasphere-mcp/docs/OAUTH_SETUP.md) and [`TENANT_CONFIG.md`](../../../../sap-datasphere-mcp/docs/TENANT_CONFIG.md).

## 2.5 Sign-In — Recommended Approach (Options File)

```bash
datasphere login --options-file ds-options.json --force
```

`--force` (since 2026.6): overwrites existing secrets without prompt — important for scripts.

### Options File

Field names with **hyphens** (not underscores as in some UI exports):

```json
{
  "client-id": "<client_id>",
  "client-secret": "<client_secret>",
  "authorization-url": "<auth_url>",
  "token-url": "<token_url>",
  "host": "https://<tenant>.<region>.hcs.cloud.sap",
  "browser": "chrome",
  "authorization-flow": "authorization_code"
}
```

**Important:** Set `authorization-flow` **explicitly**. If the field is missing, the CLI may attempt a token refresh instead of the browser flow — even though `authorization_code` is the default according to help.

### Interactive Usage Flow

1. CLI opens browser (`--browser`: `browser`|`chrome`|`brave`|`firefox`|`edge`).
2. User signs in to Datasphere.
3. Redirect to `localhost` → CLI exchanges code for tokens.
4. Time window typically ~30 seconds — otherwise timeout.
5. Success: exit 0, often with no text output. Tokens under `%USERPROFILE%\.@sap\datasphere-cli\.cache\`.

### Sign-In via CLI Flags

```bash
datasphere login \
  --client-id "<id>" \
  --client-secret "<secret>" \
  --authorization-url "<url>" \
  --token-url "<url>" \
  --host "<url>" \
  --browser chrome \
  --authorization-flow authorization_code \
  --force
```

On macOS, URI-encode ID/secret if needed.

### Login Options (2026.14)

| Option | Meaning |
|---|---|
| `-H, --host` | Tenant URL |
| `-A, --authorization-url` / `-T, --token-url` | OAuth endpoints |
| `-c, --client-id` / `-C, --client-secret` | Client |
| `-a, --access-token` / `-r, --refresh-token` / `-b, --code` | Tokens/code |
| `-s, --secrets-file` | Existing secrets (not first login with client data only) |
| `-B, --browser` | Browser choice |
| `-d, --authorization-flow` | `authorization_code` \| `client_credentials` |
| `-t, --tls-version` | `TLSv1.3` (default) \| `TLSv1.2` |
| `-F, --force` | Overwrite secrets without prompt |

## 2.6 Secrets File (Login-Free Follow-Up Commands)

After successful login:

```bash
datasphere config secrets show
```

Save tokens in `secrets.json` and use e.g.:

```bash
datasphere spaces list --secrets-file secrets.json
```

Minimum content per npm README: either `access_token` **or** (`refresh_token` + `client_id` + `client_secret`), and `tenantUrl` **or** (`authorization_url` + `token_url`).

Check consistency:

```bash
datasphere config secrets check --secrets-file secrets.json
```

> `--secrets-file` ≠ `--options-file`: secrets for existing tokens; options for client credentials on **first** login.

## 2.7 Multiple Tenants

Per tenant, separate login (with respective host) or switch host and verify secrets. Sign out:

```bash
datasphere logout
```

## 2.8 Passcodes (Legacy)

Not recommended; prefer OAuth.

```bash
datasphere config passcode-url --host https://<tenant>/
datasphere config cache init --host https://<tenant>/ --passcode <code>
```

## 2.9 TLS

- Default since 2026.2: **TLS 1.3**, automatic fallback to 1.2
- Override: `--tls-version TLSv1.2`
- Env `CLI_LEGACY_TLS_DETECTION=true`: no TLS enforcement (Node decides)

## 2.10 Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `CLI_HTTP_PORT` | OAuth callback port | `8080` |
| `LOG_LEVEL` | 1 Inactive … 6 Trace | `1` |
| `CLI_LEGACY_TLS_DETECTION` | Disable TLS enforcement | unset |
| Option long names | e.g. `HOST`, `CLIENT_ID` | — |

PowerShell debug:

```powershell
$Env:LOG_LEVEL = 6
datasphere login --options-file ds-options.json --force
```

## 2.11 Verify Login

```bash
datasphere spaces list
datasphere config secrets show
```

Next: [Chapter 3](03-local-cli-and-tenant-config.md) · Practice: [`README.md`](../../../../README.md).
