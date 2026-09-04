#!/usr/bin/env python3
"""Build T1_GV_SALES_COMPLEX — multi-join graphical view with formulas."""

from __future__ import annotations

import json
from pathlib import Path

VIEW_NAME = "T1_GV_SALES_COMPLEX"
OUT = Path(__file__).resolve().parent / f"{VIEW_NAME}.json"
HARVEST = Path(__file__).resolve().parent.parent / "Test2" / "C_flows" / "_harvest_tf_c1_join.json"


def col(alias: str, name: str, *, key: bool = False, as_name: str | None = None) -> dict:
    item = {"ref": [alias, name]}
    if key:
        item["key"] = True
    if as_name:
        item["as"] = as_name
    return item


def ref(name: str) -> dict:
    return {"ref": [name]}


def join_on(left_a: str, left_c: str, right_a: str, right_c: str) -> list:
    return [col(left_a, left_c), "=", col(right_a, right_c)]


def build_join_from() -> dict:
    hdr = {"ref": ["T1_STG_ORDER_HDR"], "as": "H"}
    itm = {"ref": ["T1_STG_ORDER_ITM"], "as": "I"}
    cust = {"ref": ["T1_STG_CUSTOMER"], "as": "C"}
    mat = {"ref": ["T1_STG_MATERIAL"], "as": "M"}
    org = {"ref": ["T1_STG_SALES_ORG"], "as": "S"}

    hi = {
        "join": "inner",
        "args": [hdr, itm],
        "on": join_on("H", "VBELN", "I", "VBELN"),
    }
    hic = {
        "join": "left",
        "args": [hi, cust],
        "on": join_on("H", "KUNNR", "C", "KUNNR"),
    }
    hicm = {
        "join": "left",
        "args": [hic, mat],
        "on": join_on("I", "MATNR", "M", "MATNR"),
    }
    return {
        "join": "left",
        "args": [hicm, org],
        "on": join_on("H", "VKORG", "S", "VKORG"),
    }


def inner_columns() -> list[dict]:
    return [
        col("H", "VBELN", key=True, as_name="VBELN"),
        col("I", "POSNR", key=True, as_name="POSNR"),
        col("H", "KUNNR", as_name="KUNNR"),
        col("C", "NAME1", as_name="NAME1"),
        col("C", "LAND1", as_name="LAND1"),
        col("C", "ORT01", as_name="ORT01"),
        col("C", "BRANCHE", as_name="BRANCHE"),
        col("H", "VKORG", as_name="VKORG"),
        col("S", "VTEXT", as_name="VTEXT"),
        col("I", "MATNR", as_name="MATNR"),
        col("M", "MAKTX", as_name="MAKTX"),
        col("M", "MATKL", as_name="MATKL"),
        col("H", "AUDAT", as_name="AUDAT"),
        col("I", "MENGE", as_name="MENGE"),
        col("I", "NETWR", as_name="NETWR"),
        col("I", "WAERK", as_name="WAERK"),
        col("H", "SRC_SYSTEM", as_name="SRC_SYSTEM"),
    ]


