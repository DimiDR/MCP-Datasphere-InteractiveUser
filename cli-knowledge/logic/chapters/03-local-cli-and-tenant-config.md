# 3 Local CLI Config and Tenant Configuration

Two namespaces — do not confuse them:

| Command | Level | Examples |
|---|---|---|
| `datasphere config …` | Local on the machine | Host, secrets, cache, passcode URL |
| `datasphere configuration …` | Tenant / backend | TLS certificates, UCL system connections |

Full flags: [Appendix A](../appendices/A-command-reference.md).

---

## 3.1 `datasphere config` — Local CLI

```
datasphere config
  cache          # service document / command cache
  host           # default tenant URL
  passcode-url   # show passcode URL
  secrets        # stored OAuth secrets
```

### Cache (Service Document)

Tenant-specific commands come from a service document. With OAuth often implicit; with passcode or outdated cache:

```bash
datasphere config cache init
datasphere config cache clean
```

Warning:

```text
Your local CLI cache is outdated. Run 'datasphere config cache init' to update
```

### Host

```bash
datasphere config host set https://my-tenant.eu20.hcs.cloud.sap
datasphere config host show
datasphere config host clean
```

### Secrets

```bash
datasphere config secrets show
datasphere config secrets check --secrets-file ./secrets.json
```

---

## 3.2 `datasphere configuration` — Tenant

### TLS Server Certificates

Role: typically **DW Administrator** (permission *System Information*).

```bash
datasphere configuration certificates list
datasphere configuration certificates upload --description "…" --file-path ./cert.pem
datasphere configuration certificates delete …
```

Supported upload extensions per guide: `.pem`, `.crt`, `.cer`.  
Details: [Appendix C](../appendices/C-connection-definition-formats.md) or the Certificates section there.

### UCL System Connections *(new vs. PDF 2026.02)*

Unified Connectivity Layer — list shared connections and authorize them for consumption spaces:

```bash
datasphere configuration system-connections list

datasphere configuration system-connections authorize \
  --technical-name MY_CONNECTION \
  --spaces SPACE_A,SPACE_B
```

| Option | Meaning |
|---|---|
| `--technical-name` | Technical name of the UCL connection |
| `--spaces` | Comma-separated consumer spaces |

Relation to catalog installation: [Chapter 10](10-catalog.md) (`--system-connection`).

---

## 3.3 Generic Options (Excerpt)

Often available even when not shown in every `--help` output:

| Option | Purpose |
|---|---|
| `-H, --host` | Tenant URL |
| `-V, --verbose` | Verbose logs |
| `-O, --options-file` | Options JSON |
| `-s, --secrets-file` | Secrets JSON |
| `-p, --passcode` | Passcode auth |
| `-t, --tls-version` | TLSv1.2 / TLSv1.3 |
| OAuth fields | client-id/secret, tokens, URLs |

See [Chapter 2](02-installation-and-authentication.md) and Appendix A.
