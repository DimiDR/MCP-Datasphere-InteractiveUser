"""Shared Datasphere CLI helpers for skill scripts.

Windows: never use ``subprocess`` ``text=True`` — it decodes with cp1252 and
mangles UTF-8 (association separator U+221E becomes ``âˆž``).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


def run(
    *args: str,
    check: bool = True,
    cwd: str | Path | None = None,
) -> tuple[int, str, str]:
    """Run ``datasphere …``. Returns ``(returncode, stdout, stderr)`` as UTF-8."""
    cmd = ["datasphere", *args]
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        shell=(os.name == "nt"),
    )
    out = proc.stdout.decode("utf-8", errors="replace")
    err = proc.stderr.decode("utf-8", errors="replace")
    if check and proc.returncode != 0:
        raise RuntimeError(
            f"CLI failed ({proc.returncode}): {' '.join(cmd)}\n{out}\n{err}"
        )
    return proc.returncode, out, err


def run_json(*args: str, **kwargs: Any) -> Any:
    """Like ``run``, but parse stdout as JSON."""
    _, out, _ = run(*args, **kwargs)
    return json.loads(out)


def list_names(obj_type: str, space: str) -> list[str]:
    rows = run_json("objects", obj_type, "list", "--space", space)
    return [r["technicalName"] for r in rows]


def resolve_name(obj_type: str, space: str, name: str) -> str:
    """Return the exact technical name (case-sensitive). Prefer exact, else unique CI match."""
    names = list_names(obj_type, space)
    if name in names:
        return name
    matches = [n for n in names if n.lower() == name.lower()]
    if len(matches) == 1:
        return matches[0]
    if not matches:
        raise SystemExit(
            f"No {obj_type} named {name!r} in {space}. "
            f"Listed: {', '.join(names) or '(none)'}"
        )
    raise SystemExit(
        f"Ambiguous name {name!r}; matches: {', '.join(matches)}"
    )


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)