def outer_columns() -> list[dict]:
    return [
        ref("VBELN") | {"key": True},
        ref("POSNR") | {"key": True},
        {
            "func": "COALESCE",
            "args": [ref("KUNNR"), {"val": "#"}],
            "cast": {"type": "cds.String", "length": 10},
            "as": "KUNNR",
        },
        {
            "func": "COALESCE",
            "args": [ref("NAME1"), {"val": "Unbekannter Kunde"}],
            "cast": {"type": "cds.String", "length": 100},
            "as": "CUSTOMER_NAME",
        },
        {
            "func": "COALESCE",
            "args": [ref("LAND1"), {"val": "##"}],
            "cast": {"type": "cds.String", "length": 3},
            "as": "CUSTOMER_COUNTRY",
        },
        {
            "func": "COALESCE",
            "args": [ref("ORT01"), {"val": "UNKNOWN"}],
            "cast": {"type": "cds.String", "length": 40},
            "as": "CUSTOMER_CITY",
        },
        ref("VKORG"),
        {
            "func": "COALESCE",
            "args": [ref("VTEXT"), {"val": "Unbekannte VKORG"}],
            "cast": {"type": "cds.String", "length": 40},
            "as": "SALES_ORG_NAME",
        },
        ref("MATNR"),
        {
            "func": "COALESCE",
            "args": [ref("MAKTX"), {"val": "Unbekanntes Material"}],
            "cast": {"type": "cds.String", "length": 100},
            "as": "MATERIAL_TEXT",
        },
        {
            "xpr": [
                "case",
                ref("MATKL"),
                "when",
                {"val": "001"},
                "then",
                {"val": "Metall"},
                "when",
                {"val": "002"},
                "then",
                {"val": "Maschinen"},
                "else",
                {"val": "Sonstige"},
                "end",
            ],
            "cast": {"type": "cds.String", "length": 20},
            "as": "MATERIAL_SEGMENT",
        },
        ref("AUDAT"),
        ref("MENGE"),
        ref("NETWR"),
        ref("WAERK"),
        {
            "xpr": [
                "case",
                "when",
                ref("MENGE"),
                "<>",
                {"val": 0},
                "then",
                {"xpr": [ref("NETWR"), "/", ref("MENGE")]},
                "else",
                {"val": 0},
                "end",
            ],
            "cast": {"type": "cds.Decimal", "precision": 15, "scale": 4},
            "as": "UNIT_PRICE",
        },
        {
            "xpr": [
                ref("NETWR"),
                "*",
                {
                    "xpr": [
                        "case",
                        ref("WAERK"),
                        "when",
                        {"val": "EUR"},
                        "then",
                        {"val": 1},
                        "when",
                        {"val": "USD"},
                        "then",
                        {"val": 0.92},
                        "when",
                        {"val": "CHF"},
                        "then",
                        {"val": 1.05},
                        "when",
                        {"val": "GBP"},
                        "then",
                        {"val": 1.17},
                        "else",
                        {"val": 1},
                        "end",
                    ]
                },
            ],
            "cast": {"type": "cds.Decimal", "precision": 15, "scale": 2},
            "as": "NET_AMOUNT_EUR",
        },
        {
            "xpr": [
                "SUM",
                "(",
                ref("NETWR"),
                ")",
                "OVER",
                "(",
                "PARTITION",
                "BY",
                ref("VBELN"),
                ")",
            ],
            "cast": {"type": "cds.Decimal", "precision": 15, "scale": 2},
            "as": "DOC_NET_TOTAL",
        },
        {
            "xpr": [
                "case",
                "when",
                {
                    "xpr": [
                        "SUM",
                        "(",
                        ref("NETWR"),
                        ")",
                        "OVER",
                        "(",
                        "PARTITION",
                        "BY",
                        ref("VBELN"),
                        ")",
                    ]
                },
                "<>",
                {"val": 0},
                "then",
                {
                    "xpr": [
                        ref("NETWR"),
                        "*",
                        {"val": 100},
                        "/",
                        {
                            "xpr": [
                                "SUM",
                                "(",
                                ref("NETWR"),
                                ")",
                                "OVER",
                                "(",
                                "PARTITION",
                                "BY",
                                ref("VBELN"),
                                ")",
                            ]
                        },
                    ]
                },
                "else",
                {"val": 0},
                "end",
            ],
            "cast": {"type": "cds.Decimal", "precision": 9, "scale": 4},
            "as": "ITEM_SHARE_PCT",
        },
        {
            "xpr": [
                "case",
                "when",
                ref("NETWR"),
                ">=",
                {"val": 10000},
                "then",
                {"val": "A"},
                "when",
                ref("NETWR"),
                ">=",
                {"val": 1000},
                "then",
                {"val": "B"},
                "else",
                {"val": "C"},
                "end",
            ],
            "cast": {"type": "cds.String", "length": 1},
            "as": "ABC_CLASS",
        },
        {
            "xpr": [
                "case",
                "when",
                ref("LAND1"),
                "is",
                "null",
                "or",
                {"func": "TRIM", "args": [ref("LAND1")]},
                "=",
                {"val": ""},
                "then",
                {"val": 1},
                "else",
                {"val": 0},
                "end",
            ],
            "cast": {"type": "cds.Integer"},
            "as": "DQ_MISSING_COUNTRY",
        },
        {
            "xpr": [
                "case",
                "when",
                ref("NAME1"),
                "is",
                "null",
                "or",
                {"func": "TRIM", "args": [ref("NAME1")]},
                "=",
                {"val": ""},
                "then",
                {"val": 1},
                "else",
                {"val": 0},
                "end",
            ],
            "cast": {"type": "cds.Integer"},
            "as": "DQ_MISSING_NAME",
        },
        {
            "xpr": [
                {"val": 100},
                "-",
                "(",
                {
                    "xpr": [
                        "case",
                        "when",
                        ref("LAND1"),
                        "is",
                        "null",
                        "or",
                        {"func": "TRIM", "args": [ref("LAND1")]},
                        "=",
                        {"val": ""},
                        "then",
                        {"val": 1},
                        "else",
                        {"val": 0},
                        "end",
                    ]
                },
                "*",
                {"val": 30},
                "+",
                {
                    "xpr": [
                        "case",
                        "when",
                        ref("NAME1"),
                        "is",
                        "null",
                        "or",
                        {"func": "TRIM", "args": [ref("NAME1")]},
                        "=",
                        {"val": ""},
                        "then",
                        {"val": 1},
                        "else",
                        {"val": 0},
                        "end",
                    ]
                },
                "*",
                {"val": 30},
                "+",
                {
                    "xpr": [
                        "case",
                        "when",
                        ref("MENGE"),
                        "<=",
                        {"val": 0},
                        "then",
                        {"val": 1},
                        "else",
                        {"val": 0},
                        "end",
                    ]
                },
                "*",
                {"val": 20},
                ")",
            ],
            "cast": {"type": "cds.Integer"},
            "as": "DQ_SCORE",
        },
        ref("SRC_SYSTEM"),
    ]


