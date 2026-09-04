#!/usr/bin/env python3
"""Create a Graphical View (inner join) via the Datasphere CLI.

Builds the CSN payload (``query`` + optional ``editorSettings``) and runs
``datasphere objects views create``. See Appendix E.2.6 in the datasphere-cli skill.

Examples:
  python create_graphical_view.py --space DIMITRITEST --name T1_GV_TEST \\
    --left T1_STG_ORDER_HDR --right T1_STG_ORDER_ITM \\
    --join VBELN=VBELN --out ./T1_GV_TEST.json --deploy

  python create_graphical_view.py --space DIMITRITEST --from-file ./Billing_export.json \\
    --name Billing --deploy
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from ds_cli import run, write_json  # noqa: E402

# Re-use MCP builder when available (same repo layout)
def _repo_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "Test2" / "C_flows" / "_harvest_tf_c1_join.json").is_file():
            return parent
    return Path(__file__).resolve().parents[4]


REPO_ROOT = _repo_root()
MCP_SRC = REPO_ROOT / "sap-datasphere-mcp" / "src"
HARVEST_TEMPLATE = REPO_ROOT / "Test2" / "C_flows" / "_harvest_tf_c1_join.json"
if MCP_SRC.is_dir() and str(MCP_SRC) not in sys.path:
    sys.path.insert(0, str(MCP_SRC))

try:
    from sap_datasphere_mcp.view_csn_builder import build_inner_join_view_payload
except ImportError:
    build_inner_join_view_payload = None  # type: ignore[misc, assignment]


DEFAULT_ORDER_JOIN = {
    "columns": [
        ("left", "VBELN", "VBELN", True),
        ("left", "KUNNR", "KUNNR", False),
        ("left", "VKORG", "VKORG", False),
        ("left", "AUDAT", "AUDAT", False),
        ("left", "AUART", "AUART", False),
        ("left", "WAERK", "WAERK", False),
        ("left", "NETWR_HDR", "NETWR_HDR", False),
        ("left", "SRC_SYSTEM", "SRC_SYSTEM", False),
        ("right", "POSNR", "POSNR", True),
        ("right", "MATNR", "MATNR", False),
        ("right", "MENGE", "MENGE", False),
        ("right", "VRKME", "VRKME", False),
        ("right", "NETWR", "NETWR", False),
    ],
    "elements": {
        "VBELN": {"@EndUserText.label": "Sales Document", "type": "cds.String", "length": 10, "key": True, "notNull": True},
        "KUNNR": {"@EndUserText.label": "Sold-to Party", "type": "cds.String", "length": 10},
        "VKORG": {"@EndUserText.label": "Sales Organization", "type": "cds.String", "length": 4},
        "AUDAT": {"@EndUserText.label": "Document Date", "type": "cds.Date"},
        "AUART": {"@EndUserText.label": "Sales Document Type", "type": "cds.String", "length": 4},
        "WAERK": {"@EndUserText.label": "Document Currency", "type": "cds.String", "length": 5},
        "NETWR_HDR": {"@EndUserText.label": "Net Value Header", "type": "cds.Decimal", "precision": 15, "scale": 2},
        "SRC_SYSTEM": {"@EndUserText.label": "Source System", "type": "cds.String", "length": 10},
        "POSNR": {"@EndUserText.label": "Item", "type": "cds.String", "length": 6, "key": True, "notNull": True},
        "MATNR": {"@EndUserText.label": "Material Number", "type": "cds.String", "length": 40},
        "MENGE": {"@EndUserText.label": "Order Quantity", "type": "cds.Decimal", "precision": 13, "scale": 3},
        "VRKME": {"@EndUserText.label": "Sales Unit", "type": "cds.String", "length": 3},
        "NETWR": {"@EndUserText.label": "Net Value", "type": "cds.Decimal", "precision": 15, "scale": 2},
    },
}


def parse_join_pairs(raw: list[str]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for item in raw:
        if "=" not in item:
            raise SystemExit(f"Invalid --join {item!r}; expected LEFT=RIGHT")
        left, right = item.split("=", 1)
        pairs.append((left.strip(), right.strip()))
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a Graphical View via datasphere CLI")
    parser.add_argument("--space", required=True)
    parser.add_argument("--name", required=True, help="Technical view name")
    parser.add_argument("--left", help="Left source table/view")
    parser.add_argument("--right", help="Right source table/view")
    parser.add_argument("--join", action="append", default=[], help="Join key LEFT=RIGHT (repeatable)")
    parser.add_argument("--label", help="Business label")
    parser.add_argument("--from-file", type=Path, help="Use full CSN JSON (UI export / objects views read)")
    parser.add_argument("--ui-model-template", type=Path, help="Clone uiModel from a UI export")
    parser.add_argument("--no-editor-settings", action="store_true")
    parser.add_argument("--no-consumption", action="store_true")
    parser.add_argument("--out", type=Path, help="Write CSN JSON without deploying")
    parser.add_argument("--deploy", action="store_true", help="Deploy after create (default when not --out only)")
    parser.add_argument("--no-deploy", action="store_true")
    args = parser.parse_args()

    if args.from_file:
        payload = json.loads(args.from_file.read_text(encoding="utf-8"))
        if args.name not in payload.get("definitions", {}):
            raise SystemExit(f"--name {args.name!r} not found in definitions of {args.from_file}")
    else:
        if not build_inner_join_view_payload:
            raise SystemExit("sap_datasphere_mcp.view_csn_builder not importable; use --from-file")
        if not args.left or not args.right:
            raise SystemExit("--left and --right are required unless --from-file is set")
        join_keys = parse_join_pairs(args.join) if args.join else [("VBELN", "VBELN")]
        preset = DEFAULT_ORDER_JOIN
        payload = build_inner_join_view_payload(
            args.name,
            args.left,
            args.right,
            join_keys,
            preset["columns"],
            preset["elements"],
            label=args.label or args.name,
            expose_for_consumption=not args.no_consumption,
            include_editor_settings=not args.no_editor_settings,
            ui_model_template=args.ui_model_template or (HARVEST_TEMPLATE if HARVEST_TEMPLATE.is_file() else None),
        )

    out_path = args.out or Path(f"{args.name}.json")
    write_json(out_path, payload)
    print(f"Wrote {out_path}")

    if args.out and not args.deploy:
        return

    deploy = not args.no_deploy
    cli_args = ["objects", "views", "create", "--space", args.space, "--file-path", str(out_path)]
    if not deploy:
        cli_args.append("--no-deploy")
    code, stdout, stderr = run(*cli_args, check=False)
    print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    if code != 0:
        raise SystemExit(code)
    print(f"OK: view {args.name} in {args.space}")


if __name__ == "__main__":
    main()
