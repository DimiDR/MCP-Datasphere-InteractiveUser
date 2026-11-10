import { datasphereCliStatus, datasphereCliRun } from "../src/cli.js";
import { authStatus } from "../src/oauth.js";
import { getSpaceAssets, testConnection } from "../src/catalog.js";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

/** Exercise the compiled MCP through its real stdio protocol, without tenant mutations. */
async function smokeTables() {
  const client = new Client({ name: "table-inventory-smoke", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("../dist/index.js", import.meta.url))],
    stderr: "pipe",
  });
  try {
    await client.connect(transport);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === "list_table_names"));
    const names = new Set<string>();
    let skip = 0;
    let total: number | undefined;
    do {
      const response = await client.callTool({ name: "list_table_names", arguments: { skip, top: 200 } }, undefined, { timeout: 600_000 });
      assert.ok(!response.isError, JSON.stringify(response));
      const content = response.content as { type: string; text?: string }[];
      const page = JSON.parse(content.find((item) => item.type === "text")!.text!);
      assert.equal(page.enumeration_complete, true);
      if (total !== undefined) assert.equal(page.total_count, total, "Inventory changed during smoke test");
      total = page.total_count;
      for (const row of page.value) {
        const key = `${row.space_id}/${row.type}/${row.technical_name}`;
        assert.ok(!names.has(key), "Duplicate table across pages");
        names.add(key);
      }
      console.log("TABLE_PAGE", JSON.stringify({ total_count: total, spaces: page.spaces,
        skip, returned_count: page.returned_count, has_more: page.has_more, next_skip: page.next_skip }));
      if (!page.has_more) break;
      assert.ok(page.next_skip > skip);
      skip = page.next_skip;
    } while (true);
    assert.equal(names.size, total);
    console.log("TABLE_INVENTORY_OK", names.size);
  } finally {
    await client.close();
  }
}

async function main() {
  console.log("AUTH", JSON.stringify(authStatus()));

  const status = await datasphereCliStatus();
  console.log(
    "CLI_STATUS",
    JSON.stringify(
      {
        cli_available: status.cli_available,
        version: status.version,
        mcp_authenticated: status.mcp_authenticated,
        notes: status.notes,
      },
      null,
      2,
    ),
  );

  try {
    await datasphereCliRun({ args: ["login"] });
    console.log("LOGIN_BLOCK_UNEXPECTED");
  } catch (e) {
    console.log("LOGIN_BLOCKED_OK", (e as Error).message.slice(0, 160));
  }

  const spaces = await datasphereCliRun({
    args: ["spaces", "list"],
    timeoutSeconds: 180,
  });
  console.log(
    "SPACES_LIST",
    JSON.stringify({
      ok: spaces.ok,
      exit_code: spaces.exit_code,
      timed_out: spaces.timed_out,
      stdout_len: spaces.stdout.length,
      stderr_head: spaces.stderr.slice(0, 400),
      stdout_head: spaces.stdout.slice(0, 500),
    }),
  );

  const views = await datasphereCliRun({
    args: ["objects", "views", "list", "--space", "DIMITRITEST"],
    timeoutSeconds: 180,
  });
  console.log(
    "VIEWS_LIST",
    JSON.stringify({
      ok: views.ok,
      exit_code: views.exit_code,
      timed_out: views.timed_out,
      stdout_len: views.stdout.length,
      stderr_head: views.stderr.slice(0, 400),
      stdout_head: views.stdout.slice(0, 600),
    }),
  );

  const conn = await testConnection();
  console.log("TEST_CONN", JSON.stringify(conn).slice(0, 400));

  const assets = await getSpaceAssets("DIMITRITEST", { top: 5 });
  console.log("ASSETS", JSON.stringify(assets).slice(0, 600));
}

(process.argv.includes("--tables") ? smokeTables() : main()).catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