def elements() -> dict:
    return {
        "VBELN": {"type": "cds.String", "length": 10, "key": True, "notNull": True, "@EndUserText.label": "Sales Document"},
        "POSNR": {"type": "cds.String", "length": 6, "key": True, "notNull": True, "@EndUserText.label": "Item"},
        "KUNNR": {"type": "cds.String", "length": 10, "@EndUserText.label": "Customer"},
        "CUSTOMER_NAME": {"type": "cds.String", "length": 100, "@EndUserText.label": "Customer Name"},
        "CUSTOMER_COUNTRY": {"type": "cds.String", "length": 3, "@EndUserText.label": "Customer Country"},
        "CUSTOMER_CITY": {"type": "cds.String", "length": 40, "@EndUserText.label": "Customer City"},
        "VKORG": {"type": "cds.String", "length": 4, "@EndUserText.label": "Sales Organization"},
        "SALES_ORG_NAME": {"type": "cds.String", "length": 40, "@EndUserText.label": "Sales Org Name"},
        "MATNR": {"type": "cds.String", "length": 40, "@EndUserText.label": "Material"},
        "MATERIAL_TEXT": {"type": "cds.String", "length": 100, "@EndUserText.label": "Material Text"},
        "MATERIAL_SEGMENT": {"type": "cds.String", "length": 20, "@EndUserText.label": "Material Segment"},
        "AUDAT": {"type": "cds.Date", "@EndUserText.label": "Document Date"},
        "MENGE": {"type": "cds.Decimal", "precision": 13, "scale": 3, "@EndUserText.label": "Quantity"},
        "NETWR": {"type": "cds.Decimal", "precision": 15, "scale": 2, "@EndUserText.label": "Net Value"},
        "WAERK": {"type": "cds.String", "length": 5, "@EndUserText.label": "Currency"},
        "UNIT_PRICE": {"type": "cds.Decimal", "precision": 15, "scale": 4, "@EndUserText.label": "Unit Price"},
        "NET_AMOUNT_EUR": {"type": "cds.Decimal", "precision": 15, "scale": 2, "@EndUserText.label": "Net Value (EUR)"},
        "DOC_NET_TOTAL": {"type": "cds.Decimal", "precision": 15, "scale": 2, "@EndUserText.label": "Document Net Total"},
        "ITEM_SHARE_PCT": {"type": "cds.Decimal", "precision": 9, "scale": 4, "@EndUserText.label": "Item Share %"},
        "ABC_CLASS": {"type": "cds.String", "length": 1, "@EndUserText.label": "ABC Class"},
        "DQ_MISSING_COUNTRY": {"type": "cds.Integer", "@EndUserText.label": "DQ Missing Country"},
        "DQ_MISSING_NAME": {"type": "cds.Integer", "@EndUserText.label": "DQ Missing Name"},
        "DQ_SCORE": {"type": "cds.Integer", "@EndUserText.label": "Data Quality Score"},
        "SRC_SYSTEM": {"type": "cds.String", "length": 10, "@EndUserText.label": "Source System"},
    }


def load_ui_model() -> str | None:
    if not HARVEST.is_file():
        return None
    from uimodel_extend_joins import build_multi_join_uimodel

    return build_multi_join_uimodel(
        HARVEST,
        output_name=VIEW_NAME,
        output_label="Complex Sales Graphical View (CLI Test)",
        extra_entities=[
            ("T1_STG_CUSTOMER", "T1 Staging Customer"),
            ("T1_STG_MATERIAL", "T1 Staging Material"),
            ("T1_STG_SALES_ORG", "T1 Staging Sales Org"),
        ],
    )


def build_payload() -> dict:
    definition = {
        "kind": "entity",
        "@EndUserText.label": "Complex Sales Graphical View (CLI Test)",
        "@ObjectModel.modelingPattern": {"#": "DATA_STRUCTURE"},
        "@ObjectModel.supportedCapabilities": [{"#": "DATA_STRUCTURE"}],
        "@DataWarehouse.consumption.external": True,
        "elements": elements(),
        "query": {
            "SELECT": {
                "from": {
                    "SELECT": {
                        "from": build_join_from(),
                        "columns": inner_columns(),
                    },
                    "as": "Join 1",
                },
                "columns": outer_columns(),
            }
        },
    }
    editor = {
        "editor": {
            "lastModifier": "GRAPHICALVIEWBUILDER",
            "default": "GRAPHICALVIEWBUILDER",
        }
    }
    ui = load_ui_model()
    if ui:
        editor["uiModel"] = ui
    return {
        "definitions": {VIEW_NAME: definition},
        "editorSettings": {VIEW_NAME: editor},
    }


if __name__ == "__main__":
    payload = build_payload()
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
