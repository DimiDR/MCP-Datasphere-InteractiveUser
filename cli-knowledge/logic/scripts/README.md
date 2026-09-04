# Skill scripts — Datasphere CLI helpers

Portable helpers for agents and operators. No secrets, no hardcoded space
(except examples). Require `datasphere` on `PATH` and an active CLI login.

```bash
cd .cursor/skills/datasphere-cli/scripts
python objects_read.py --space <SPACE> --type data-flows --list
```

| Script | Purpose |
|---|---|
| [`ds_cli.py`](ds_cli.py) | Shared UTF-8 CLI runner (import only) |
| [`objects_read.py`](objects_read.py) | `list` / `read` → JSON (case-aware) |
| [`objects_redeploy.py`](objects_redeploy.py) | delete + create (prefer over unreliable `update`) |
| [`create_graphical_view.py`](create_graphical_view.py) | Inner-join Graphical View CSN + `objects views create` |
| [`sweep_analytics.py`](sweep_analytics.py) | Silent defects on views + AMs |
| [`user_dac_check.py`](user_dac_check.py) | Can this user create DACs in a space? |
| [`user_task_check.py`](user_task_check.py) | Scoped Integrator + consent hint (403 trap) |

## Agent habits

1. After creating/changing views or AMs: `python sweep_analytics.py --space <ID>`
2. Before inventing flow/DAC CSN: `objects_read.py --type … --name … -o harvest.json`
3. View `query` changes: `objects_redeploy.py` (not `update`)
4. Grey DAC / 403 on chain run: `user_dac_check.py` / `user_task_check.py`

Row reads stay on **MCP** — these scripts are design-time CLI only.

Findings: [../validated-findings.md](../validated-findings.md)
