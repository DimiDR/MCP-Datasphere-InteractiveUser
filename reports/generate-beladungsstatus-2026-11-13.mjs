import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
import { getSpaceRunsInWindow } from "../dist/monitoring.js";
import { datasphereCliRun } from "../dist/cli.js";

// Enumerate all four design-time object types through the guarded CLI.
// The REST replication-flow list can return fewer objects than the CLI inventory.
const objectIds = [];
for (const type of ["replication-flows", "task-chains", "transformation-flows", "data-flows"]) {
  for (let skip = 0; ; ) {
    const page = await datasphereCliRun({ args: ["objects", type, "list", "--space", "SP_1B_01", "--top", "200", "--skip", String(skip)] });
    assert.ok(page.ok, page.stderr);
    const parsed = JSON.parse(page.stdout);
    const rows = Array.isArray(parsed) ? parsed : parsed.value;
    assert.ok(Array.isArray(rows));
    objectIds.push(...rows.map((row) => typeof row === "string" ? row : row.technicalName ?? row.name));
    const count = page.list_page?.raw_count ?? rows.length;
    console.log(JSON.stringify({type,skip,count}));
    if (count < 200) break;
    skip += count;
  }
}
assert.ok(objectIds.every((id) => typeof id === "string"));

const reportPath = new URL("./Beladungsstatus-2026-11-13.md", import.meta.url);
const result = await getSpaceRunsInWindow({
  spaceId: "SP_1B_01",
  date: "2026-11-13",
  timeZone: "Europe/Berlin",
  objectIds: [...new Set(objectIds)],
  details: "problems",
  maxRuns: 1000,
});
const cell = (value) => String(value ?? "—").replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
const badge = (status) => status === "COMPLETED" ? "🟢 COMPLETED" : status === "RUNNING" ? "🔵 RUNNING" : status === "FAILED" ? "🔴 FAILED" : `🟠 ${status}`;
const failed = result.runs.filter((run) => run.status === "FAILED");
const active = result.runs.filter((run) => run.status === "RUNNING");
const other = result.runs.filter((run) => !["COMPLETED", "RUNNING", "FAILED"].includes(run.status));
const complete = !result.errors.length && !result.runs_truncated && !result.objects_truncated;
const lines = [
  "# Datasphere – Beladungsstatus vom 13.11.2026",
  "",
  `- **Space:** \`${result.space_id}\` (einziger durch die Space-Abfrage zurückgegebener Space).`,
  "- **Zeitzone:** Europe/Berlin (UTC+01:00).",
  "- **Zeitraum:** 13.11.2026, 00:00 Uhr bis 14.11.2026, 00:00 Uhr; Ergebnisstand ist der Abfragezeitpunkt, keine Prognose für den restlichen Tag.",
  `- **Abfragezeitpunkt (UTC):** ${result.queried_at}`,
  "- **Umfang:** Replikationsflüsse, Task Chains, Transformation Flows und Data Flows; zugängliche Objekte und verfügbare Task-Log-Historie.",
  `- **Geprüfte Objekte:** ${result.objects_checked}`,
  `- **Erfasste Läufe:** ${result.runs_in_window}; davon im Bericht: ${result.returned_runs}.`,
  `- **Vollständigkeit innerhalb dieses Abfrageumfangs:** ${complete ? "Keine Abfragefehler oder Mengenbegrenzungen gemeldet." : "Eingeschränkt; siehe Hinweise unten."}`,
  "",
  "## Zusammenfassung",
  "",
  "| Status | Anzahl Läufe |",
  "| --- | ---: |",
  ...Object.entries(result.status_counts).map(([status, count]) => `| ${badge(status)} | ${count} |`),
  "",
  "## Rote / fehlgeschlagene Läufe",
  "",
  failed.length ? `**${failed.length} fehlgeschlagene Läufe gefunden.**` : complete ? "**Keine fehlgeschlagenen Läufe (FAILED) gefunden.**" : "Keine fehlgeschlagenen Läufe in den verfügbaren Ergebnissen; eine vollständige Entwarnung ist wegen der Abfrageeinschränkungen nicht möglich.",
  ...failed.flatMap((run) => ["", `### ${cell(run.object_id)} – Log ${run.log_id}`, ...(run.messages ?? []).map((message) => `- ${cell(message.severity)}: ${cell(message.text)}`), ...(run.detail_error ? [`- Detailabfrage fehlgeschlagen: ${cell(run.detail_error)}`] : [])]),
  "",
  "## Noch laufende Beladungen / Task Chains",
  "",
  "| Objekt | Log-ID | Start (Europe/Berlin) | Status |",
  "| --- | ---: | --- | --- |",
  ...active.map((run) => `| ${cell(run.object_id)} | ${run.log_id} | ${cell(run.start_local)} | ${badge(run.status)} |`),
  "",
  "## Weitere auffällige Status",
  "",
  ...(other.length ? other.map((run) => `- ${cell(run.object_id)} (Log ${run.log_id}): ${badge(run.status)}; ${cell(JSON.stringify(run.messages ?? []))}`) : ["Keine weiteren Status außerhalb COMPLETED und RUNNING gefunden."]),
  "",
  "## Alle erfassten Läufe",
  "",
  "Neueste Startzeit zuerst. Zeiten in Europe/Berlin. Fehlendes Ende bedeutet: kein Endzeitpunkt geliefert.",
  "",
  "| Objekt | Typ | Log-ID | Status | Start | Ende | Laufzeit (Sekunden) |",
  "| --- | --- | ---: | --- | --- | --- | ---: |",
  ...result.runs.map((run) => `| ${cell(run.object_id)} | ${cell(run.application_id)} | ${run.log_id} | ${badge(run.status)} | ${cell(run.start_local)} | ${cell(run.end_local)} | ${cell(run.runtime_seconds)} |`),
  "",
  "## Hinweise und Grenzen",
  "",
  "- Enthalten sind alle zurückgegebenen Läufe, die den heutigen Tag überlappen, einschließlich gestern gestarteter Läufe.",
  "- Task Chains und deren einzelne Beladungsläufe sind separate Log-Einträge; die Gesamtzahl ist daher keine Anzahl unterschiedlicher Tabellen oder unabhängiger Beladungen.",
  "- RUNNING ist nicht als Fehler gewertet. Längere Laufzeiten allein belegen keinen Fehler.",
  "- Der Bericht bewertet Task-Log-Status, nicht historische Datensatz-/Partitionsmetriken oder rote Einzelobjekte innerhalb eines noch laufenden Replikationsflusses. Geladene Datensatzanzahlen sind nicht Teil dieser Abfrage.",
  "- Andere nicht zugängliche Spaces sowie Objekttypen außerhalb des genannten Umfangs (z. B. View-Persistenz) sind nicht geprüft.",
  ...(result.runs_truncated ? ["- Laufliste durch das Abfragelimit gekürzt."] : []),
  ...(result.objects_truncated ? ["- Objektinventar durch das Abfragelimit gekürzt."] : []),
  ...result.runs.filter((run) => run.status_note).map((run) => `- ${cell(run.object_id)} / Log ${run.log_id}: ${cell(run.status_note)}`),
  "",
  "### Abfragefehler",
  "",
  ...(result.errors.length ? result.errors.map((error) => `- ${cell(error.object_type ?? error.object_id)}: ${cell(error.error)}`) : ["Keine Abfragefehler gemeldet."]),
  "",
];
await writeFile(reportPath, lines.join("\n"), "utf8");
const saved = await readFile(reportPath, "utf8");
assert.equal(saved, lines.join("\n"));
assert.equal(result.runs.length, result.returned_runs);
assert.equal(Object.values(result.status_counts).reduce((sum, count) => sum + count, 0), result.runs_in_window);
assert.equal(saved.split("\n").filter((line) => /^\| .* \| (REPLICATION_FLOWS|TASK_CHAINS|TRANSFORMATION_FLOWS|DATA_FLOWS) \|/.test(line)).length, result.returned_runs);
console.log(JSON.stringify({ report: reportPath.pathname, queried_at: result.queried_at, objects_checked: result.objects_checked, status_counts: result.status_counts, returned_runs: result.returned_runs, errors: result.errors, complete, running: active.map((run) => ({ object: run.object_id, log: run.log_id, start: run.start_local })), verified: true }, null, 2));