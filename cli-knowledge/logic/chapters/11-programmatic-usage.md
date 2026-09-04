# 11 Programmatic Usage (Node.js)

In addition to the shell, `@sap/datasphere-cli` can be used as a module (CommonJS/`import` depending on project; package is ESM-based since 2025.x – Node ≥ 20).

Source: npm package `README.md`.

---

## 11.1 Loading and Executing Commands

```javascript
import datasphere from "@sap/datasphere-cli";

const HOST = "https://mytenant.eu10.hcs.cloud.sap/";
const commands = await datasphere.getCommands(HOST);

await commands["config cache init"]({
  "--host": HOST,
  "--passcode": "somepasscode", // or OAuth/secrets per setup
});

const spaces = await commands["spaces list"]({
  "--host": HOST,
});
```

- Without `host`, only general commands (cache, passcode URL, …).  
- Options as a map with `--long-name` keys (or short flags incl. `-`).

Create commands may return an object `{ command, options }` with which you can immediately follow up with `read` (see npm README examples).

---

## 11.2 Logger and Passcode Hook

```javascript
let result = [];
datasphere.configure(
  { customLogger: { output: (...args) => result.push(args) } },
  async () => "retrieved-passcode"
);
```

Since **2026.6**: no config state leak between programmatic calls (`getCommands`).

---

## 11.3 Error Handling

```javascript
try {
  await commands["spaces read"]({ "--space": "X", "--host": HOST });
} catch (err) {
  console.error(err);
}
```

Support incidents: component **DS-API-CLI**, trace with `LOG_LEVEL=6`.
