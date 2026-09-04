#!/usr/bin/env python3
"""Check whether a user can create Data Access Controls in a space.

DAC Create needs *Data Warehouse Data Access Control* — on DW Space
Administrator (scoped or global), not Modeler alone.

Examples:
  python user_dac_check.py --space <SPACE> --user <USER_ID>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ds_cli import run_json  # noqa: E402

SA_SCOPED = "Scoped_Data_Warehouse_Cloud_Space_Administrator"
SA_GLOBAL = "Data_Warehouse_Cloud_Space_Administrator"
ADMIN_GLOBAL = "Data_Warehouse_Cloud_Administrator"
DETAILS = "application/vnd.sap.datasphere.space.users.details+json"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--space", required=True)
    p.add_argument("--user", required=True, help="User id, e.g. DRYBAK")
    args = p.parse_args()
    uid = args.user.upper()

    users = run_json("users", "list", "--accept", DETAILS)
    user = next((u for u in users if str(u.get("id", "")).upper() == uid), None)
    if not user:
        print(json.dumps({"error": f"user {args.user!r} not found"}, indent=2))
        return 2

    space_users = run_json(
        "spaces", "users", "read", "--space", args.space, "--accept", DETAILS
    )
    member = next(
        (u for u in space_users if str(u.get("userName", "")).upper() == uid),
        None,
    )

    sa_users = run_json("scoped-roles", "users", "read", "--role", SA_SCOPED)
    sa_entry = next((u for u in sa_users if str(u.get("id", "")).upper() == uid), None)
    sa_scopes = (sa_entry or {}).get("scopes") or []

    global_sa = run_json("global-roles", "users", "list", "--role", SA_GLOBAL)
    global_admin = run_json("global-roles", "users", "list", "--role", ADMIN_GLOBAL)
    has_global_sa = any(str(u.get("id", "")).upper() == uid for u in global_sa)
    has_global_admin = any(str(u.get("id", "")).upper() == uid for u in global_admin)

    space_roles = [r.get("name") for r in (member or {}).get("roles", [])]
    has_scoped_sa_here = SA_SCOPED in space_roles or args.space in sa_scopes

    can_create = bool(has_scoped_sa_here or has_global_sa or has_global_admin)

    report = {
        "user": user.get("id"),
        "displayName": user.get("displayName"),
        "space": args.space,
        "inSpace": member is not None,
        "spaceRoles": space_roles,
        "isScopeAdmin": (member or {}).get("isScopeAdmin"),
        "scopedSpaceAdminScopes": sa_scopes,
        "globalSpaceAdministrator": has_global_sa,
        "globalAdministrator": has_global_admin,
        "canCreateDacExpected": can_create,
        "note": (
            "If canCreateDacExpected is true but UI Create is greyed out, "
            "cause is UI/session/context — not missing Space Admin."
            if can_create
            else "Assign Scoped Space Administrator with this space as scope "
            "(or global Space Admin / Admin)."
        ),
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if can_create else 1


if __name__ == "__main__":
    raise SystemExit(main())
