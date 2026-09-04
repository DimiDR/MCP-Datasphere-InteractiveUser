"""Extend a 2-table Graphical View uiModel to a multi-join chain for the UI canvas."""

from __future__ import annotations

import copy
import json
import uuid
from pathlib import Path
from typing import Any


def _id() -> str:
    return str(uuid.uuid4())


def _load_harvest_uimodel(harvest_path: Path) -> dict[str, Any]:
    data = json.loads(harvest_path.read_text(encoding="utf-8"))
    cfg = data["transformationflows"]["T2_TF_C1_JOIN"]["contents"]["processes"]["viewtransform1"]["metadata"]["config"]
    return json.loads(cfg["editorSettings"]["uiModel"])


def extend_to_multi_join(
    ui: dict[str, Any],
    *,
    output_name: str,
    output_label: str,
    extra_entities: list[tuple[str, str]],
) -> dict[str, Any]:
    """Chain extra LEFT joins after the existing inner join.

    ``extra_entities`` — ``(technical_name, business_label)`` triples appended
    after the two tables already present in the harvest template.
    """
    ui = copy.deepcopy(ui)
    contents: dict[str, Any] = ui["contents"]

    model_key = next(k for k, v in contents.items() if v.get("classDefinition") == "sap.cdw.querybuilder.Model")
    model = contents[model_key]
    diagram_key = next(iter(model["diagrams"]))

    join1_key = next(k for k, v in contents.items() if v.get("classDefinition") == "sap.cdw.querybuilder.Join")
    join1 = contents[join1_key]
    proj_key = join1["successorNode"]
    proj = contents[proj_key]
    out_key = proj["successorNode"]
    out = contents[out_key]

    # Rename output nodes to the real view name.
    out["name"] = output_name
    model["name"] = output_name
    model["label"] = output_label
    model["nodes"][out_key]["name"] = output_name
    contents[out_key.replace(out_key, out_key)]  # no-op keep key

    join_keys = [join1_key]
    prev_join_key = join1_key

    # Insert additional joins between Join 1 and Projection.
    for idx, (entity_name, entity_label) in enumerate(extra_entities, start=2):
        entity_key = _id()
        join_key = _id()
        ent_sym_key = _id()
        join_sym_key = _id()
        assoc_left_key = _id()
        assoc_right_key = _id()

        contents[entity_key] = {
            "classDefinition": "sap.cdw.querybuilder.Entity",
            "name": entity_name,
            "label": entity_label,
            "type": 3,
            "isDeltaOutboundOn": False,
            "isDeletionVector": False,
            "isPinToMemoryEnabled": False,
            "isAllowConsumption": False,
            "isHiddenInUi": False,
            "modificationDate": 0,
            "deploymentDate": 0,
            "#objectStatus": "1",
            "elements": {},
            "successorNode": join_key,
        }
        contents[join_key] = {
            "classDefinition": "sap.cdw.querybuilder.Join",
            "name": f"Join {idx}",
            "mappings": {},
            "leftInput": prev_join_key,
            "rightInput": entity_key,
            "elements": {},
            "successorNode": proj_key if idx == len(extra_entities) + 1 else None,
        }
        contents[ent_sym_key] = {
            "classDefinition": "sap.cdw.querybuilder.ui.EntitySymbol",
            "_height": 55,
            "name": f"Entity Symbol {idx + 1}",
            "x": -270.99999940395355,
            "y": 25 - (idx - 1) * 105,
            "width": 160,
            "displayName": f"Entity Symbol {idx + 1}",
            "object": entity_key,
        }
        contents[join_sym_key] = {
            "classDefinition": "sap.cdw.querybuilder.ui.JoinSymbol",
            "font": 'bold 11px "72","72full",Arial,Helvetica,sans-serif',
            "x": -41.00000059604645 + (idx - 2) * 98,
            "y": -32.39446450088687,
            "object": join_key,
        }
        contents[assoc_left_key] = {
            "classDefinition": "sap.cdw.querybuilder.ui.AssociationSymbol",
            "points": f"{-110 + (idx-2)*98},-11 -76,-11 -76,-11 {-41 + (idx-2)*98},-11",
            "contentOffsetX": 5,
            "contentOffsetY": 5,
            "object": join_key,
        }
        contents[assoc_right_key] = {
            "classDefinition": "sap.cdw.querybuilder.ui.AssociationSymbol",
            "isLeftInput": False,
            "points": f"-110.99999940395355,{25 - (idx - 1) * 105 + 27.5} -76,{25 - (idx - 1) * 105 + 27.5} -76,-21 {-41 + (idx-2)*98},-21",
            "contentOffsetX": 5,
            "contentOffsetY": 5,
            "object": join_key,
        }

        model["nodes"][entity_key] = {"name": entity_name}
        model["nodes"][join_key] = {"name": f"Join {idx}"}
        diagram = contents[diagram_key]
        diagram.setdefault("symbols", {})
        diagram["symbols"][ent_sym_key] = {"name": f"Entity Symbol {idx + 1}"}
        diagram["symbols"][join_sym_key] = {}
        diagram["symbols"][assoc_left_key] = {}
        diagram["symbols"][assoc_right_key] = {}

        # Wire predecessor join to this join (not projection yet).
        contents[prev_join_key]["successorNode"] = join_key
        join_keys.append(join_key)
        prev_join_key = join_key

    # Last join feeds projection.
    contents[join_keys[-1]]["successorNode"] = proj_key

    # Move projection + output symbols further right for wider diagram.
    for k, v in contents.items():
        if v.get("classDefinition") == "sap.cdw.querybuilder.ui.RenameSymbol":
            v["x"] = v.get("x", 57) + len(extra_entities) * 98
        if v.get("classDefinition") == "sap.cdw.querybuilder.ui.OutputSymbol":
            v["x"] = v.get("x", 155) + len(extra_entities) * 98

    return ui


def build_multi_join_uimodel(
    harvest_path: Path,
    *,
    output_name: str,
    output_label: str,
    extra_entities: list[tuple[str, str]],
) -> str:
    ui = _load_harvest_uimodel(harvest_path)
    extended = extend_to_multi_join(
        ui,
        output_name=output_name,
        output_label=output_label,
        extra_entities=extra_entities,
    )
    return json.dumps(extended, ensure_ascii=False)


if __name__ == "__main__":
    harvest = Path(__file__).resolve().parent.parent / "Test2" / "C_flows" / "_harvest_tf_c1_join.json"
    print(
        build_multi_join_uimodel(
            harvest,
            output_name="T1_GV_SALES_COMPLEX",
            output_label="Complex Sales Graphical View",
            extra_entities=[
                ("T1_STG_CUSTOMER", "T1 Staging Customer"),
                ("T1_STG_MATERIAL", "T1 Staging Material"),
                ("T1_STG_SALES_ORG", "T1 Staging Sales Org"),
            ],
        )[:500]
    )
