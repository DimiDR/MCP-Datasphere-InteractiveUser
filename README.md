# SAP Datasphere Interactive User MCP

MCP server for **SAP Datasphere Interactive Usage** OAuth (Authorization Code) and **consumption OData** APIs: catalog discovery, analytical models, and relational entities.

All tenant-specific values come from `.env`. No customer names or asset IDs are hardcoded in the server.

## Requirements

- Node.js 20+
- Datasphere OAuth client with **Purpose = Interactive Usage**
- Redirect URI matching `DSP_OAUTH_REDIRECT_URI` (default `http://localhost:8080/callback`)
- Port for the OAuth callback available when logging in

## Setup

```powershell
copy .env.example .env
# Fill OAuth client id/secret and tenant URLs in .env
npm install
npm run build
```

Optional CLI login (writes `.token.json`):

```powershell
npm run login
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DSP_OAUTH_CLIENT_ID` | yes | OAuth client ID |
| `DSP_OAUTH_CLIENT_SECRET` | yes | OAuth client secret |
| `DSP_OAUTH_AUTHORIZE_URL` | yes | Authorization endpoint from App Integration |
| `DSP_OAUTH_TOKEN_URL` | yes | Token endpoint from App Integration |
| `DSP_OAUTH_REDIRECT_URI` | no | Default `http://localhost:8080/callback` |
| `DSP_TENANT_URL` | yes | Tenant host `https://<uuid>.<region>.hcs.cloud.sap` |
| `DSP_TENANT_ID` | no | Optional tenant / subaccount GUID |
| `DSP_SPACE_ID` | no | Default space for tools when `space_id` omitted |
| `DSP_ASSET_ID` | no | Default analytical asset when `asset_id` omitted |

## Register in Cursor / Cline

```json
{
  "mcpServers": {
    "sap-datasphere-interactive": {
      "command": "node",
      "args": ["C:\\path\\to\\DatasphereInteractiveUserTest\\dist\\index.js"],
      "cwd": "C:\\path\\to\\DatasphereInteractiveUserTest"
    }
  }
}
```

The server loads `.env` from `cwd`. Reload MCP after changes.

## Typical workflow (no custom scripts)

1. `login_interactive` — browser login, token stored locally
2. `test_connection` — verify catalog access
3. `search_catalog` or `get_space_assets` — find models
4. `get_analytical_model` — dimensions, measures, **input parameters**
5. `query_analytical_model` — pass `parameters` or OData `$filter` / `$apply`

### Parameterized analytical model

```json
{
  "space_id": "<from catalog>",
  "asset_id": "<from catalog>",
  "parameters": { "CALYEAR": "2024", "PURCH_ORG": "4000" },
  "filter": "PLANT eq '0011'",
  "select": "PLANT,NETPRICE,NETPRICE_C"
}
```

The server builds the parameterized entity path from `$metadata` — no manual OData path required.

### Relational asset

1. `list_relational_entities`
2. `query_relational_entity` with `entity_name`, optional `$filter` / `$select`

## Tools

| Tool | Purpose |
|------|---------|
| `auth_status` | Token + .env defaults |
| `login_interactive` / `logout` | OAuth session |
| `test_connection` | Health check |
| `get_current_user` | JWT identity |
| `list_spaces`, `get_space_info` | Catalog spaces |
| `get_space_assets`, `list_catalog_assets`, `get_asset_details`, `search_catalog` | Asset discovery |
| `get_analytical_model`, `get_analytical_service` | Analytical metadata |
| `query_analytical_model` | Analytical data |
| `list_relational_entities`, `query_relational_entity` | Relational data |

## Security

`.env` and `.token.json` are gitignored. Do not commit secrets.

## Login notes

See [docs/INTERACTIVE_LOGIN.md](docs/INTERACTIVE_LOGIN.md) for IdP and OAuth troubleshooting.
