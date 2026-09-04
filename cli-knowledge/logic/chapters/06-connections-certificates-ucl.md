# 6 Connections, Certificates, and UCL

Three areas:

| Area | Command | Purpose |
|---|---|---|
| Space connections | `datasphere spaces connections` | Connections in the space |
| TLS certificates | `datasphere configuration certificates` | Server certificates tenant-wide |
| UCL shared | `datasphere configuration system-connections` | Authorize shared connections |

JSON per connection type: [Appendix C](../appendices/C-connection-definition-formats.md).  
Flags: [Appendix A](../appendices/A-command-reference.md).

---

## 6.1 Space Connections

Roles: typically **DW Integrator** (list/read/validate/delete; create/edit depending on type, e.g. SuccessFactors per guide).

```bash
datasphere spaces connections list --space <ID>
datasphere spaces connections list --space <ID> --details
datasphere spaces connections list --space <ID> --top 50 --skip 0

datasphere spaces connections get --space <ID> --name <CONN_NAME>

datasphere spaces connections create --space <ID> --file-path ./conn.json
datasphere spaces connections edit --space <ID> …
datasphere spaces connections validate --space <ID> --name <CONN_NAME>
datasphere spaces connections delete --space <ID> --name <CONN_NAME>
```

### list Options (Excerpt)

| Option | Meaning |
|---|---|
| `--accept` | Media type list/details JSON |
| `--details` / `--name` / `--features` | Output variants |
| `--top` / `--skip` | Paging (default top=10) |

Supported types and JSON schemas: [Appendix C](../appendices/C-connection-definition-formats.md) (Amazon Athena/S3/Redshift, Kafka, Confluent, JDBC, OData, SFTP, BigQuery, GCS, HDFS, Azure, MSSQL, Oracle, SAP ABAP/BW/ECC/HANA/S4/SuccessFactors, …).

---

## 6.2 TLS Certificates

```bash
datasphere configuration certificates list
datasphere configuration certificates upload --description "SF cert" --file-path ./sf.pem
datasphere configuration certificates delete …
```

See [Chapter 3](03-local-cli-and-tenant-config.md).

---

## 6.3 UCL System Connections

```bash
datasphere configuration system-connections list
datasphere configuration system-connections authorize \
  --technical-name MY_UCL_CONN \
  --spaces CONSUMER_SPACE1,CONSUMER_SPACE2
```

After that, catalog install with the same connection is possible ([Chapter 10](10-catalog.md)).

---

## 6.4 Workflow “New Source Connection”

1. Upload TLS certificate if needed  
2. Build JSON per Appendix C for the type (auth: Basic, OAuth2, X.509, Kerberos, Cloud Connector, …)  
3. `spaces connections create`  
4. `spaces connections validate`  
5. Create remote tables / flows via `objects` ([Chapter 7](07-modeling-objects.md))
