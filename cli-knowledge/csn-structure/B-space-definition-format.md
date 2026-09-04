# Appendix B – Space Definition Format and Workload

Adapted from the SAP guide (PDF 2026.02, Ch. 4.4–4.5), integrated into the overall documentation.
Commands to apply: `datasphere spaces create|save|read`, `datasphere workload …` — see [Chapter 5](../chapters/05-spaces-dbusers-workload.md) and [Appendix A](A-command-reference.md).


> `spaceDefinition.version` must be `1.0.4`. Maximum file size 25 MB. File spaces are not supported via the CLI.

---
## 4.4 The Space Definition File Format

Space properties are set and retrieved in the space definition file format and saved as a `.json` file. A space definition file must not exceed **25 MB**.

### Space Properties

Users with the *DW Administrator* role can create spaces and set any space properties using the following syntax:

```json
{
  "<SPACE_ID>": {
    "spaceDefinition": {
      "version": "1.0.4",
      "label": "<Space_Name>",
      "assignedStorage": <bytes>,
      "assignedRam": <bytes>,
      "longDescription": "<Space_Description>",
      "priority": <value>,
      "injection": {
        "dppRead": {
          "retentionPeriod": <days>,
          "isAuditPolicyActive": true|false
        },
        "dppChange": {
          "retentionPeriod": <days>,
          "isAuditPolicyActive": true|false
        }
      },
      "allowConsumption": true|false,
      "enableDataLake": true|false,
      "members": [],
      "dbusers": {},
      "hdicontainers": {},
      "workloadClass": {
        "totalStatementMemoryLimit": {
          "value": 0,
          "unit": "Gigabyte|Percent"
        },
        "totalStatementThreadLimit": {
          "value": 0,
          "unit": "Counter|Percent"
        }
      }
    }
  }
}
```

> ℹ️ **Note**
> Users with the *DW Space Administrator* role cannot create spaces; however, they can set space properties except for the following: `SPACE_ID`, `assignedStorage`, `assignedRam`, and `priority`.

> ⚠️ **Caution**
> The following workload management parameters are deprecated and may be removed in future releases: `priority`, `workloadClass.totalStatementMemoryLimit.value`, `workloadClass.totalStatementMemoryLimit.unit`, `workloadClass.totalStatementThreadLimit.value`, `workloadClass.totalStatementThreadLimit.unit`.

The parameters are set as follows:

