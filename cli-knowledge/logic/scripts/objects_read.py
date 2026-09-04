#!/usr/bin/env python3
"""Read a modeling object definition to JSON (UTF-8-safe, case-aware).

Examples:
  python objects_read.py --space <SPACE> --type data-flows --name DF_PROBE
  python objects_read.py --space <SPACE> --type views --name AV_FACT -o out.json
  python objects_read.py --space <SPACE> --type transformation-flows --list
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ds_cli import eprint, list_names, resolve_name, run_json, write_json  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--space", required=True)
    p.add_argument(
        "--type",
        required=True,
        dest="obj_type",
        help="CLI object type, e.g. views, data-flows, transformation-flows",
    )
    p.add_argument("--name", help="Technical name (case-sensitive; CI match if unique)")
    p.add_argument("--list", action="store_true", help="Only list technical names")
    p.add_argument("-o", "--output", type=Path, help="Write JSON here (default: stdout)")
    args = p.parse_args()

    if args.list or not args.name:
        names = list_names(args.obj_type, args.space)
        print(json.dumps(names, indent=2, ensure_ascii=False))
        return 0

    exact = resolve_name(args.obj_type, args.space, args.name)
    if exact != args.name:
        eprint(f"note: resolved {args.name!r} → {exact!r}")

    data = run_json(
        "objects",
        args.obj_type,
        "read",
        "--space",
        args.space,
        "--technical-name",
        exact,
    )
    if args.output:
        write_json(args.output, data)
        eprint(f"wrote {args.output}")
    else:
        print(json.dumps(data, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
