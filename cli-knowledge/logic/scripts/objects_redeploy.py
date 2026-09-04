#!/usr/bin/env python3
"""Delete + create a modeling object (reliable redeploy).

``objects … update`` merges and often will not restore a missing ``query`` block
or drop elements. Prefer this script over update when replacing a definition.

Examples:
  python objects_redeploy.py --space <SPACE> --type views --file ./view.json --name V_STAGING
  python objects_redeploy.py --space <SPACE> --type local-tables --file ./t.json --name T_FACT --no-delete
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ds_cli import eprint, run  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--space", required=True)
    p.add_argument("--type", required=True, dest="obj_type")
    p.add_argument("--file", required=True, type=Path, help="CSN/JSON payload")
    p.add_argument(
        "--name",
        required=True,
        help="Technical name for delete (must match payload key)",
    )
    p.add_argument(
        "--no-delete",
        action="store_true",
        help="Skip delete (create only; fails if object exists)",
    )
    args = p.parse_args()

    if not args.file.is_file():
        raise SystemExit(f"file not found: {args.file}")

    if not args.no_delete:
        rc, out, err = run(
            "objects",
            args.obj_type,
            "delete",
            "--space",
            args.space,
            "--technical-name",
            args.name,
            "--force",
            "--delete-anyway",
            check=False,
        )
        eprint(f"delete rc={rc}: {(out or err).strip()[:300] or '(empty)'}")

    rc, out, err = run(
        "objects",
        args.obj_type,
        "create",
        "--space",
        args.space,
        "--file-path",
        str(args.file.resolve()),
        check=False,
    )
    msg = (out + err).strip()
    if rc != 0:
        eprint(f"create FAILED rc={rc}\n{msg}")
        return rc
    eprint(f"create OK\n{msg[:500]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
