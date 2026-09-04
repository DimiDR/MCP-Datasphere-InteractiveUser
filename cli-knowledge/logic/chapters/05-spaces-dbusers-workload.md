# 5 Spaces, Database Users, and Workload

> File spaces **cannot** be managed via the CLI.

Roles: DW Administrator (create/delete/quota) or DW Space Administrator (properties, members, DB users).  
Space JSON schema: [Appendix B](../appendices/B-space-definition-format.md).  
Flags: [Appendix A](../appendices/A-command-reference.md).  
Details: [Appendix B](../appendices/B-space-definition-format.md).

---

## 5.1 List / Read Spaces

```bash
datasphere spaces list

datasphere spaces read --space <SPACE_ID>
datasphere spaces read --space <SPACE_ID> --definitions
datasphere spaces read --space <SPACE_ID> --definitions T1,V1 --no-space-definition
datasphere spaces read --space <SPACE_ID> --connections
```

| Option | Meaning |
|---|---|
| `--space` | Space ID |
| `--definitions [list]` | Object definitions (CSN); without list = all exportable |
| `--no-space-definition` | without `spaceDefinition` block |
| `--connections` | include connections |

Exportable object types via space read (guide): local/remote tables, views, data access controls (with restrictions on remote table age).

---

## 5.2 Create / Update / Save Space

Definition file max. **25 MB**, `spaceDefinition.version` = **`1.0.4`** (see Appendix B).

### create (Create-or-Update + Deploy)

```bash
datasphere spaces create --file-path ./MY_SPACE.json
datasphere spaces create --input '{"MY_SPACE":{"spaceDefinition":{"version":"1.0.4",…}}}'
```

Important options (2026.14):

| Option | Meaning |
|---|---|
| `--file-path` / `--input` | Definition |
| `--force-definition-deployment` | Force redeploy definitions |
| `--no-async` | deploy synchronously |
| `--enforce-database-user-deletion` | allow DB user deletion |

Asynchronous jobs: note job ID → [Chapter 8](08-tasks-job-status.md) `job-status get`.

### save *(new vs. PDF)*

Save only (without full create/deploy behavior):

```bash
datasphere spaces save --file-path ./MY_SPACE.json [--force-save]
```

---

## 5.3 Delete Space

```bash
datasphere spaces delete --space <SPACE_ID> [--force]
```

> Irreversible including content and data.

---

## 5.4 Space Users — `spaces users`

```bash
datasphere spaces users read --space <ID>
datasphere spaces users add --space <ID> --file-path ./members.json
datasphere spaces users update --space <ID> --file-path ./members.json
datasphere spaces users remove --space <ID> …
```

Memberships and roles in the space: PDF ch. 4.2.

---

## 5.5 Database Users — `dbusers`

```bash
datasphere dbusers list --space <ID>
datasphere dbusers create --space <ID> --file-path ./dbuser.json
datasphere dbusers update --space <ID> …
datasphere dbusers delete --space <ID> --databaseuser <NAME>
datasphere dbusers password reset --space <ID> --databaseuser <NAME>
datasphere dbusers certificate …
```

Open SQL / HDI-related properties also belong in the space definition (Appendix B).

---

## 5.6 Workload — `workload`

Priorities and statement limits for spaces/groups:

```bash
datasphere workload list
datasphere workload update --file-path ./workload.json
```

File format and switching space↔group: PDF ch. 4.5 / Appendix B (workload section in the spaces source file).

---

## 5.7 Typical Workflow

1. Write space JSON per Appendix B  
2. `spaces create --file-path …`  
3. If async: `job-status get`  
4. Members: `spaces users add`  
5. Optionally DB users / workload / connections ([Chapter 6](06-connections-certificates-ucl.md))
