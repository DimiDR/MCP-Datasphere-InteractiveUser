# 8 Tasks, Replication Flows, and Job Status

Separation:

| Command | Purpose |
|---|---|
| `objects task-chains` / `objects replication-flows` | **Definition** CRUD |
| `tasks …` | **Execution**/control, logs, consent |
| `job-status` | Status of generic/asynchronous jobs (e.g. space deploy) |

Roles: typically integrator/modeler with data integration permissions.  
Flags: [Appendix A](../appendices/A-command-reference.md).

---

## 8.1 Consent

```bash
datasphere tasks consent get      # GIVEN | EXPIRED (+ data)
datasphere tasks consent give
datasphere tasks consent revoke
```

Verbose response codes per guide: give `201`/`400`/`500`, revoke `200`/`404`/`500`.

---

## 8.2 Task Chains

```bash
datasphere tasks chains run …       # see --help for space/object/parameters
datasphere tasks chains cancel …
datasphere tasks chains retry …
```

Input parameters typically as JSON string, e.g. `'{"CATEGORY":"A","FISCAL_YEAR":"2025"}'`.

Chain **definitions** → [Appendix E.7](../appendices/E-object-definition-formats.md#e7-task-chains) (root key `taskchains`, not `definitions`).

> **`403 Forbidden` with an empty body on `chains run`** = missing privilege, not a bad payload.
> Running data integration tasks needs the space-scoped privilege
> `Data Warehouse Data Integration (--U-----)`, granted by a **scoped** role
> (e.g. `Scoped_Data_Warehouse_Cloud_Integrator`) whose scope includes the space.
> A *global* DW Administrator role is **not** sufficient. Check with
> `scoped-roles list` — `userAssignedCount: 0` on every role means nobody can run tasks:
>
> ```bash
> # scopes first -- users can only be added to spaces the role already covers
> datasphere scoped-roles scopes add --role Scoped_Data_Warehouse_Cloud_Integrator --scopes <SPACE>
> datasphere scoped-roles users  add --role Scoped_Data_Warehouse_Cloud_Integrator \
>   --input '[{"id":"<USER>","scopes":["<SPACE>"]}]'
> ```
>
> Verify with `scoped-roles scopes read` / `scoped-roles users read` (subcommand is
> `read`, **not** `list`). Assigning them needs `User (-------M)` and `Spaces (-------M)`,
> i.e. a global DW Administrator role.
>
> Consent is a separate prerequisite (8.1) and does not replace the privilege.

---

## 8.3 Logs

```bash
datasphere tasks logs list --space <ID> …
datasphere tasks logs get --space <ID> --log-id <ID> …
datasphere tasks logs get-extended --space <ID> --log-id <ID> …
```

`get-extended` controls format via Accept/info level (status vs. details vs. extended) – see `--help` and PDF Ch. 5.2.

---

## 8.4 Controlling Replication Flows

```bash
datasphere tasks replication-flows run …
datasphere tasks replication-flows status …
datasphere tasks replication-flows stop …
datasphere tasks replication-flows pause | resume …
datasphere tasks replication-flows pause-object | resume-object …
datasphere tasks replication-flows restart-object …
```

These control commands are only partially documented in PDF 2026.02 – live CLI 2026.14 is authoritative.

---

## 8.5 Job Status *(new vs. PDF)*

After asynchronous operations (e.g. `spaces create` without `--no-async`):

```bash
datasphere job-status get --job-id <ID>
```

---

## 8.6 Workflow

1. `tasks consent get` – `give` if needed  
2. Deploy chain/flow (`objects …`)  
3. `tasks chains run` or `tasks replication-flows run`  
4. Monitor with `tasks logs list/get`  
5. For space deploy jobs: `job-status get`