| Parameter | Space Property | Description |
|---|---|---|
| `<SPACE_ID>` | Space ID | *[Required]* Technical name of the space. Up to 20 uppercase letters or digits, no spaces or special characters except `_`. Prefix `_SYS` as well as `DWC_`, `SAP_` are not recommended (see *Rules for Technical Names*). |
| `version` | – | *[Required]* Version of the space definition file format. Must always be set to `1.0.4`. |
| `label` | Space Name | Business name of the space. Max. 30 characters including spaces/special characters. Suggested value: `<Space_ID>`. |
| `assignedStorage` | Disk (GB) | Assigned storage in bytes, between `100000000` bytes (100 MB) and the available total storage. Suggested value: `2000000000` bytes (2 GB). *(To set no limit, specify `0` for both `assignedStorage` and `assignedRam` — this disables the "Enable space quota" option.)* |
| `assignedRam` | Memory (GB) | Assigned memory in bytes, between `100000000` bytes (100 MB) and the available total storage. Suggested value: `1000000000` bytes (1 GB). |
| `longDescription` | Description | Description for the space, max. 4,000 characters. |
| `priority` *(deprecated)* | Space Priority | Prioritization of the space for database queries, value between 1 (lowest) and 8 (highest). Suggested value: `5`. |
| `dppRead.isAuditPolicyActive` / `dppRead.retentionPeriod` | Audit Log for Read Operations | Audit logging policy for read operations and number of retention days (7–10000). Suggested values: `false`, `30`. |
| `dppChange.isAuditPolicyActive` / `dppChange.retentionPeriod` | Audit Log for Change Operations | Same for change operations. Suggested values: `false`, `30`. |
| `allowConsumption` | – | Default setting for *Make Available for Consumption* for views created in this space. Suggested value: `false`. |
| `enableDataLake` | – | Enables access to SAP HANA Cloud, data lake. Only one space can be connected to the data lake. Suggested value: `false`. |
| `members` | User Assignment | See [Members](#members). |
| `dbusers` | Database Users | See [Database Users](#database-users). |
| `hdicontainers` | HDI Containers | See [HDI Containers](#hdi-containers). |
| `workloadClass.totalStatementMemoryLimit.value/.unit` *(deprecated)* | Total Statement Memory Limit (GB/%) | Maximum amount/percentage of memory in GB that statements running concurrently in the space can consume. Suggested values: `0`, `Gigabyte`. |
| `workloadClass.totalStatementThreadLimit.value/.unit` *(deprecated)* | Total Statement Thread Limit (Threads/%) | Maximum number/percentage of threads that statements running concurrently in the space can consume. Suggested values: `0`, `Counter`. |

The following file, for example, creates a new space with all default properties:

```json
{
  "NEWSPACE": {
    "spaceDefinition": {
      "version": "1.0.4"
    }
  }
}
```

> ℹ️ **Note**
> If a property is not set, it receives the suggested value (when creating) or retains its current value (when updating).

The second file updates the new space (`NEWSPACE`) by changing the *Space Name* and increasing the assignments for *Disk (GB)* and *In-Memory (GB)*:

```json
{
  "NEWSPACE": {
    "spaceDefinition": {
      "version": "1.0.4",
      "label": "My New Space",
      "assignedStorage": 6000000000,
      "assignedRam": 5000000000
    }
  }
}
```

The third file updates the *Space Priority* and leaves the other parameters as previously set:

```json
{
  "NEWSPACE": {
    "spaceDefinition": {
      "version": "1.0.4",
      "priority": 4
    }
  }
}
```

> ℹ️ **Note**
> The following properties are not supported when spaces are created, read, or updated via `datasphere`: *Connections*, *Time Data*, *Space Status*, and other runtime properties.

### Members

See [4.2 Managing Space Users via the Command Line](#42-managing-space-users-via-the-command-line).

### Database Users

The `dbusers` section of the space definition file is deprecated and ignored. To create, update, or delete database users, use the `datasphere dbusers` commands (see [4.3](#43-managing-database-users-via-the-command-line)).

### HDI Containers

Users with the *DW Administrator*, *DW Space Administrator*, or *DW Integrator* role can assign HDI containers to a space using the following syntax (see *Exchanging Data with HDI Containers from SAP HANA for SQL Data Warehousing*):

```json
{
  "...": "...",
  "hdicontainers": {
    "<Container_Name>": {}
  }
}
```

| Parameter | Space Property | Description |
|---|---|---|
| `<Container_Name>` | HDI Container Name | *[Required]* Name of the HDI container linked to your SAP Datasphere instance and not assigned to any other space. |

For example, the following file associates two HDI containers with `NEWSPACE`:

```json
{
  "NEWSPACE": {
    "spaceDefinition": {
      "version": "1.0.4",
      "hdicontainers": {
        "MyHDIContainer": {},
        "MyOtherContainer": {}
      }
    }
  }
}
```

When updating HDI containers, you must always specify all HDI containers that should be assigned to the space. To delete an HDI container, remove it from the `hdicontainers` section.

### Table, View, and Data Access Control Definitions

Users with the *DW Administrator* or *DW Space Administrator* role can add tables, views, and data access controls to a space using standard CSN syntax (see *Core Data Services Schema Notation (CSN)*). Users with the *DW Modeler* role can add tables and views.

> ℹ️ **Note**
> With the `objects` commands, which support a wider selection of object types, you can also read and write objects in your space (see [Chapter 7](../chapters/07-modeling-objects.md)).

The following file, for example, creates a table with two columns in `NEWSPACE`:

```json
{
  "NEWSPACE": {
    "spaceDefinition": {
      "version": "1.0.4"
    },
    "definitions": {
      "Products": {
        "kind": "entity",
        "elements": {
          "Product ID": {
            "type": "cds.Integer64",
            "key": true,
            "notNull": true
          },
          "Product Name": {
            "type": "cds.String",
            "length": 5000
          }
        }
      }
    }
  }
}
```

> ℹ️ **Note**
> You can obtain more complex examples by reading existing objects from a space into a file with the `--definitions` option (see *Read Space* above).

---

## 4.5 Managing Priorities and Statement Limits for Spaces or Groups via the Command Line

You can use the SAP Datasphere command-line interface `datasphere` to set priorities and statement limits for spaces or groups.

**Prerequisites**

To set priorities and statement limits for spaces or groups, you need a global role that grants you the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *System Information* (`-RU-----`) – for access to the *Configuration* area in the *System* tool.

The global role *DW Administrator*, for example, grants these permissions.

To browse the available commands:

```
datasphere workload
```

General information about priorities and statement limits can be found under *Setting Priorities and Statement Limits for Spaces or Groups*.

### List Priorities and Statement Limits for Spaces or Groups

```
datasphere workload list
    [--host "<url>"]
    [--output <file>.json]
```

| Parameter | Description |
|---|---|
| `--host "<url>"` | Enter the URL of your SAP Datasphere tenant. |
| `--output <file>.json` | *[Optional]* Path to a `.json` file for the output. |

### Update Priorities and Statement Limits for Spaces or Groups

```
datasphere workload update
    --file-path <file>.json|--input '<stringified-json>'
```

| Parameter | Description |
|---|---|
| `--file-path <file>.json` | Path to a file with the `.json` extension containing a list of space or group properties to update:<br>`{ "assignment": "SPACE" \| "GROUP", "workloadClasses": [ { "group": "<GroupName>", "spaceId": "<SpaceID>", "priority": <PriorityNumber>, "workloadType": "<WorkloadType>", "totalStatementThreadLimit": <Value>, "totalStatementThreadLimitUnit": "Counter\|Percent", "totalStatementMemoryLimit": <Value>, "totalStatementMemoryLimitUnit": "Gigabyte\|Percent" } ] }`<br>*(`group` is only relevant when `assignment` = `GROUP`; `spaceId` only relevant when `assignment` = `SPACE`.)* |

**Example 1 — Change priorities per space:** Space `SALES_EU` receives priority `2` (instead of `1`) and workload type `default` (instead of `custom`); space `SALES_US` receives priority `8` (instead of `5`), workload type `custom` (instead of `default`) with `totalStatementThreadLimit` 50% and `totalStatementMemoryLimit` 80%:

```
datasphere workload update --file-path update.json
```

```json
{
    "assignment": "SPACE",
    "workloadClasses": [
        {
            "group": null,
            "spaceId": "SALES_EU",
            "priority": 2,
            "workloadType": "default"
        },
        {
            "group": null,
            "spaceId": "SALES_US",
            "priority": 8,
            "workloadType": "custom",
            "totalStatementThreadLimit": 50,
            "totalStatementThreadLimitUnit": "Percent",
            "totalStatementMemoryLimit": 80,
            "totalStatementMemoryLimitUnit": "Percent"
        }
    ]
}
```

**Example 2 — Change default priorities of the `SQL Access` group** (priority 4, custom statement limits 50% thread / 70% memory):

```
datasphere workload update --file-path update.json
```

```json
{
    "assignment": "GROUP",
    "workloadClasses": [
        {
            "group": "SQL Access",
            "spaceId": null,
            "priority": 4,
            "workloadType": "custom",
            "totalStatementThreadLimit": 50,
            "totalStatementThreadLimitUnit": "Percent",
            "totalStatementMemoryLimit": 70,
            "totalStatementMemoryLimitUnit": "Percent"
        }
    ]
}
```

### Switch Workload Distribution from Space to Group or Group to Space

For workload distribution, you can switch between space and group.

Example for distribution by space:

```json
{
    "assignment": "SPACE",
    "workloadClasses": [
        {
            "group": null,
            "spaceId": "<SpaceID>",
            "priority": "<PriorityNumber>",
            "workloadType": "<WorkloadType>",
            "totalStatementThreadLimit": "<Value>",
            "totalStatementThreadLimitUnit": "Counter|Percent",
            "totalStatementMemoryLimit": "<Value>",
            "totalStatementMemoryLimitUnit": "Gigabyte|Percent"
        }
    ]
}
```

To switch workload distribution from space to group:

```
datasphere workload update --file-path update.json
```

```json
{
    "assignment": "GROUP",
    "workloadClasses": []
}
```

The default settings are applied to the groups.

### The Workload Management File Format

Priorities and statement limits for spaces or groups are set and retrieved in the workload management definition file format and saved as a `.json` file.

You can set each priority and statement limit property using the following syntax:

```json
{
    "assignment": "SPACE" | "GROUP",
    "workloadClasses": [
        {
            "group": "<GroupName>",
            "spaceId": "<SpaceID>",
            "priority": "<PriorityNumber>",
            "workloadType": "<WorkloadType>",
            "totalStatementThreadLimit": "<Value>",
            "totalStatementThreadLimitUnit": "Counter|Percent",
            "totalStatementMemoryLimit": "<Value>",
            "totalStatementMemoryLimitUnit": "Gigabyte|Percent"
        }
    ]
}
```

The parameters are set as follows:

| Parameter | Space Property | Description |
|---|---|---|
| `spaceId` | Space ID | *[Required when `assignment`=`SPACE`]* Technical name of the space (max. 20 uppercase letters/digits, `_` allowed; prefix `_SYS`, `DWC_`, `SAP_` not recommended). |
| `group` | Group | *[Required when `assignment`=`GROUP`]* Name of the group (see *Setting Priorities and Statement Limits for Spaces or Groups*). |
| `priority` | Priority | Prioritization of the space or group for database queries, value between 1 (lowest) and 8 (highest). |
| `workloadType` | Total Statement Memory Limit | `default` (standard): generous resource limits, prevents overload by individual spaces/groups. `custom` (user-defined): allows custom statement limits for threads and memory. |
| `totalStatementMemoryLimit` / `totalStatementMemoryLimitUnit` | Total Statement Memory Limit (GB/%) | Only when `workloadType custom`: maximum memory amount/percentage of concurrently executed statements (0 = unlimited). |
| `totalStatementThreadLimit` / `totalStatementThreadLimitUnit` | Total Statement Thread Limit (Threads/%) | Only when `workloadType custom`: maximum number/percentage of threads for concurrently executed statements (0 = unlimited). |

The default values for the parameters above can be found under *Setting Priorities and Statement Limits for Spaces or Groups*.
