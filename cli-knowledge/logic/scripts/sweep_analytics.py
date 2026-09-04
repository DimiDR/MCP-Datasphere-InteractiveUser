#!/usr/bin/env python3
"""Consistency sweep: silent defects on views and analytic models.

Checks (object may still be Deployed):
  - missing CSN ``query`` block
  - ``@Aggregation.default`` without ``@AnalyticsDetails.measureType``
  - broken associations / mixin / FK annotations
  - AM measure/attribute/dimension wiring + ``usedForDimensionSourceKey``

Usage:
  python sweep_analytics.py --space <SPACE>
Exit 1 if any defect.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ds_cli import list_names, run_json  # noqa: E402

problems: list[str] = []


def bad(obj: str, msg: str) -> None:
    problems.append(f"{obj}: {msg}")


def elements(views: dict, name: str) -> dict:
    return views.get(name, {}).get("elements", {})


def associations(view: dict) -> dict:
    return {
        c: s
        for c, s in view.get("elements", {}).items()
        if s.get("type") == "cds.Association"
    }


def on_columns(spec: dict):
    refs = [t["ref"] for t in spec.get("on", []) if isinstance(t, dict) and "ref" in t]
    if len(refs) != 2:
        return None, None
    return refs[0][-1], refs[1][-1]


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--space", required=True)
    args = p.parse_args()
    space = args.space

    view_names = list_names("views", space)
    am_names = list_names("analytic-models", space)
    views = {
        n: run_json("objects", "views", "read", "--space", space, "--technical-name", n)[
            "definitions"
        ][n]
        for n in view_names
    }
    print(f"{space}: {len(views)} views, {len(am_names)} analytic models")

    for name, view in views.items():
        select = view.get("query", {}).get("SELECT")
        if not select:
            bad(name, "no CSN query block - deploys but returns 0 rows")
            select = {}

        for col, spec in view.get("elements", {}).items():
            if (
                "@Aggregation.default" in spec
                and "@AnalyticsDetails.measureType" not in spec
            ):
                bad(name, f"{col} has @Aggregation.default but no measureType")

        mixin = select.get("mixin", {})
        projected = {
            c["ref"][0]
            for c in select.get("columns", [])
            if len(c.get("ref", [])) == 1
        }

        for assoc, spec in associations(view).items():
            target = spec.get("target")
            if target not in views:
                bad(name, f"association {assoc} targets unknown view {target}")
                continue
            left, right = on_columns(spec)
            if left not in view["elements"]:
                bad(
                    name,
                    f"association {assoc} joins on {left}, which the view has no column for",
                )
            if right not in elements(views, target):
                bad(
                    name,
                    f"association {assoc} joins to {target}.{right}, which does not exist",
                )
            elif not elements(views, target)[right].get("key"):
                bad(
                    name,
                    f"association {assoc} joins to {target}.{right}, which is not a key",
                )
            if assoc not in mixin:
                bad(name, f"association {assoc} missing from query.SELECT.mixin")
            if assoc not in projected:
                bad(name, f"association {assoc} not selected in the projection")
            fk = view["elements"].get(left, {}).get(
                "@ObjectModel.foreignKey.association"
            )
            if not fk:
                bad(name, f"{left} lacks @ObjectModel.foreignKey.association for {assoc}")
            elif fk.get("=") != assoc:
                bad(name, f"{left} foreign key points at {fk.get('=')}, not {assoc}")

    for name in am_names:
        doc = run_json(
            "objects",
            "analytic-models",
            "read",
            "--space",
            space,
            "--technical-name",
            name,
        )
        am = doc["definitions"][name]
        bl = doc.get("businessLayerDefinitions", {}).get(name, {})
        source = bl.get("sourceModel", {})

        facts = list(source.get("factSources", {}))
        if len(facts) != 1:
            bad(name, f"expected exactly one fact source, found {facts}")
            continue
        fact = facts[0]
        if fact not in views:
            bad(name, f"fact source {fact} does not exist")
            continue
        fact_cols = elements(views, fact)
        fact_assocs = associations(views[fact])

        for attr, spec in bl.get("attributes", {}).items():
            if spec.get("attributeType", "").endswith("FactSourceAttribute"):
                col = spec.get("attributeMapping", {}).get(fact, {}).get("key")
                if col not in fact_cols:
                    bad(name, f"attribute {attr} maps to {fact}.{col}, which does not exist")

        for measure, spec in bl.get("measures", {}).items():
            col = spec.get("measureMapping", {}).get(fact, {}).get("key")
            if col not in fact_cols:
                bad(name, f"measure {measure} maps to {fact}.{col}, which does not exist")
            elif "@AnalyticsDetails.measureType" not in fact_cols[col]:
                bad(
                    name,
                    f"measure {measure} maps to {fact}.{col}, which is not a measure",
                )

        dims = source.get("dimensionSources", {})
        for key, spec in dims.items():
            dim = spec.get("dataEntity", {}).get("key")
            if dim not in views:
                bad(name, f"dimensionSource {key} points at unknown view {dim}")
                continue
            for ctx in spec.get("associationContexts", []):
                if ctx.get("sourceKey") != fact:
                    bad(
                        name,
                        f"dimensionSource {key} has associationContext on "
                        f"{ctx.get('sourceKey')}, not the fact {fact}",
                    )
                for step in ctx.get("associationSteps", []):
                    if step not in fact_assocs:
                        bad(
                            name,
                            f"dimensionSource {key} uses association {step}, "
                            f"which {fact} does not have",
                        )
                    elif fact_assocs[step].get("target") != dim:
                        bad(
                            name,
                            f"dimensionSource {key} uses {step}, which targets "
                            f"{fact_assocs[step].get('target')} not {dim}",
                        )

            am_assoc = None
            fk_col = None
            for n, e in am.get("elements", {}).items():
                if e.get("type") == "cds.Association" and e.get("target") == dim:
                    am_assoc, fk_col = n, e.get("on", [{}])[0].get("ref", [None])[0]
                    break
            if not fk_col:
                bad(name, f"dimensionSource {key}: no AM association targeting {dim}")
            else:
                if spec.get("text") != fk_col:
                    bad(
                        name,
                        f"dimensionSource {key}.text is {spec.get('text')!r}, "
                        f"expected FK column {fk_col!r}",
                    )
                attr = bl.get("attributes", {}).get(fk_col)
                if not attr or not attr.get("attributeType", "").endswith(
                    "FactSourceAttribute"
                ):
                    bad(
                        name,
                        f"dimensionSource {key}: missing FactSourceAttribute {fk_col}",
                    )
                else:
                    if attr.get("text") != fk_col:
                        bad(
                            name,
                            f"attribute {fk_col}.text is {attr.get('text')!r}, "
                            f"expected {fk_col!r}",
                        )
                    if attr.get("usedForDimensionSourceKey") != key:
                        bad(
                            name,
                            f"attribute {fk_col} usedForDimensionSourceKey is "
                            f"{attr.get('usedForDimensionSourceKey')!r}, expected {key!r}",
                        )
                fk_ann = am.get("elements", {}).get(fk_col, {}).get(
                    "@ObjectModel.foreignKey.association"
                )
                if not fk_ann or fk_ann.get("=") != am_assoc:
                    bad(
                        name,
                        f"{fk_col} lacks AM @ObjectModel.foreignKey.association "
                        f"pointing at {am_assoc}",
                    )

        for attr, spec in bl.get("attributes", {}).items():
            if not spec.get("attributeType", "").endswith("DimensionSourceAttribute"):
                continue
            dim = dims.get(spec.get("sourceKey"), {}).get("dataEntity", {}).get("key")
            if dim is None:
                bad(
                    name,
                    f"attribute {attr} references unknown sourceKey {spec.get('sourceKey')}",
                )
            elif spec.get("key") not in elements(views, dim):
                bad(
                    name,
                    f"attribute {attr} reads {dim}.{spec.get('key')}, which does not exist",
                )

        am_mixin = am.get("query", {}).get("SELECT", {}).get("mixin", {})
        for col, spec in am.get("elements", {}).items():
            ref = spec.get("@Analytics.navigationAttributeRef")
            if not ref:
                continue
            assoc, column = ref[0], ref[-1]
            if assoc not in am_mixin:
                bad(name, f"{col} navigates via {assoc}, which is not in the model's mixin")
                continue
            target = am_mixin[assoc].get("target")
            if column not in elements(views, target):
                bad(name, f"{col} navigates to {target}.{column}, which does not exist")

    print()
    if problems:
        for item in problems:
            print("  DEFECT", item)
        print(f"\n{len(problems)} defect(s)")
        return 1
    print("no defects")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
