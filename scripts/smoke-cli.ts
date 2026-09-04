import { datasphereCliStatus, datasphereCliRun } from "../src/cli.js";
import { authStatus } from "../src/oauth.js";
import { getSpaceAssets, testConnection } from "../src/catalog.js";

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

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
