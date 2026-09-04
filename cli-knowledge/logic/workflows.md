# Datasphere CLI – workflows

Open cited files from this skill’s `chapters/` and `appendices/` only.

## A – Establish session

1. [chapters/02-installation-and-authentication.md](chapters/02-installation-and-authentication.md) + project `README.md`
2. `datasphere --version`
3. `datasphere login --options-file ds-options.json --force`
4. `datasphere spaces list`
5. Do not paste secrets into chat

## B – Space create / update

1. [chapters/05-spaces-dbusers-workload.md](chapters/05-spaces-dbusers-workload.md)
2. [appendices/B-space-definition-format.md](appendices/B-space-definition-format.md)
3. `datasphere spaces create --file-path …` or `spaces save`
4. Async → [chapters/08-tasks-job-status.md](chapters/08-tasks-job-status.md) (`job-status`)

## C – Modeling object

1. [chapters/07-modeling-objects.md](chapters/07-modeling-objects.md)
2. Prefer `objects <type> read` as template; else [appendices/E-object-definition-formats.md](appendices/E-object-definition-formats.md) / [examples/](examples/)
3. Flags: `--help` or Grep appendix A
4. Do not web-search for CSN shapes already covered by E/examples

## D – Connection

1. [chapters/06-connections-certificates-ucl.md](chapters/06-connections-certificates-ucl.md)
2. Grep [appendices/C-connection-definition-formats.md](appendices/C-connection-definition-formats.md)
3. `spaces connections create` → `validate`

## E – Task / replication flow

1. [chapters/08-tasks-job-status.md](chapters/08-tasks-job-status.md)
2. Consent → run/pause/resume → logs

## F – Catalog data product

1. [chapters/10-catalog.md](chapters/10-catalog.md)
2. UCL authorize: chapter 03 if needed
3. `catalog data-products install …`

## G – Marketplace

1. [chapters/09-data-marketplace.md](chapters/09-data-marketplace.md)
2. [appendices/D-marketplace-definition-formats.md](appendices/D-marketplace-definition-formats.md)
3. Not the same as Catalog (F)

## On failure

1. [chapters/12-troubleshooting-and-best-practices.md](chapters/12-troubleshooting-and-best-practices.md)
2. [validated-findings.md](validated-findings.md)
3. Optional `$Env:LOG_LEVEL=6` — scrub secrets before sharing

## H – Helper scripts (fast path)

From `.cursor/skills/datasphere-cli/scripts/` ([README](scripts/README.md)):

| Goal | Command |
|---|---|
| Harvest CSN | `python objects_read.py --space <ID> --type <type> --name <NAME> -o harvest.json` |
| Redeploy view/table | `python objects_redeploy.py --space <ID> --type views --file ./x.json --name <NAME>` |
| Silent AM/view defects | `python sweep_analytics.py --space <ID>` |
| DAC privilege | `python user_dac_check.py --space <ID> --user <UID>` |
| Task 403 / Integrator | `python user_task_check.py --space <ID> --user <UID>` |
