# Appendix E – Modeling Object CSN / JSON Formats

Minimal **create** payloads for `datasphere objects <type> create --space <ID> --file-path …`.  
Validated against CLI **2026.14.0** where noted. Prefer `objects <type> read` of an existing object as the richest template.

Also see ready-to-copy files under [examples/](../examples/).

---

## E.0 Rules (all types)

1. **One object per file** — do not paste a full CSN export that includes dependencies. Create sources first.
2. **Type detection** — the API picks the entity by annotations (`modelingPattern`, `editorType`, `businessLayerDefinitions`, …). Wrong markers → `FailedToObtainObjectName`.
2b. **`definitions` is not universal.** Tables, views, analytic models and Business Builder objects use `definitions`. Flows and task chains use their **own root key** and a `sap.*` `kind` — see the table below. A `definitions` payload for those types fails with `FailedToObtainObjectName` regardless of annotations, and `--technical-name` does **not** help (the name is read from the payload only).

| Object type | Root key | `kind` |
|---|---|---|
| local tables, views, analytic models, … | `definitions` | `entity` |
| `transformation-flows` | `transformationflows` | `sap.dis.transformationflow` |
| `data-flows` | `dataflows` | `sap.dis.dataflow` |
| `task-chains` | `taskchains` | `sap.dwc.taskChain` |

