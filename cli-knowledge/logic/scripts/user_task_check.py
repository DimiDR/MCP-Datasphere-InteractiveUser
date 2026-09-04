#!/usr/bin/env python3
"""Check scoped Integrator assignment for tasks chains run (HTTP 403 trap).

A global Admin role alone is not enough — Integrator must be scoped to the space.
Consent is separate (``datasphere tasks consent get|give``).

Examples:
  python user_task_check.py --space <SPACE> --user <USER_ID>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ds_cli import run, run_json  # noqa: E402

INTEGRATOR = "Scoped_Data_Warehouse_Cloud_Integrator"
DETAILS = "application/vnd.sap.datasphere.space.users.details+json"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--space", required=True)
    p.add_argument("--user", required=True)
    args = p.parse_args()
    uid = args.user.upper()

    space_users = run_json(
        "spaces", "users", "read", "--space", args.space, "--accept", DETAILS
    )
    member = next(
        (u for u in space_users if str(u.get("userName", "")).upper() == uid),
        None,
    )
    space_roles = [r.get("name") for r in (member or {}).get("roles", [])]

    integ_users = run_json("scoped-roles", "users", "read", "--role", INTEGRATOR)
    entry = next((u for u in integ_users if str(u.get("id", "")).upper() == uid), None)
    scopes = (entry or {}).get("scopes") or []

    rc, consent_out, _ = run("tasks", "consent", "get", check=False)
    consent = (consent_out or "").strip()

    ok = INTEGRATOR in space_roles or args.space in scopes
    report = {
        "user": args.user,
        "space": args.space,
        "inSpace": member is not None,
        "spaceRoles": space_roles,
        "scopedIntegratorScopes": scopes,
        "canRunTasksExpected": ok,
        "consentGet": consent[:200] if consent else f"(rc={rc})",
        "note": (
            "If canRunTasksExpected is false, expect HTTP 403 empty body on "
            "tasks chains run. Add Integrator scope before users: "
            f"scoped-roles scopes add --role {INTEGRATOR} --scopes {args.space}"
            if not ok
            else "Consent still required once per user (tasks consent give)."
        ),
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
