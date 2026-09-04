# 9 Data Marketplace

Command: `datasphere marketplace …`  
Roles: typically DW Modeler (+ provider/sharing permissions).  
Definition formats: [Appendix D](../appendices/D-marketplace-definition-formats.md).  
Flags: [Appendix A](../appendices/A-command-reference.md).

---

## 9.1 Structure

```
marketplace
  providers                 # provider profiles
  products                  # products (consumer/tenant view)
  products-by-provider      # products in provider context
  licenses-by-provider
  releases
  contexts-by-provider
```

> **Do not confuse** with `catalog` ([Chapter 10](10-catalog.md)) – different installation path (ORD/UCL).

---

## 9.2 Providers

```bash
datasphere marketplace providers list
datasphere marketplace providers create --file-path ./provider.json
datasphere marketplace providers read …
datasphere marketplace providers update …      # partial properties
datasphere marketplace providers overwrite …   # all properties
datasphere marketplace providers keys …        # activation keys
```

Region/industry/category enums: Appendix D / PDF 6.1.

---

## 9.3 Products

```bash
datasphere marketplace products list
datasphere marketplace products create --file-path ./product.json
datasphere marketplace products read|update|overwrite|delete …
datasphere marketplace products change-lifecycle-status …
datasphere marketplace products install …
```

Typical lifecycle: Draft → Listed / Delisted / Deactivated (details in Appendix D).

Provider context:

```bash
datasphere marketplace products-by-provider …
```

---

## 9.4 Licenses, Releases, Contexts

```bash
datasphere marketplace licenses-by-provider …
datasphere marketplace releases …              # update/lock; creation often cockpit-only
datasphere marketplace contexts-by-provider …  # visibility public/private/internal
```

Per guide: releases can be updated via CLI but **cannot be newly created** – use Data Sharing Cockpit for that.

---

## 9.5 Technical User

Marketplace commands are among those usable with OAuth purpose **Technical User** (alongside tasks, objects, certificates, spaces connections).