Technical names are **case-sensitive**. Pitfall index from measured runs:
[validated-findings.md](../validated-findings.md).
3. **Write UTF-8 without BOM** (PowerShell `Set-Content -Encoding utf8` adds BOM and breaks JSON parse).
4. **Space ID** is case-sensitive (tenant space ID).
5. Optional top-level sections (when present on `read`): `editorSettings`, `sharing`, `i18n`, `businessLayerDefinitions`.
6. After create: verify with `list` / `read`. Deploy is default unless `--no-deploy`.
7. **A view MUST have a `query` block.** `@DataWarehouse.sqlEditor.query` is only a display
   annotation for the UI SQL editor — it is **not** an executable definition. A view carrying
   only that annotation is accepted, reports `status: Deployed`, and serves a correct
   `$metadata` document — but it has no body and returns **0 rows forever**, with no error
   anywhere. See [E.2.4](#e24-silently-empty-views-the-query-block-is-mandatory).
8. **`cast` is a type declaration, not a conversion.** On the top level of a column it emits no
   SQL `CAST` — the declared type lands in `elements` and `$metadata`, the data passes through
   untouched, and a cast to a narrower type is ignored without error. Convert with
   `TO_INTEGER` / `TO_DECIMAL` / `LEFT`, or nest the cast as an operand inside an expression.
   See [E.2.5](#e25-cast-declares-a-type--it-does-not-convert).

### Modeling patterns → typical CLI type / semanticUsage

| `@ObjectModel.modelingPattern` | Usual CLI command | Notes |
|---|---|---|
| `DATA_STRUCTURE` | `local-tables` or `views` | Table: no `query`. View: has `query`. |
| `ANALYTICAL_FACT` | `views` | Fact view (exposes measures). |
| `ANALYTICAL_DIMENSION` | `views` | Dimension view. |
| `ANALYTICAL_CUBE` alone | `views` | Cube **view** — not an Analytic Model. |
| `ANALYTICAL_CUBE` + `DWCQueryModelEditor` + `businessLayerDefinitions` | `analytic-models` | Required trio for AM create. |

---

## E.1 `local-tables`

**Dependencies:** none (unless delta capture — use design-time `read`/`accept`).  
**Validated:** yes.

```json
{
  "definitions": {
    "T1": {
      "kind": "entity",
      "@EndUserText.label": "T1",
      "@ObjectModel.modelingPattern": { "#": "DATA_STRUCTURE" },
      "@ObjectModel.supportedCapabilities": [{ "#": "DATA_STRUCTURE" }],
      "elements": {
        "ID": {
          "@EndUserText.label": "ID",
          "type": "cds.String",
          "length": 100,
          "key": true,
          "notNull": true
        },
        "Name": {
          "@EndUserText.label": "Name",
          "type": "cds.String",
          "length": 100
        }
      }
    }
  }
}
```

```bash
datasphere objects local-tables create --space <ID> --file-path ./local-table.json
```

Delta tables: `read` with  
`--accept application/vnd.sap.datasphere.object.content.design-time+json`.

---

## E.2 `views`

**Dependencies:** all sources (tables/views) and any DACs.  
Same command for graphical and SQL; graphical extras live in `editorSettings` (omit for SQL).

### E.2.1 Relational dataset (SQL) — validated

```json
{
  "definitions": {
    "V_REL": {
      "kind": "entity",
      "@EndUserText.label": "Relational View",
      "@ObjectModel.modelingPattern": { "#": "DATA_STRUCTURE" },
      "@ObjectModel.supportedCapabilities": [{ "#": "DATA_STRUCTURE" }],
      "@DataWarehouse.consumption.external": false,
      "elements": {
        "ID": {
          "@EndUserText.label": "ID",
          "type": "cds.String",
          "length": 100,
          "key": true,
          "notNull": true
        },
        "Name": {
          "@EndUserText.label": "Name",
          "type": "cds.String",
          "length": 100
        }
      },
      "query": {
        "SELECT": {
          "from": { "ref": ["T1"], "as": "T" },
          "columns": [
            { "ref": ["T", "ID"] },
            { "ref": ["T", "Name"] }
          ]
        }
      },
      "@DataWarehouse.sqlEditor.query": "SELECT \"T\".\"ID\", \"T\".\"Name\" FROM \"T1\" AS \"T\""
    }
  }
}
```

### E.2.2 Fact view (analytical) — validated

**A measure needs two annotations, not one.** `@AnalyticsDetails.measureType: BASE`
classifies the column as a measure; `@Aggregation.default` only says how to aggregate it.
With the aggregation alone the view deploys clean and reads back intact, but every analytic
model built on it reports `Measure "<COL>" does not exist in fact source "<VIEW>"` — one
message per measure — because the AM sees the column as an attribute. Everything not
carrying `measureType` stays an attribute (matches SAP's own exported facts, e.g.
[cloud-dqm-sample-payloads](https://github.com/SAP-samples/cloud-dqm-sample-payloads/blob/main/datasphere-geo-map/SalesOrders_View.json)).
The save API does **not** catch this — it validates that the column exists, not that it is
a measure — so the AM saves and deploys with zero CLI output and the messages only surface
in the Data Builder.

```json
{
  "definitions": {
    "AV_ORDERS_FACT": {
      "kind": "entity",
      "@EndUserText.label": "Orders Analytical View",
      "@ObjectModel.modelingPattern": { "#": "ANALYTICAL_FACT" },
      "@ObjectModel.supportedCapabilities": [
        { "#": "ANALYTICAL_PROVIDER" },
        { "#": "DATA_STRUCTURE" }
      ],
      "@DataWarehouse.consumption.external": true,
      "elements": {
        "ORDER_ID": {
          "key": true,
          "notNull": true,
          "type": "cds.String",
          "length": 36,
          "@EndUserText.label": "Order ID"
        },
        "CUSTOMER_NAME": {
          "type": "cds.String",
          "length": 100,
          "@EndUserText.label": "Customer Name"
        },
        "ORDER_DATE": {
          "type": "cds.Date",
          "@EndUserText.label": "Order Date"
        },
        "AMOUNT": {
          "type": "cds.Decimal",
          "precision": 15,
          "scale": 2,
          "@EndUserText.label": "Amount",
          "@AnalyticsDetails.measureType": { "#": "BASE" },
          "@Aggregation.default": { "#": "SUM" }
        }
      },
      "query": {
        "SELECT": {
          "from": { "ref": ["ZTEST_CLI_ORDERS"], "as": "O" },
          "columns": [
            { "ref": ["O", "ORDER_ID"] },
            { "ref": ["O", "CUSTOMER_NAME"] },
            { "ref": ["O", "ORDER_DATE"] },
            { "ref": ["O", "AMOUNT"] }
          ]
        }
      }
    }
  }
}
```

### E.2.3 Dimension / Cube views — validated

Still `objects views create`. Copy-ready files: [view-dimension.json](../examples/view-dimension.json), [view-cube.json](../examples/view-cube.json).

| Semantic | modelingPattern | supportedCapabilities (typical) | Example |
|---|---|---|---|
| Dimension | `ANALYTICAL_DIMENSION` | `ANALYTICAL_DIMENSION`, `DATA_STRUCTURE` | `AV_CUSTOMERS_DIM` on `T1` |
| Cube view | `ANALYTICAL_CUBE` | `ANALYTICAL_PROVIDER` (± `DATA_STRUCTURE`) | `AV_ORDERS_CUBE` on orders |

Cube **view** ≠ Analytic Model (see E.3). Cube views omit `DWCQueryModelEditor` and `businessLayerDefinitions`.

```bash
datasphere objects views create --space <ID> --file-path ./view-dimension.json
datasphere objects views create --space <ID> --file-path ./view-cube.json
```

### E.2.3a Graphical views (Graphical View Builder) — validated

Same CLI command as SQL views. Graphical views differ only by optional top-level
`editorSettings` and (for complex models) multiple `definitions` entries for embedded
sub-views.

| Piece | Required | Purpose |
|---|---|---|
| `definitions.<VIEW>.query` | **yes** | Compiled logic (joins, projections, filters) |
| `definitions.<VIEW>.elements` | **yes** | Output columns |
| `editorSettings.<VIEW>.editor.lastModifier` | no | `GRAPHICALVIEWBUILDER` → opens in Graphical View Builder |
| `editorSettings.<VIEW>.uiModel` | no | Serialized diagram layout from the UI |
| Multiple `definitions` keys | no | Billing-style models with embedded helper views |

**Minimal inner join** (order header + item on `VBELN`): [view-graphical-join.json](../examples/view-graphical-join.json)

```bash
datasphere objects views create --space <ID> --file-path ./view-graphical-join.json
```

Helper script:

```bash
python .cursor/skills/datasphere-cli/scripts/create_graphical_view.py \
  --space DIMITRITEST --name T1_GV_ORDER_JOIN \
  --left T1_STG_ORDER_HDR --right T1_STG_ORDER_ITM --join VBELN=VBELN --deploy
```

For UI exports like `Billing.json`: pass the harvested JSON verbatim via `--from-file`.
**`uiModel` trap:** a partial diagram (join nodes without full column/element mappings)
deploys but the UI shows validation errors — *„Join N muss Spalten zuordnen“*. Either
clone a **complete** `uiModel` from `objects views read` / a UI export, or omit `uiModel`
entirely (empty canvas, no errors; logic still runs from `query`).

**Verify:** query rows, never Deployed status alone — see [E.2.4](#e24-silently-empty-views-the-query-block-is-mandatory).

---

### E.2.4 Silently empty views: the `query` block is mandatory

The single most expensive failure mode with CLI-created views, because **nothing reports an error**.

`@DataWarehouse.sqlEditor.query` is a *display annotation* that mirrors what the UI SQL editor
shows. It is not compiled. A view that has only that annotation and no `query` block:

- is accepted by `create` / `update` and reports **`status: Deployed`**
- serves a complete, correct `$metadata` document (all columns, right types)
- returns **0 rows** from the analytical endpoint (HTTP 200, empty result)
- returns **HTTP 500** from the relational consumption endpoint
- lets flows reading it run to `COMPLETED` with **"0 records written"**

A downstream `TRUNCATE`-mode transformation flow will therefore happily wipe its target table
and refill it with nothing, and every log says success.

**Detect it** — the check that matters, on every view you did not create in the UI:

```bash
datasphere objects views read --space <ID> --technical-name <VIEW> | grep -c '"query"'
```

`0` means the view is a shell. Compare against a known-good view: working ones have **both**
`query` and `@DataWarehouse.sqlEditor.query`.

**Repair** — you cannot add a `query` to an existing query-less view. `update` saves it
(HTTP 200 with `--no-deploy`) but the deploy step fails with `400 Failed to deploy`, and
neither `--save-anyway` nor `--allow-missing-dependencies` gets past it. Delete and recreate:

```bash
datasphere objects views delete --space <ID> --technical-name <VIEW> --force --delete-anyway
datasphere objects views create --space <ID> --file-path ./<VIEW>.json
```

`--force` is required in non-interactive contexts: `delete` otherwise prompts `(y/N)` and
defaults to **no** while still exiting `0`. Recreate in dependency order (staging → cleansing →
integration → analytics). Once a view has a `query`, ordinary `update` calls work again,
including for added annotations.

#### CSN expression cookbook (all constructs below verified against CLI 2026.14.0)

Column names come from `as`; keep the column order identical to `elements`.

| SQL | CSN |
|---|---|
| `"A"."C"` | `{"ref":["A","C"]}` |
| `'LIT'` | `{"val":"LIT"}` |
| `TRIM(x)` | `{"func":"TRIM","args":[ … ]}` |
| `CAST(x AS NVARCHAR(n))` | add `"cast":{"type":"cds.String","length":n}` to the expression |
| `CAST(x AS DECIMAL(p,s))` | `"cast":{"type":"cds.Decimal","precision":p,"scale":s}` |
| `x IN ('A','B')` | `[ … ,"in",{"list":[{"val":"A"},{"val":"B"}]}]` inside an `xpr` |
| `x IS NULL OR TRIM(x)=''` | `[{"ref":[…]},"is","null","or",{"func":"TRIM",…},"=",{"val":""}]` |

Searched `CASE`, simple `CASE`, and a literal column:

```json
{"xpr":["case","when",{"func":"UPPER","args":[{"ref":["C","NAME1"]}]},"like",{"val":"%GMBH%"},
        "then",{"val":"GmbH"},"else",{"val":"Sonstige"},"end"],
 "cast":{"type":"cds.String","length":20},"as":"LEGAL_FORM"}

{"xpr":["case",{"ref":["M","MATKL"]},"when",{"val":"MASCH"},"then",{"val":"Maschinen"},
        "else",{"val":"Nicht zugeordnet"},"end"],
 "cast":{"type":"cds.String","length":40},"as":"MATERIAL_GROUP_TEXT"}

{"val":"SD_LOCAL","cast":{"type":"cds.String","length":10},"as":"SRC_SYSTEM"}
```

Joins — `args` takes exactly two operands, so chain them for three or more sources. `where`
is a token list alongside `from` / `columns`:

```json
"from": {"join":"inner",
         "args":[{"ref":["ITEMS"],"as":"I"},{"ref":["HEADERS"],"as":"H"}],
         "on":[{"ref":["I","VBELN"]},"=",{"ref":["H","VBELN"]}]},
"where":[{"ref":["H","AUDAT"]},"is","not","null"]
```

Window functions, as raw tokens inside `xpr`:

```json
{"xpr":["SUM","(",{"ref":["B","NET_AMOUNT"]},")","OVER",
        "(","PARTITION","BY",{"ref":["B","VBELN"]},")"],"as":"DOC_NET_TOTAL"}
```

Derived table (subquery in `FROM`) — a full `SELECT` object with an `as`, usable as a join operand:

```json
"from": {"join":"left",
         "args":[{"SELECT":{"from":{"ref":["CLN_ORDER"],"as":"B"},"columns":[ … ]},"as":"O"},
                 {"ref":["CLN_CUSTOMER"],"as":"C"}],
         "on":[{"ref":["O","KUNNR"]},"=",{"ref":["C","KUNNR"]}]}
```

Practical limit: this covers projections, expressions, joins, filters, window functions and
derived tables. For anything beyond that, build the view in the UI SQL editor.

#### E.2.5 `cast` declares a type — it does not convert

**A `cast` on the top level of a column produces no SQL `CAST`.** It only sets the type in
`elements`. The view deploys, `$metadata` announces `Edm.Int32`, and OData serves the
untouched source value. Same silent-failure class as [E.2.4](#e24-silently-empty-views-the-query-block-is-mandatory).

| Column expression | declared | actually returned |
|---|---|---|
| `{"ref":["F","POSNR"],"cast":{"type":"cds.Integer"}}` | Integer | `"000010"` |
| `{"xpr":[{"ref":["F","POSNR"],"cast":{"type":"cds.Integer"}},"+",{"val":0}]}` | Integer | `10` |
| `{"ref":["F","NAME1"],"cast":{"type":"cds.String","length":3}}` | String(3) | `"Muster Handel GmbH"` |
| `{"func":"LEFT","args":[{"ref":["F","NAME1"]},{"val":3}]}` | String(3) | `"Mus"` |

A cast to a *narrower* type therefore never errors and never truncates — it is ignored.
To actually convert, use `TO_INTEGER` / `TO_DECIMAL` / `LEFT`, or embed the cast as an
**operand inside an expression**. Numeric conversion **truncates**, it does not round
(`1231.50` → `1231`).

**Expressions compute in the scale of their operands**, and the column `cast` cannot widen
the result afterwards. `AVG(NETWR)` over a `Decimal(15,2)` column yields two decimals even
with `cast` to `Decimal(17,4)`. Cast the *operands* first — `AVG(CAST(NETWR AS Decimal(17,6)))`
— or aggregate in `cds.Double`. This hits every ratio and average measure.

#### E.2.6 Validated function inventory (2026.14.0)

48 field routines checked value-by-value against locally computed expectations over 50 rows
against known expected values, not just for successful deploy.

**Work:** `UPPER` `LOWER` `LENGTH` `SUBSTRING` `REPLACE` `LPAD` `CONCAT` `LEFT` `RIGHT` `TRIM`
· `ROUND` `ABS` `MOD` `FLOOR` `CEIL` `GREATEST` `LEAST` · `TO_INTEGER` `TO_DECIMAL` `TO_VARCHAR`
· `YEAR` `MONTH` `DAYOFMONTH` `DAYS_BETWEEN` `ADD_DAYS` `ADD_MONTHS` `LAST_DAY` `WEEKDAY`
`QUARTER` · `COALESCE` `NULLIF` · searched/simple/**nested** `CASE` · `LIKE` `LIKE_REGEXPR`
`LOCATE` · `ROW_NUMBER` `RANK` `DENSE_RANK` `LAG` `SUM/AVG OVER` incl.
`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` · `groupBy` + `having` · `SET` with
`{"op":"union","all":true}`.

**Rejected at deploy:** the `||` concatenation operator inside an `xpr` — between function
calls *and* between plain column refs. Use nested `CONCAT`; `CONCAT` takes exactly two
arguments, so chain it for three operands.

**Formats worth knowing:** `QUARTER(d)` returns `"2026-Q1"`, not an integer. `WEEKDAY(d)` is
0 = Monday. `LOCATE(haystack, needle)` is 1-based, 0 when absent. `COUNT(*)` is written
`{"xpr":["COUNT","(","*",")"]}`.

**Where errors surface:** division by zero deploys fine and fails at read time with HTTP 500
(guard with `NULLIF`). Every cast-related error above is silent.

#### E.2.7 Input parameters — validated

`params` sits next to `elements`. The **parameter reference** inside the query is what the
compiler is picky about — `params` on its own deploys fine (the view then just becomes
unreadable over the plain OData path, HTTP 400).

```json
"params": { "P_MATKL": { "type": "cds.String", "length": 9 } },
"query": { "SELECT": {
  "from": { "ref": ["SD_SALES_FACT"], "as": "F" },
  "columns": [ … ],
  "where": [ {"ref":["F","MATKL"]}, "=", {"ref":["P_MATKL"], "param": true} ] } }
```

| Reference form | Deploy | Read |
|---|---|---|
| `{"ref":["P_MATKL"],"param":true}` | OK | works |
| bare token `":P_MATKL"` in the `where` list | OK | works |
| `{"ref":["$parameters","P_MATKL"]}` | rejected | — |
| `{"ref":["P_MATKL"]}` / `{"ref":[":P_MATKL"]}` / `{"param":"P_MATKL"}` | rejected | — |
| `{"val":":P_MATKL"}` | **OK** | **HTTP 500** — it is a literal, not a parameter |

**Call it as** `/api/v1/datasphere/consumption/relational/<SPACE>/<VIEW>/<VIEW>(P_MATKL='MASCH')/Set`.
The `/Set` suffix is required; without it the endpoint answers 400.

---

## E.3 `analytic-models`

**Dependencies:** Fact (and optional dimension) sources must exist and be deployed.  
**Validated:** yes.  
**Type markers (all required for create):**

- `modelingPattern`: `ANALYTICAL_CUBE`
- `supportedCapabilities`: includes `ANALYTICAL_PROVIDER` and `_DWC_AM_EDITABLE_DIMENSION_NAMES`
- `@DataWarehouse.editorType`: `DWCQueryModelEditor`
- `@DataWarehouse.hanaCatalog.viewType`: `CALCULATION_VIEW`
- Top-level **`businessLayerDefinitions`** with `factSources`, `attributes`, `measures`

Without these → `FailedToObtainObjectName` (payload is treated as a normal view/cube, not an AM).

```json
{
  "definitions": {
    "AM_ORDERS": {
      "kind": "entity",
      "@EndUserText.label": "Orders Analytic Model",
      "elements": {
        "ORDER_ID": { "@EndUserText.label": "Order ID" },
        "CUSTOMER_NAME": { "@EndUserText.label": "Customer Name" },
        "ORDER_DATE": { "@EndUserText.label": "Order Date" },
        "AMOUNT": {
          "@EndUserText.label": "Amount",
          "@AnalyticsDetails.measureType": { "#": "BASE" }
        }
      },
      "@ObjectModel.modelingPattern": { "#": "ANALYTICAL_CUBE" },
      "@ObjectModel.supportedCapabilities": [
        { "#": "ANALYTICAL_PROVIDER" },
        { "#": "_DWC_AM_EDITABLE_DIMENSION_NAMES" }
      ],
      "@DataWarehouse.editorType": { "#": "DWCQueryModelEditor" },
      "@DataWarehouse.hanaCatalog.viewType": { "#": "CALCULATION_VIEW" },
      "query": {
        "SELECT": {
          "from": { "ref": ["AV_ORDERS_FACT"], "as": "AV_ORDERS_FACT" },
          "columns": [
            { "ref": ["AV_ORDERS_FACT", "ORDER_ID"], "as": "ORDER_ID" },
            { "ref": ["AV_ORDERS_FACT", "CUSTOMER_NAME"], "as": "CUSTOMER_NAME" },
            { "ref": ["AV_ORDERS_FACT", "ORDER_DATE"], "as": "ORDER_DATE" },
            { "ref": ["AV_ORDERS_FACT", "AMOUNT"], "as": "AMOUNT" }
          ]
        }
      }
    }
  },
  "businessLayerDefinitions": {
    "AM_ORDERS": {
      "identifier": { "key": "AM_ORDERS" },
      "text": "Orders Analytic Model",
      "sourceModel": {
        "factSources": {
          "AV_ORDERS_FACT": {
            "text": "AV_ORDERS_FACT",
            "dataEntity": { "key": "AV_ORDERS_FACT" }
          }
        },
        "dimensionSources": {}
      },
      "exposedAssociations": {},
      "attributes": {
        "ORDER_ID": {
          "attributeType": "AnalyticModelAttributeType.FactSourceAttribute",
          "attributeMapping": { "AV_ORDERS_FACT": { "key": "ORDER_ID" } },
          "text": "Order ID",
          "duplicated": false
        },
        "CUSTOMER_NAME": {
          "attributeType": "AnalyticModelAttributeType.FactSourceAttribute",
          "attributeMapping": { "AV_ORDERS_FACT": { "key": "CUSTOMER_NAME" } },
          "text": "Customer Name",
          "duplicated": false
        },
        "ORDER_DATE": {
          "attributeType": "AnalyticModelAttributeType.FactSourceAttribute",
          "attributeMapping": { "AV_ORDERS_FACT": { "key": "ORDER_DATE" } },
          "text": "Order Date",
          "duplicated": false
        }
      },
      "measures": {
        "AMOUNT": {
          "measureType": "AnalyticModelMeasureType.FactSourceMeasure",
          "measureMapping": { "AV_ORDERS_FACT": { "key": "AMOUNT" } },
          "text": "Amount",
          "isAuxiliary": false
        }
      },
      "version": "1.7.0",
      "supportedCapabilities": {},
      "crossCalculations": {},
      "variables": {}
    }
  }
}
```

```bash
datasphere objects analytic-models create --space <ID> --file-path ./analytic-model.json
```

### E.3.0 An analytic model cannot create a measure — validated

Its `query` may compute columns, but the business layer only accepts
`AnalyticModelMeasureType.FactSourceMeasure` mapped to a column that is **already a measure
in the fact view**. Derived measures therefore belong in the view, carrying both
`@AnalyticsDetails.measureType` and `@Aggregation.default` ([E.2.2](#e22-fact-view-analytical--validated)).

Measured by isolating one assumption per probe (the server only ever answers
`Failed to deploy` plus a correlation ID, so guessing shapes yields nothing):

| Probe | Result |
|---|---|
| `@Aggregation.default` on an AM element | allowed |
| AM `query` column absent from the business layer | allowed, ignored |
| two measures mapped to the **same** source column | **rejected** |
| measure mapped to a column that is not a measure in the fact view | **rejected** |

Because multi-mapping is rejected, **every measure needs its own view column** — MIN and MAX
over the same amount means two copies of it in the fact view.

`AnalyticModelMeasureType.CalculatedMeasure` still needs a UI template (guessed shapes
failed). **RestrictedMeasure and Filter Variables are validated** (UI-harvested Analytic Model).

**Restricted Measure (E2)** — `businessLayerDefinitions…measures` + CDS element:

```json
"Restricted_Measure": {
  "text": "Restricted Measure",
  "measureType": "AnalyticModelMeasureType.RestrictedMeasure",
  "isAuxiliary": false,
  "key": "ORDER_QTY",
  "constantSelectionType": "AnalyticModelConstantSelectionType.None",
  "formula": "VKORG = '1000'",
  "formulaRaw": "VKORG = '1000'",
  "elements": {}
}
```

CDS: `"@AnalyticsDetails.measureType": { "#": "RESTRICTION" }`. UI path: Add Measure →
Restricted Measure; expression validates as `DIM = '…'`.

**Filter Variable (E6)** — `businessLayerDefinitions…variables` + filter annos on the
dimension element:

```json
"VBELN": {
  "referenceAttribute": "VBELN",
  "parameterType": "AnalyticModelParameterType.StoryFilter",
  "selectionType": "AnalyticModelVariableSelectionType.SINGLE",
  "variableProcessingType": "AnalyticModelVariableProcessingType.ManualInput",
  "multipleSelections": false,
  "mandatory": false,
  "order": 2
}
```

Unused Standard Variables block Deploy (`Variable … is not used`). Prefer **Filter
Variable** (auto-wires a filter) over a bare Standard Variable.

**Leveled hierarchy on a dimension view — validated** (`@Hierarchy.leveled`):

```json
"@Hierarchy.leveled": [{
  "name": "MATKL_LEVELS",
  "label": "Material Group Levels",
  "levels": [
    { "element": { "=": "PRODUCT_LINE" } },
    { "element": { "=": "MATERIAL_GROUP" } }
  ]
}]
```

Deployed on an `ANALYTICAL_DIMENSION` view; annotation
survives `objects views read` round-trip. Parent-child hierarchies still need a UI
template.

**Aggregation types, measured:**

| `@Aggregation.default` | Deploy | Result |
|---|---|---|
| `SUM` `MIN` `MAX` `COUNT` | OK | correct |
| `AVG` | OK | correct, at **full precision** — unlike `AVG` in a view expression, which truncates to the column scale ([E.2.5](#e25-cast-declares-a-type--it-does-not-convert)) |
| `COUNT_DISTINCT` on a text column | **rejected** | — |
| `COUNT_DISTINCT` on a numeric column | OK | **wrong: returns the row count**, identical to `COUNT`, over every group tested |

`COUNT_DISTINCT` is the trap: it deploys, survives the read/write round-trip unchanged, and
silently answers with `COUNT`. `@Semantics.amount.currencyCode` is accepted and round-trips.

### E.3.1 Dimension sources — validated

Dimensions reach an AM through an **association on the fact view**, never through a join in
the AM. Three pieces have to line up; miss one and the dimension silently does not appear.

**1. Fact view** — association element, foreign-key annotation, mixin, projection column.
Note the `on` side: plain `["<FK>"]` in `elements`, but `["$projection","<FK>"]` in `mixin`.

```json
"elements": {
  "KUNNR": {
    "type": "cds.String", "length": 10,
    "@ObjectModel.foreignKey.association": { "=": "_CUSTOMER" }
  },
  "_CUSTOMER": {
    "type": "cds.Association",
    "on": [ { "ref": ["KUNNR"] }, "=", { "ref": ["_CUSTOMER", "KUNNR"] } ],
    "target": "AV_CUSTOMER_DIM",
    "@EndUserText.label": "AV_ORDERS_FACT to AV_CUSTOMER_DIM"
  }
},
"query": { "SELECT": {
  "from": { "ref": ["FCT_ORDERS"], "as": "F" },
  "columns": [ { "ref": ["F", "KUNNR"] }, { "ref": ["_CUSTOMER"] } ],
  "mixin": { "_CUSTOMER": {
    "type": "cds.Association",
    "on": [ { "ref": ["$projection", "KUNNR"] }, "=", { "ref": ["_CUSTOMER", "KUNNR"] } ],
    "target": "AV_CUSTOMER_DIM",
    "@EndUserText.label": "AV_ORDERS_FACT to AV_CUSTOMER_DIM"
  } } } }
```

**2. AM cube** — the association is re-declared under the name `<assoc>∞<dimensionSourceKey>`.
That separator is **U+221E INFINITY**, not an ASCII substitute. Write the file as UTF-8, and
on Windows decode CLI output explicitly (`text=True` uses cp1252 and turns `∞` into `âˆž`).

```json
"elements": {
  "_CUSTOMER∞0": {
    "type": "cds.Association",
    "on": [ { "ref": ["KUNNR"] }, "=", { "ref": ["_CUSTOMER∞0", "KUNNR"] } ],
    "target": "AV_CUSTOMER_DIM",
    "@EndUserText.label": "Customer Dimension"
  },
  "COUNTRY": {
    "@EndUserText.label": "Country",
    "@Analytics.navigationAttributeRef": [ "_CUSTOMER∞0", "COUNTRY" ]
  }
},
"query": { "SELECT": {
  "from": { "ref": ["AV_ORDERS_FACT"], "as": "AV_ORDERS_FACT" },
  "columns": [
    { "ref": ["_CUSTOMER∞0"] },
    { "ref": ["_CUSTOMER∞0", "COUNTRY"], "as": "COUNTRY" }
  ],
  "mixin": { "_CUSTOMER∞0": { "…": "same association, `on` via $projection" } } } }
```

**3. Business layer** — `associationSteps` names the **bare** association (`_CUSTOMER`, without
the `∞` suffix); `sourceKey` there is the key used in `factSources`. Dimension attributes use
`sourceKey` + `key`, **not** the `attributeMapping` shape that fact attributes use.

The FK element in the AM's `elements` also needs its own `@ObjectModel.foreignKey.association`,
pointing at the AM association (`{"=": "_CUSTOMER∞0"}`) — not the same value as on the fact view.
**And** the business-layer FactSourceAttribute for that FK must carry
`usedForDimensionSourceKey` equal to the `dimensionSources` key. Without that field the Data
Builder reports `no mapping attribute found for dimension` even when runtime is fine
→ [E.3.2](#e32-no-mapping-attribute-found-for-dimension).

`dimensionSources[<k>].text` and `attributes[<fk>].text` must both equal the FK column name
(`KUNNR`), not a human label. That is what the validator resolves as the mapping attribute.

```json
"sourceModel": {
  "factSources": { "AV_ORDERS_FACT": { "text": "…", "dataEntity": { "key": "AV_ORDERS_FACT" } } },
  "dimensionSources": {
    "0": {
      "text": "KUNNR",
      "dataEntity": { "key": "AV_CUSTOMER_DIM" },
      "associationContexts": [ {
        "sourceKey": "AV_ORDERS_FACT",
        "sourceType": "AnalyticModelSourceType.Fact",
        "associationSteps": [ "_CUSTOMER" ]
      } ]
    }
  }
},
"attributes": {
  "KUNNR": {
    "attributeType": "AnalyticModelAttributeType.FactSourceAttribute",
    "attributeMapping": { "AV_ORDERS_FACT": { "key": "KUNNR" } },
    "text": "KUNNR",
    "usedForDimensionSourceKey": "0"
  },
  "COUNTRY": {
    "attributeType": "AnalyticModelAttributeType.DimensionSourceAttribute",
    "sourceKey": "0", "key": "COUNTRY", "text": "Country"
  }
}
```

Numeric `dimensionSources` keys (`"0"`, `"1"`, …) and a *named* `factSources` key mix fine —
verified deployed. Attribute names must be unique across fact and dimensions; the UI resolves
a clash by suffixing (`PARTNERID` → `PARTNERID1`), so prefer exposing only dimension attributes
whose names the fact does not already carry.

**Renaming a dimension attribute** — when two dimensions carry the same column name (customer
`LAND1` and sales-org `LAND1`), the model element may be given a different name than the
dimension column. The alias goes in three places, and only the *element* name changes; `key`
and `navigationAttributeRef` keep naming the real dimension column. Verified deployed and
queried (`ORG_COUNTRY` on `AM_SD_SALES`, reading `AV_SD_SALES_ORG_DIM.LAND1`):

```json
"elements":   { "ORG_COUNTRY": { "@Analytics.navigationAttributeRef": ["_SALES_ORG∞2", "LAND1"] } },
"columns":    [ { "ref": ["_SALES_ORG∞2", "LAND1"], "as": "ORG_COUNTRY" } ],
"attributes": { "ORG_COUNTRY": { "attributeType": "AnalyticModelAttributeType.DimensionSourceAttribute",
                                 "sourceKey": "2", "key": "LAND1", "text": "Country" } }
```

**Deploy order when columns disappear.** Adding an association is additive — deploy the fact
view first, then the AM. But *removing* a fact column that the AM still references is rejected
with **422 `NOT_MODIFY_IN_USE`**:

```
The object AV_FACT#CUSTOMER_COUNTRY cannot be modified because it's used by
the following objects: AM_SALES, AM_SALES#CUSTOMER_COUNTRY
```

Then the order is the other way round: deploy the **AM first** (it drops the reference), the
view second. The guard is a real dependency check, not a cache — it does not go away with
`--save-anyway`.

**Verification** — a clean deploy proves nothing here (see E.2.2). Query the AM and check that a
dimension attribute returns values *and* that the measures are unchanged: a wrong `on` condition
fans rows out and inflates every measure. Cross-check a dimension attribute against the
equivalent denormalized fact column if one exists.

The sharpest cheap test: group the AM by an attribute of *each* dimension in turn and confirm
every grouping sums back to the same total. A fan-out shows up immediately as an inflated sum
in exactly the dimension whose `on` is wrong.

Note that the analytical OData endpoint aggregates on plain `$select` — `$select=COUNTRY,QTY`
already returns one row per country. `$apply=aggregate(...)` is not needed for a total; a bare
`$select` of only measures returns the single grand-total row.

### E.3.2 "No mapping attribute found for dimension"

The Data Builder shows one line per dimension, naming the `dimensionSources` key:

```
Invalid Analytic Model - no mapping attribute found for dimension "0"
Invalid Analytic Model - no mapping attribute found for dimension "1"
```

**Cause (UI-confirmed).** The business-layer
FactSourceAttribute that maps the foreign key must declare which dimension it owns:

```json
"businessLayerDefinitions": { "AM_SALES": { "attributes": {
  "KUNNR": {
    "attributeType": "AnalyticModelAttributeType.FactSourceAttribute",
    "attributeMapping": { "AV_ORDERS_FACT": { "key": "KUNNR" } },
    "text": "KUNNR",
    "usedForDimensionSourceKey": "0"
  }
} } }
```

`usedForDimensionSourceKey` must equal the `dimensionSources` key (`"0"`, `"1"`, … or a named
key such as `"_BusinessPartner"`). Present on every dimension of the datahub
`Test_Analytic_Model` fixture (BL version style with `measureMapping`). Absent from the older
`SalesOrders_Model` sample (BL `1.3.1`) and from CLI-generated models that only wired
associations — those deploy and query correctly, then fail Data Builder validation on BL
`1.7.0`.

Also required alongside it (necessary, not sufficient on their own):

| Where | What |
|---|---|
| fact view `elements[KUNNR]` | `@ObjectModel.foreignKey.association: { "=": "_CUSTOMER" }` |
| AM `elements[KUNNR]` | `@ObjectModel.foreignKey.association: { "=": "_CUSTOMER∞0" }` (∞-style AMs) |
| `dimensionSources[<k>].text` | FK column name (`KUNNR`), not a label |
| `attributes[KUNNR].text` | same FK column name (`KUNNR`), not `"Customer Number"` |

Derive the FK column mechanically: AM association whose `target` equals
`dimensionSources[<k>].dataEntity.key` → `on[0].ref[0]` is the attribute that must carry
`usedForDimensionSourceKey: "<k>"`.

**Why it is easy to miss.** Nothing else is wrong. The model deploys, `$metadata` is complete,
every measure is right, and every dimension groups back to the correct total. Only the Data
Builder's validation objects, and **the CLI has no `validate` command** — there is no local
oracle for this class of defect. Do not conclude from a green deploy and correct numbers that
the model is valid. Repair with `delete` + `create` (not `update`); close any open editor tab
**without saving** before reopening, or the UI draft overwrites the fixed design-time object.

**Fixes that look plausible and do not clear the message alone** — tried against a live tenant:

- *Exposing the dimension's key as an extra DimensionSourceAttribute.* SAP's UI models do not;
  added key attributes are then **silently dropped from the analytical CSDL**.
- *Removing the bare `{"ref": ["_CUSTOMER∞0"]}` projection column.* SAP's models contain it too.
- *Only setting `dimensionSources[<k>].text` to the FK column.* Needed for the lookup name, but
  without `usedForDimensionSourceKey` the error stays.
- *Only adding `@ObjectModel.foreignKey.association` on the AM element.* Needed for ∞-style
  AMs, but without `usedForDimensionSourceKey` the error stays (confirmed: FK alone left the
  three Data Builder errors in place).
- *Only aligning `attributes[KUNNR].text` to `KUNNR`.* Same — companion, not the trigger.

Also align while you are there: the **dimension view's key element** should carry
`@Analytics.dimension: true` (SAP's `Addresses_Location.COMPANYNAME` does). Alone it does not
clear this message.

**Getting a template.** Prefer the datahub fixture for this field — `SalesOrders_Model` predates
it:

| Source | Path | `usedForDimensionSourceKey` |
|---|---|---|
| `datahub-project/datahub` | `…/analyticmodels/Test_Analytic_Model.json` | **yes** (named dim keys) |
| `SAP-samples/cloud-dqm-sample-payloads` | `datasphere-geo-map/SalesOrders_Model.json` | no (older BL) |

Confirm structural rules against **both** where they disagree (`factSources` numeric vs named,
`sourceKey`+`key` vs `measureMapping`). Both shapes deploy; only the datahub shape documents
the mapping-attribute link the current editor validates.

---

## E.4 `remote-tables`

**Dependencies:** connection must exist (`spaces connections …`).  
**Template:** always `objects remote-tables read` — payloads are connection-specific and often include `@cds.persistence.exists` / remote catalog metadata.

Do not invent remote-table CSN from scratch. Typical create flow: import via connection UI or clone a `read` result, then `create`/`update` in the target space with `--allow-missing-dependencies` only if intentional.

```bash
datasphere objects remote-tables create --space <ID> --file-path ./remote-table.json
```

---

## E.5 `er-models`

**Dependencies:** visualized tables/views must exist.  
**Template:** `objects er-models read`. Structure is dominated by `editorSettings` (diagram). Minimal hand-authored CSN is impractical — clone via `read`.

---

## E.6 Flows: `data-flows` / `replication-flows` / `transformation-flows`

**Dependencies:** all sources + target tables.  
**Validated:** transformation flows — yes (2026.14.0).

> **Root key is not `definitions`.** Transformation flows live under
> **`transformationflows`** with `kind: "sap.dis.transformationflow"`. Sending a
> `definitions`-based payload yields `FailedToObtainObjectName` no matter which
> annotations you add — see [E.12](#e12-troubleshooting-create).

Minimal working shape: a two-process graph wiring a source view to a target
table. Copy-ready file: [transformation-flow.json](../examples/transformation-flow.json).

```json
{
  "transformationflows": {
    "TF_LOAD_DIM": {
      "kind": "sap.dis.transformationflow",
      "@EndUserText.label": "Load Dimension",
      "contents": {
        "properties": {},
        "metadata": { "loadType": "INITIAL_ONLY" },
        "parameters": {},
        "description": "Load Dimension",
        "processes": {
          "viewtransform1": {
            "component": "com.sap.dwc.viewtransform",
            "metadata": {
              "label": "View Transform",
              "x": 0, "y": 12, "height": 40, "width": 120,
              "config": {
                "definition": {
                  "kind": "entity",
                  "elements": { "ID": { "type": "cds.String", "length": 10, "key": true, "notNull": true } },
                  "query": {
                    "SELECT": {
                      "from": { "ref": ["V_SOURCE"] },
                      "columns": [{ "ref": ["ID"], "key": true }]
                    }
                  },
                  "@EndUserText.label": "viewtransform1",
                  "@ObjectModel.modelingPattern": { "#": "DATA_STRUCTURE" },
                  "@ObjectModel.supportedCapabilities": [{ "#": "DATA_STRUCTURE" }],
                  "@DataWarehouse.consumption.external": false
                },
                "version": { "csn": "1.0" },
                "meta": { "creator": "View Editor", "kind": "sap.dwc.viewmodel" },
                "$version": "1.0",
                "name": "TF_LOAD_DIM$TRF_TV_viewtransform1"
              }
            }
          },
          "target1": {
            "component": "com.sap.dwc.target",
            "metadata": {
              "label": "Target Table",
              "x": 200, "y": 12, "height": 40, "width": 120,
              "config": {
                "attributeMappings": [{ "source": "ID", "target": "ID" }],
                "definition": {
                  "kind": "entity",
                  "@EndUserText.label": "Target Table",
                  "@ObjectModel.modelingPattern": { "#": "DATA_STRUCTURE" },
                  "@ObjectModel.supportedCapabilities": [{ "#": "DATA_STRUCTURE" }],
                  "elements": { "ID": { "key": true, "notNull": true, "type": "cds.String", "length": 10 } }
                },
                "name": "T_TARGET",
                "truncate": true
              }
            }
          }
        },
        "groups": [],
        "connections": [
          {
            "metadata": { "points": "125,32 195,32" },
            "src": { "port": "outTable", "process": "viewtransform1" },
            "tgt": { "port": "inTable", "process": "target1" }
          }
        ],
        "inports": {},
        "outports": {}
      }
    }
  }
}
```

Notes:

- The `name` inside the viewtransform config follows `<FLOW>$TRF_TV_<process>`.
- `truncate: true` on the target = full reload. `false` is **not an append** — it is an
  **upsert on the key**: rerunning the same flow over unchanged source data leaves the row
  count identical. Historisation needs a business key with a time component.
- `metadata.loadType`: `INITIAL_ONLY` works. `INITIAL_AND_DELTA` over a plain
  local table **without Delta Capture** (e.g. `SD_SALES_FACT`) is rejected already
  at **save** (`--no-deploy`, HTTP 400 / bare create failure) — measured.
  That is expected: Initial and Delta requires a **delta-enabled local table** as
  source (not a view alone); target typically also needs Delta Capture, set
  **before** first deploy (KBA 3530222 / Capturing Delta Changes).
- A UI-created flow also carries `config.editorSettings.uiModel` — a serialized
  diagram, several KB. It is **optional**: flows created without it save, deploy
  and run. The graph itself lives in `processes` / `connections`.
- Target `definition._meta.dependencies.folderAssignment` appears when the
  object sits in a Data Builder folder. Setting it via CLI `update` is
  **silently discarded** — folders remain UI-only.

**`attributeMappings` semantics — measured, 2026.14.0:**

| Case | Behaviour |
|---|---|
| `source` ≠ `target` (rename) | works |
| order differs from `elements` | irrelevant, matching is by name |
| same source mapped to two targets | allowed |
| target column with no mapping | stays `NULL`, no error |
| source column with no mapping | discarded, no error |
| target column **narrower** than source (`Decimal(15,2)` → `Decimal(9,1)`) | **silently truncated** (`3203.75` → `3203.7`), run reports `COMPLETED` |
| `NULL` into a `notNull` target | run `FAILED`, constraint enforced |
| mapping to a non-existent target column | deploy **accepts**, run `FAILED` |

A failing run is **transactional**: the log shows `Truncating target table` before the error,
yet the target keeps its previous contents ("changes have been rolled back"). The runtime
message names no column — `An error occurred. … Unable to run transformation flow.` — so
diagnosis means diffing the definition.

Put field routines in the `viewtransform` query; `ROUND`, `CASE`, `TO_INTEGER` and literal
columns (`{"val": …}`) all work there exactly as in a view ([E.2.6](#e26-validated-function-inventory-202614)).

**Join / projection inside a transformation flow:** there is **no** separate
join/projection `component`. Both live in the `viewtransform` CSN `query`:

- **Inner join** — nested `from` with `"join": "inner"`, `args` (two sources + `as`), and
  `on` (column refs + `"="`). Harvested from a UI-created join flow (two sources on a key, e.g. `VBELN`).
- **Projection** — simply a reduced `columns` / `elements` list over one source
  (e.g. `VBELN`, `POSNR`, `MATNR`). Aggregation (Σ) in the TF UI is awkward;
  projection alone satisfies a “projection operator” harvest.

**Python Script is Data Flow only:** component
`com.sap.dataflow.sandboxPythonOperator` with
`metadata.config.script` holding `def transform(data): …`. Example:

```json
"sandboxpythonoperator1": {
  "component": "com.sap.dataflow.sandboxPythonOperator",
  "metadata": {
    "label": "Script 1",
    "config": { "script": "def transform(data):\n    return data\n" }
  }
}
```

Graph: `com.sap.database.table.consumer` → script → `com.sap.database.table.producer`.

**`data-flows` root key (validated via UI probes):**
`dataflows` with `kind: "sap.dis.dataflow"`. An empty graph (`processes` /
`sources` / `targets` empty) is enough for `read`; technical names are
**case-sensitive** (`Df_Probe` ≠ `DF_PROBE`).

`replication-flows` still unvalidated — start from `read` of an existing one.

```bash
datasphere objects transformation-flows create --space <ID> --file-path ./transformation-flow.json
```

Runtime control (run/pause/resume/logs) → [Chapter 8](../chapters/08-tasks-job-status.md), not `objects`.

---

## E.7 `task-chains`

**Dependencies:** objects the chain automates (must be deployed).  
**Definition** via `objects task-chains`; **execution** via `tasks`.  
**Validated:** yes (2026.14.0).

> **Root key is not `definitions`.** Task chains live under **`taskchains`** with
> `kind: "sap.dwc.taskChain"`.

Copy-ready file: [task-chain.json](../examples/task-chain.json).

```json
{
  "taskchains": {
    "TC_ETL_DAILY": {
      "kind": "sap.dwc.taskChain",
      "@EndUserText.label": "ETL Daily",
      "nodes": [
        { "id": 0, "type": "START" },
        {
          "id": 1,
          "type": "TASK",
          "taskIdentifier": {
            "applicationId": "TRANSFORMATION_FLOWS",
            "activity": "EXECUTE",
            "objectId": "TF_LOAD_DIM"
          },
          "ignoreError": false
        }
      ],
      "links": [
        {
          "id": 0,
          "startNode": { "nodeId": 0, "statusRequired": "ANY" },
          "endNode": { "nodeId": 1 }
        }
      ],
      "options": { "layout": "VERTICAL" },
      "schemaVersion": 2
    }
  }
}
```

### Task identifiers

`applicationId` is the **plural** object type; deploy validates the pair
strictly. Confirmed working:

| `applicationId` | `activity` | Effect |
|---|---|---|
| `TRANSFORMATION_FLOWS` | `EXECUTE` | run a transformation flow |
| `VIEWS` | `PERSIST` | persist a view |
| `LOCAL_TABLE` | `DELETE_DATA` | empty a local table |
| `LOCAL_TABLE` | `UPLOAD_DATA` | seen in `tasks logs list` after CSV upload |

Singular forms (`VIEW`, `TRANSFORMATION_FLOW`) and `RUN` instead of `EXECUTE`
are rejected at deploy with a bare `Failed to deploy '<name>'`. To discover an
unknown pair, add that task once in the UI and `read` the chain.

### Graph topology

- **Sequential** chains and **fan-out** (several links leaving one node) deploy.
- **Fan-in** — two or more links pointing at the *same* `endNode` — saves but
  **fails at deploy**. Model a join as a sequential step instead.
- `statusRequired`: `ANY` from `START`, `COMPLETED` between tasks.
  `FAILED` is also accepted and **does** fire the next task (validated H1);
  the chain overall status stays `FAILED` if any task failed.
- `ignoreError: true` marks the **chain** `COMPLETED` even when the task
  itself stays `FAILED` — it does **not** rewrite the task status. A follow-up
  link with `statusRequired: COMPLETED` is therefore `NOT_TRIGGERED`; use
  `statusRequired: ANY` (or `FAILED`) to continue after an ignored error
  (validated H2).
- `links[].id` must be unique within the chain.

```bash
datasphere objects task-chains create --space <ID> --file-path ./task-chain.json
datasphere tasks chains run --space <ID> --object TC_ETL_DAILY
```

Running a chain needs consent once per user: `datasphere tasks consent get` →
`give` (revocable with `revoke`).

---

## E.8 `data-access-controls`

**Dependencies:** a permissions / criteria entity (table or exposed view) that maps
**users → criteria values** (e.g. `USER_ID` + `VKORG`).  
**Template:** `objects data-access-controls read` of an existing DAC — hand-authored
DAC CSN is not validated yet (UI Create was unavailable in a probe even when roles were correct).  
**Privilege:** Create/Update/Delete needs *Data Warehouse Data Access Control*
(`CRUD----`). That privilege is on **DW Space Administrator** (scoped or global),
**not** on DW Modeler alone. See [Chapter 4](../chapters/04-users-and-roles.md#44-data-access-control-privileges).

### Permissions entity (seed — validated)

A local table + exposed view with one row per authorized user × criteria value
is enough to prepare for DAC application once the DAC object exists:

| Column | Role |
|---|---|
| `USER_ID` | Identifier (Datasphere user id, e.g. `DRYBAK`) |
| Criteria col (e.g. `VKORG`) | Values the protected object is filtered on |

Loading that table via a transformation flow: **pre-create** the target table;
use a **distinct** source; do **not** rely on cast-as-key; avoid duplicate keys
(TF upsert/`truncate` behaviour — [E.6](#e6-flows-data-flows--replication-flows--transformation-flows)).

When creating from a `read` file, keep the permissions entity definition or create
it first, then:

```bash
datasphere objects data-access-controls create --space <ID> --file-path ./dac.json
```

After applying a DAC to a view/AM, verify by **querying rows as the restricted
user** (MCP), not by Deployed status alone.

---

## E.9 Business Builder: `business-entities` / `fact-models` / `consumption-models`

**Dependencies:** source data entities / nested models as documented for each type.  
These also rely on **`businessLayerDefinitions`** (and often specific editor markers).  
`FailedToObtainObjectName` means the payload lacks Business-Builder markers — **always start from `read`**.

```bash
datasphere objects business-entities create --space <ID> --file-path ./be.json
datasphere objects fact-models create --space <ID> --file-path ./fm.json
datasphere objects consumption-models create --space <ID> --file-path ./cm.json
```

> Prefer **Analytic Models** (E.3) for new SAC consumption; Fact/Consumption Models are legacy successors.

---

## E.10 `intelligent-lookups`

**Dependencies:** input + lookup entities.  
**Template:** `objects intelligent-lookups read`.

```bash
datasphere objects intelligent-lookups create --space <ID> --file-path ./il.json
```

---

## E.11 `contexts` / `types` / `ontologies` / `services`

Usually **not** created manually. Appear when importing remotes or content packages.  
If needed: `read` an existing object and reuse that shape. CLI 2026.14 exposes these types even when older PDF tables omit them.

---

## E.12 Troubleshooting create

| Error | Cause | Fix |
|---|---|---|
| `FailedToObtainObjectName` | Wrong/missing type markers for the CLI endpoint | Match E.0–E.3 markers; for AM include `businessLayerDefinitions` + `DWCQueryModelEditor` |
| `FailedToObtainObjectName` on flows / task chains | Payload uses `definitions` | Use the type's own root key — `transformationflows` / `taskchains` (E.0 rule 2b) |
| `Failed to deploy '<name>'` on a task chain | Invalid `applicationId`/`activity` pair, or fan-in in the graph | Use a confirmed pair from E.7; replace fan-in with a sequential step |
| BOM / `Unexpected token` | UTF-8 BOM in file | Write without BOM |
| Missing dependency | Source not in space / not deployed | Create & deploy sources first; or `--allow-missing-dependencies` |
| Validation messages | Incomplete semantics | Fix CSN or `--save-anyway` (still fix before prod) |

```bash
# Raise HTTP detail (scrub tokens before sharing)
$Env:LOG_LEVEL=4
datasphere objects <type> create --space <ID> --file-path ./obj.json
```
