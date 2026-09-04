# 10 SAP Catalog

Command: `datasphere catalog` – **new compared to PDF guide 2026.02**.

Installs/uninstalls data products from the SAP Catalog into a consumer space, typically via a **UCL shared connection** and an **ORD ID**.

Flags: [Appendix A](../appendices/A-command-reference.md).

---

## 10.1 Commands

```bash
datasphere catalog data-products install \
  --space <CONSUMER_SPACE> \
  --system-connection <UCL_TECHNICAL_NAME> \
  --api-resource-ord-id <ORD_ID>

datasphere catalog data-products uninstall \
  --space <CONSUMER_SPACE> \
  --system-connection <UCL_TECHNICAL_NAME> \
  --api-resource-ord-id <ORD_ID>
```

| Option | Meaning |
|---|---|
| `-y, --space` | Technical name of the consumer space |
| `-S, --system-connection` | UCL shared connection |
| `-f, --api-resource-ord-id` | Data product API resource ORD ID |

All three options are marked optional in help; in practice they are required for a complete install.

---

## 10.2 Preparation

1. UCL connection visible:  
   `datasphere configuration system-connections list`
2. Authorize for spaces:  
   `datasphere configuration system-connections authorize --technical-name … --spaces …`
3. Install as above

---

## 10.3 Distinction from Marketplace

| | Marketplace | Catalog |
|---|---|---|
| Command | `marketplace products install` | `catalog data-products install` |
| Context | Data Marketplace / provider | SAP Catalog / ORD + UCL |
| Typical IDs | Product/provider IDs | `api-resource-ord-id`, system-connection |
