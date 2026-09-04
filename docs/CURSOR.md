# Register in Cursor

## This MCP (Interactive Usage)

Point Cursor at this project's built server:

```json
"sap-datasphere-interactive": {
  "disabled": false,
  "timeout": 120,
  "type": "stdio",
  "command": "node",
  "args": [
    "C:\\Users\\rybak\\Downloads\\Apps\\MCP-Datasphere-InteractiveUser\\dist\\index.js"
  ],
  "cwd": "C:\\Users\\rybak\\Downloads\\Apps\\MCP-Datasphere-InteractiveUser"
}
```

Secrets stay in the project's `.env` (loaded from `cwd`). Reload MCP after build or env changes.

## Sibling: Python technical-user MCP

You can keep the existing `sap-datasphere` (client_credentials) server registered alongside this one. Same demo tenant host is fine; **different OAuth clients** (Technical User vs Interactive Usage).

## Adesso demo tenant (host names only)

- Tenant: `https://adesso-sap-dna-dsp-demo.eu20.hcs.cloud.sap`
- Auth host: `https://adesso-sap-dna-dsp-demo.authentication.eu20.hana.ondemand.com`
- Typical test space: `DIMITRITEST`

Put Interactive Usage client id/secret into **this** project's `.env` (`DSP_OAUTH_*`). Do not paste Technical User credentials here.

## After reload

1. `login_interactive` — complete browser SSO once.
2. `datasphere_cli_status` then `datasphere_cli_run` with `["spaces","list"]`.
3. Query rows with `query_*` tools — not the CLI.

Do not run `datasphere login` at the same time (shared `localhost:8080` callback).
