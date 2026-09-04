# 4 Users and Roles

Prerequisite: installation + login ([Chapter 2](02-installation-and-authentication.md)).  
Flags: [Appendix A](../appendices/A-command-reference.md).  
Further details and examples in this chapter as well as [Appendix A](../appendices/A-command-reference.md).

---

## 4.1 Global Roles — `datasphere global-roles`

**Can:** list, assign/remove users.  
**Cannot:** create or delete global roles (UI/other processes only).

Typical permissions: *DW Administrator* (`Role` CRUD, `User` M, …).

```bash
datasphere global-roles list

datasphere global-roles users list --role <ROLE_ID>
datasphere global-roles users add …      # see --help / Appendix A
datasphere global-roles users remove …
```

---

## 4.2 Application Scope Roles — `datasphere scoped-roles`

Full CRUD including scopes (space assignment) and user assignment.

```bash
datasphere scoped-roles list
datasphere scoped-roles create --file-path ./role.json
datasphere scoped-roles read …
datasphere scoped-roles update …
datasphere scoped-roles delete …

datasphere scoped-roles scopes …
datasphere scoped-roles users …
```

Role definitions as JSON (fields/permissions): PDF chapter 3.2 in the file above.

---

## 4.3 Users — `datasphere users`

```bash
datasphere users list [--accept <media-type>]
datasphere users create --file-path ./user.json
datasphere users update --file-path ./user.json
datasphere users delete …
```

`list --accept` controls list vs. detail JSON (media types per `--help`).

User definition format and required fields: PDF ch. 3.3.

---

## 4.4 Data Access Control privileges

Creating a DAC in the Data Builder needs privilege
**Data Warehouse Data Access Control** (Create/Update/Delete). It is included in
the **DW Space Administrator** role template (and thus in
`Scoped_Data_Warehouse_Cloud_Space_Administrator`), **not** in DW Modeler.

| Check | Command |
|---|---|
| Global + listed profile roles on a user | `datasphere users list --accept application/vnd.sap.datasphere.space.users.details+json` |
| Roles of a user **in a space** | `datasphere spaces users read --space <ID> --accept application/vnd.sap.datasphere.space.users.details+json` |
| Who has scoped Space Admin + which scopes | `datasphere scoped-roles users read --role Scoped_Data_Warehouse_Cloud_Space_Administrator` |
| Spaces attached to that scoped role | `datasphere scoped-roles scopes read --role Scoped_Data_Warehouse_Cloud_Space_Administrator` |

If Create → Data Access Control is greyed out **despite** Space Admin on that
space, the cause is not missing roles (UI/session/context). Object CSN → [E.8](../appendices/E-object-definition-formats.md#e8-data-access-controls).

## 4.5 Typical Workflow

1. `users create` with JSON  
2. `scoped-roles create` + scopes on spaces  
3. `scoped-roles users add` or `spaces users add`  
4. Optionally `global-roles users add` for tenant-wide admin rights  
5. For DAC create: ensure scoped (or global) **Space Administrator** on the target space
