# Appendix D – Marketplace Definition Formats

Adapted from the SAP guide (PDF 2026.02, Ch. 6.1–6.5).
Commands: `datasphere marketplace …` — see [Chapter 9](../chapters/09-data-marketplace.md).
Catalog (ORD/UCL) is separate: [Chapter 10](../chapters/10-catalog.md).


---
# 6 Managing the Data Marketplace via the Command Line

*(Pages 78–158 of the original PDF, split across multiple files)* — Part of the series [Accessing SAP Datasphere via the Command Line](../README.md)

Users with the *Modeler* role can use the `datasphere` command-line interface to manage the data marketplace.

> ℹ️ **Note**
> The SAP Datasphere command-line interface module was renamed from `dwc` to `datasphere`. The `dwc` command was retired at the end of 2023; use the new `datasphere` command instead.

This chapter covers the following topics:

- **6.1 Managing Data Providers in the Data Marketplace from the Command Line** *(this file, pages 78-96)*
- 6.2 Managing data products on the data marketplace using the command line → see Data Products section (below)
- 6.3 Managing data marketplace licenses, 6.4 Releases, 6.5 Contexts → see section Licenses/Releases/Contexts (below)

---

## 6.1 Managing Data Providers on the Data Marketplace via the Command Line

You can use the SAP Datasphere `datasphere` command-line interface to manage data providers on the data marketplace. This includes updating properties (for example, contact email addresses or visibility) in batch mode. You can also list all data providers a user has access to.

This topic contains the following sections:

- `datasphere marketplace providers list`
- `datasphere marketplace providers read`
- `datasphere marketplace providers create`
- `datasphere marketplace providers overwrite`
- `datasphere marketplace providers update`

**Prerequisites**

To manage data providers via the command line, you need a scoped application role that grants you access to a space with the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *Data Builder in the Data Warehouse* (`CRUD----`) – to create, edit, and delete data providers.
- *Spaces* (`-RU-----`) – to change space properties.

The *DW Space Administrator* role template, for example, grants these permissions. More information can be found under *Permissions and Rights* and *Standard Roles Delivered with SAP Datasphere*.

Additionally, the following is required (installation + sign-in, see Chapter 2).

To browse the available commands:

```
datasphere marketplace providers
```

To access a data provider, the user must be a member of the data provider profile. If a `contentAggregatorID` is specified as a parameter, only data provider profiles managed by that content aggregator are returned.

### datasphere marketplace providers list

Returns a simplified list of all data providers the current user has access to.

```
datasphere marketplace providers list
```

If you want a detailed view of a specific data provider, use the `read` command.

| Parameters | Description |
|---|---|
| `--accept <accept>` | Format in which the content should be returned. Options: `application/vnd.sap.marketplace.providers.list+json` *(Default)*, `application/vnd.sap.marketplace.providers.details+json` |

### datasphere marketplace providers read

Reads the metadata of a specific data provider after its UUID or content aggregator UUID has been specified.

```
datasphere marketplace providers read
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID. Options: <br>• Specify the UUID of the data provider or content aggregator.<br>• Specify the content aggregator UUID and a content aggregator provider ID (`contentAggregatorProviderID`) separated by a colon. Example: `List["0b0dfe8e-f974-407d-8987-6d863b2c5e83", "f97dfe8e-f9a4-4d2d-8187-ed863bdc5e88:rubix-b2b-risk-assessment-amp-monitoring-solutions-all-cou-rubix-data-sciences"]` |

### datasphere marketplace providers create

Creates a new data provider or a new managed data provider (managed by a content aggregator) based on a configuration according to the file format of the data provider definition and is saved as a `.json` file. For more information, see [6.1.1 The data provider definition file format](#611-the-data-provider-definition-file-format).

```
datasphere marketplace providers create
```

Specify the full path to the `.json` input file, e.g. `C:\temp\mydataproviderdefinition.json`.

To create a managed data provider, specify the `contentAggregatorID` in the request body.

> ℹ️ **Note**
> Managed providers can only be created if you are a member of the assigned content aggregator profile.

| Parameters | Description |
|---|---|
| `--file-path <path>` | Enter a path to a file with a `.json` extension that contains your data provider definition. |
| `--input <input>` | *[Optional]* Specifies the input to be used for the command as a string. |

### datasphere marketplace providers overwrite

```
datasphere marketplace providers overwrite
```

> ℹ️ **Note**
> If you only want to update specific properties, use the `update` command.

Overwrites all properties of the specified data provider with the provided data in `Description`.

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data provider definition. |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above under `read`). |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace providers update

Updates only selected properties of the specified data provider that are defined in the provided data provider definition file.

```
datasphere marketplace providers update
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data provider definition. |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above under `read`). |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace providers keys generate

Generates activation keys for a specific data provider.

```
datasphere marketplace providers keys generate
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing the keys. |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above under `read`). |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace providers keys list

Returns a list of all existing activation keys for a specific data provider.

```
datasphere marketplace providers keys list
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see options above under `read`). |

### datasphere marketplace providers keys delete

Deletes the activation key for a specific data provider.

```
datasphere marketplace providers keys delete
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing the keys. |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above under `read`). |
| `--input <input>` | *[Optional]* Input as a string. |

---

## 6.1.1 The Data Provider Definition File Format

The properties of a data provider definition are set and retrieved in the data provider definition file format and saved as a `.json` file.

A data provider definition file cannot exceed **25 MB**.

### Data Provider Properties

Users with the *DW Modeler* role can set data provider definitions using the following syntax:

```json
{
  "name": "<string>",
  "contentAggregatorProviderID": "<string>",
  "logo": "<object>",
  "description": "<string>",
  "homepageUrl": "<string>",
  "linkedinUrl": "<string>",
  "regionalCoverages": [
    "<string>",
    "<string>", ...
  ],
  "dataCategories": [
    "<string>",
    "<string>", ...
  ],
  "industries": [
    "<string>",
    "<string>", ...
  ],
  "sapApplications": [
    "<string>",
    "<string>", ...
  ],
  "contactEmail": "<string>",
  "sapEmail": "<string>",
  "country_code": "<contry code>",
  "zipCode": "<string>",
  "city": "<string>",
  "address1": "<string>",
  "address2": "<string>",
  "phoneNumber": "<string>",
  "shipments": [
    "Direct|External|OpenSql"
  ],
  "marketplaceVisibilities": [
    "public|private|internal"
  ]
}
```

The parameters are set as follows:

| Technical Parameters | Corresponding Name in Data Sharing Cockpit | Description |
|---|---|---|
| `<name>` | *Name* | The name of the data provider. |
| `<logo>` | *Company Logo* | The logo of the data provider company. Must be provided as an object with a maximum of 5000 characters, encoded in Base64. Supported MIME types: `bmp`, `svg+xml`, `gif`, `jpeg`, `png`, `tiff`. |
| `<description>` | *Description* | Information about the data provider: the products offered, the advertising promise and the vision. |
| `<homepageUrl>` | *Homepage URL* | The URL of the data provider's homepage. |
| `<linkedinUrl>` | *LinkedIn* | The URL to the data provider's LinkedIn profile. |
| `<regionalCoverages>` | *Regional Coverage* | String values ​​for each region to which the data applies. Multiple values ​​possible. Complete list of values (extract of the most important ones): `Global`, `Europe`, `North America`, `South America`, `Central America`, `Asia`, `Africa`, plus all individual country names according to ISO (e.g. `Germany`, `France`, `United States`, `China`, `Brazil`, `India`, `Japan`, `United Kingdom, Australia, Canada, Mexico, Russia Federation, South Africa, Switzerland, etc. - complete list of approximately 250 countries/territories in the world). |
| `<dataCategories>` | *Data Category* | Coded values ​​for each data category. Several values possible: `C001 - Benchmarking Data`, `C011 - Company Data`, `C021 - Countries, Regions & Cities Data`, `C031 - Culture & Sports Data`, `C041 - Environmental & Weather Data`, `C051 - Finance & Economy Data`, `C061 - Geospatial Data`, `C071 - Health Data`, `C081 - Hospitality, Travel & Tourism Data", `C171 - Product & Services Data`, `C181 - Public Sector & Society Data`, `C191 - Science & Technology Data`, `C201 - Social Media, News & Communication Data`, `C206 - Sustainability Data`, `C211 - Transport & Logistics Data`, `C221 - Web, IoT & Device Data`, `C231 - Other Data Categories`. |
| `<industries>` | *Industry* | String values ​​for each industry to which the data applies. Multiple values possible, including: `All Industries`, `Energy and Natural Resources` (with subcategories `Building Products`, `Chemicals`, `Mill Products`, `Mining`, `Oil and Gas`, `Utilities`), `Financial Services` (`Banking`, `Insurance`), `Consumer Industries` (`Agribusiness`, `Consumer Products`, 'Fashion', 'Life Sciences', 'Retail', 'Wholesale Distribution'), 'Discrete Industries' ('Aerospace and Defense', 'Automotive', 'High Tech', 'Industrial Machinery and Components'), 'Service Industries' ('Airlines', 'Engineering, Construction, and Operations', 'Media', 'Professional Services', 'Railways', 'Sports' & Entertainment, Telecommunications, Travel and Transportation), Public Services (Defense and Security, Future Cities, Healthcare, Higher Education and Research, Public Sector). |
| `<sapApplications>` | *SAP Application* | String values ​​for each SAP application to which the data applies. Multiple values possible, including: `HR & People Engagement` (`Employee in HR and People Engagements`, `Employee Experience Management`, `Core HR and Payroll`, `Talent Management`, `HR Analytics and Workforce Planning`), `CRM and Customer Experience` (`Customer Data`, `Marketing`, `Commerce`, `Sales`, `Service`), `ERP & Finance` (`SAP S/4HANA, 'ERP for Small and Midsize Enterprises', 'Financial Planning and Analysis', 'Accounting and Financial Close', 'Treasury Management', 'Accounts Receivable', 'Billing & Revenue Management', 'Cybersecurity, Governance, Risk & Compliance'), 'Network & Spend Management' ('Supplier Management', 'Strategic Sourcing', 'Procurement', 'Services Procurement and Contingent Workforce', 'Selling and Fulfillment', 'Travel and Expense', 'Business Technology Platform' ('Database and Data Management', 'Application Development and Integration', 'Analytics', 'Intelligent Technologies'), 'Digital Supply Chain' ('Supply Chain Planning', 'Supply Chain Logistics', 'Manufacturing', 'R&D / Engineering, Asset Management), Experience Management (Brand Experience, Customer Experience, Product Experience, Employee Experience). |
| `<contactEmail>` | *Email* | Email address to which all contact from the customer will be sent when the customer uses the *Contact Provider* button on the Data Provider page. |
| `<sapEmail>` | *SAP Email* | Email address for internal communication between the data provider and SAP to receive login information from your data marketplace system. This email is for internal use and will not be shown to customers. |
| `<country_code>` | *Country* | The country where the data provider is located. |
| `<zipCode>` | *ZIP Code* | The postal code of the data provider. |
| `<city>` | *City* | The location as part of the address. |
| `<address1>` | *First Address* | The business address of the data provider. |
| `<address2>` | *Second Address* | A second business address if required. |
| `<phoneNumber>` | *Phone Number* | A business phone number where customers can reach the data provider. |
| `<shipments>` | *Data Transfer* | The transfer types that the data provider supports: `<Direct>`, `<External>`, `<OpenSql>`. |
| `<marketplaceVisibilities>` | *Marketplace Visibility* | The visibility of the data provider's profile on the data marketplace: <br>• `<public>` - The profile and data products are visible to everyone in the *Public Data Marketplace* context owned by SAP.<br>• `<private>` - The data provider can create and participate in contexts of the type "Private Data Products", "Private Data Exchange" or "Data Shop". The profile is only visible to users who are members of the data provider's contexts.<br>• `<internal>` - Internal visibility of the data provider profile is a prerequisite for linking or creating internal contexts. An internal context is intended for data products that should only be visible within a company. |

For example, the following file creates a new data provider definition:

```json
{
  "name": "Example Provider",
  "contentAggregatorProviderID": "string",
  "logo": "image object",
  "description": "Lorem Ipsum description of my Provider",
  "homepageUrl": "www.mydataprovidercompany.com",
  "linkedinUrl": "www.linkedin.com/mydataprovidercompany",
  "regionalCoverages": [
    "Germany",
    "France"
  ],
  "dataCategories": [
    "C001",
    "C031"
  ],
  "industries": [
    "Financial Services",
    "Energy and Natural Ressources"
  ],
  "sapApplications": [
    "HR & People Engagement",
    "ERP & Finance"
  ],
  "contactEmail": "max.user@companymail.com",
  "sapEmail": "max.user@sap.com",
  "country_code": "DE",
  "zipCode": "12345",
  "city": "Walldorf",
  "address1": "Dietmar-Hopp Allee 16",
  "address2": "Address 2",
  "phoneNumber": "+40(0) 151 123456",
  "shipments": [
    "OpenSql"
  ],
  "marketplaceVisibilities": [
    "public"
  ]
}
```

Use `.json` file format to save the data product definition. It is needed for the upload, e.g. Part of the `create` command.

> ℹ️ **Note**
> You need to remove the empty properties from the `.json` file because empty properties cause an error (`422 Unprocessable Entities`).

For more information about data provider profiles, see *Maintaining your data provider profile* in the data provider guide.


---

# 6.2 Managing Data Products on the Data Marketplace via the Command Line

*(Pages 97–127 of the original PDF)* — Part of the series [Accessing SAP Datasphere via the Command Line](../README.md). Previous part: Section 6.1 in this file.

You can use the SAP Datasphere `datasphere` command line interface to manage and organize data products in the data marketplace. This includes creating batches, updating properties such as price information, status or context mapping, and deleting. You can also list all data products that belong to a specific data provider.

**Prerequisites**

To manage data products from the command line, you need an application space role that gives you access to a space with the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *Data Builder in the Data Warehouse* (`CRUD----`) – to create, edit, and delete data products.

The *DW Modeler* role template, for example, grants these permissions. More information can be found under *Permissions and Rights* and *Standard Roles Delivered with SAP Datasphere*.

Additionally, the following is required (installation + sign-in, see Chapter 2).

To browse the available commands:

```
datasphere marketplace products
```

In environments where you manage data products for multiple providers, you can use the following command:

```
datasphere marketplace products-by-provider
```

> ℹ️ **Note**
> New releases of data products cannot be created via the command line. To do this, you must use the Data Sharing Cockpit (see *The Data Sharing Cockpit*).

### datasphere marketplace products list

Returns a simple list of all existing data products associated with your user.

```
datasphere marketplace products list
```

All data products from all data providers and content aggregators of which you are a member are listed.

| Parameters | Description |
|---|---|
| `--accept <accept>` | Format in which the content should be returned. Options: `application/vnd.sap.marketplace.providers.list+json` *(Default)*, `application/vnd.sap.marketplace.providers.details+json` |

### datasphere marketplace products read

Lists the properties of a single data product. You must provide the data product UUID.

```
datasphere marketplace products read
```

Use the `list` command to get all available UUIDs.

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. You can use the `datasphere marketplace products list` command to find the available data products and get their UUIDs. |

### datasphere marketplace products create

Creates a new data product based on a configuration according to the file format of the data product definition and is saved as a `.json` file. For more information, see [6.2.1 The data product definition file format](#621-the-data-product-definition-file-format).

```
datasphere marketplace products create
```

Specify the full path to the `.json` input file, e.g. `C:\temp\mydataproductdefinition.json`.

The new data product is created with the status “Draft”. You can change the status via the `change-lifecycle-status` command.

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data product definition. Alternatively `--file-path Filename.json`. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace products overwrite

Overwrites all properties of the specified data product with the provided data in the data product definition file.

```
datasphere marketplace products overwrite
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data product definition. Alternatively `--file-path Filename.json`. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |

Specify the full path to the `.json` input file, e.g. `C:\temp\mydataproductdefinition.json`.

> ℹ️ **Note**
> If you only want to update specific properties, use the `update` command.

### datasphere marketplace products update

Updates only selected properties of the specified data product that are defined in the provided data product definition file. You must provide the data product UUID.

```
datasphere marketplace products update
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data product definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |

### datasphere marketplace products install

Installs a data product for a user after verifying the following:

- The user has a valid license (if the data product is not a free data product).
- The product status is "Listed".
- The transfer type is either Direct or Integrated Delivery.
- The user must belong to the context associated with the data product. If a user does not have the required context membership to trigger the installation, a 404 error is returned.

```
datasphere marketplace products install
```

| Parameters | Description |
|---|---|
| `--space-id <space-id>` | Space ID: the technical name of the space. Example: `"MY_SPACE_1"` |
| `--license-key <license-key>` | License key UUID. Optional: If the data product is a licensed product, this parameter is required. |
| `--update-type <update-type>` | Optional parameter to specify whether the data product should be updated automatically and immediately ("Immediate") or manually ("Manual", default value). |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |

### datasphere marketplace products change-lifecycle-status

Use this command to change the lifecycle state of a data product. The status “Draft” is automatically set for a newly created data product.

```
datasphere marketplace products change-lifecycle-status
```

Select one of the following statuses from the list:

- Listed
- Delisted
- Disabled

Then provide the data product UUID.

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |
| `--lifecycle-status <lifecycle-status>` | New lifecycle status. |

### datasphere marketplace products delete

Deletes an existing data product.

```
datasphere marketplace products delete
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |

Confirm that the data product should really be deleted.

### datasphere marketplace products-by-provider list

Returns a list of data products from a specific data provider.

```
datasphere marketplace products-by-provider list
```

| Parameters | Description |
|---|---|
| `--accept <accept>` | Format in which the content should be returned: `application/vnd.sap.marketplace.providers.list+json` *(Default)*, `application/vnd.sap.marketplace.providers.details+json` |
| `--provider-identifier <provider-identifier>` | Provider ID. Options: <br>• UUID of the data provider or content aggregator.<br>• UUID of the content aggregator and content aggregator provider ID (`contentAggregatorProviderID`) separated by colon. Example: `List["0b0dfe8e-f974-407d-8987-6d863b2c5e83", "f97dfe8e-f9a4-4d2d-8187-ed863bdc5e88:rubix-b2b-risk-assessment-amp-monitoring-solutions-all-cou-rubix-data-sciences"]` |

### datasphere marketplace products-by-provider read

Lists the properties of a single data product. You must provide the technical ID and the data provider UUID or the content aggregator UUID.

```
datasphere marketplace products-by-provider read
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |

### datasphere marketplace products-by-provider create

Creates a new data product for a specified data provider based on a configuration according to the data product definition file format and is saved as a `.json` file. For more information, see [6.2.1 The data product definition file format](#621-the-data-product-definition-file-format).

```
datasphere marketplace products-by-provider create
```

Specify the full path to the `.json` input file, e.g. `C:\temp\mydataproductdefinition.json`.

The new data product is created with the status “Draft”. You can change the status via the `change-lifecycle-status` command.

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data product definition. Alternatively `--file-path Filename.json`. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above). |

### datasphere marketplace products-by-provider delete

Deletes an existing data product from a specified data provider.

```
datasphere marketplace products-by-provider delete
```

Confirm that the data product should really be deleted.

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above). |

### datasphere marketplace products-by-provider overwrite

Overwrites all properties of the specified data product with the provided data in the data product definition file.

```
datasphere marketplace products-by-provider overwrite
```

> ℹ️ **Note**
> If you only want to update specific properties, use the `update` command.

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above). |
| `--file-path <path>` | Path to a file with the `.json` extension containing your data product definition. Alternatively `--file-path Filename.json`. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace products-by-provider update

Updates only selected properties of the specified data product that are defined in the provided data product definition file.

```
datasphere marketplace products-by-provider update
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your data product definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above). |

### datasphere marketplace products-by-provider change-lifecycle-status

Use this command to change the lifecycle state of a data product. The status “Draft” is automatically set for a newly created data product.

```
datasphere marketplace products-by-provider change-lifecycle-status
```

Select one of the following statuses from the list: Listed, Delisted, Deactivated. Then provide the data product UUID.

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `list`). |
| `--lifecycle-status <lifecycle-status>` | New lifecycle status. |
| `--provider-identifier <provider-identifier>` | Provider ID (see options above). |

---

## 6.2.1 The Data Product Definition File Format

Properties of a data product are set and retrieved in space definition file format and saved as a `.json` file.

A data product definition file cannot exceed **25 MB**.

### Data Product Properties

Users with the *DW Modeler* role can create data products and set any data product properties using the following syntax:

```json
{
  "dataProviderProductID": "<string>",
  "contentAggregatorProductID": "<string>",
  "name": "<string>",
  "description": "<string>",
  "space": "<string>",
  "pricingModel": "OneTime|Monthly",
  "pricingDescription": "<string>",
  "price": "<number>",
  "pricePerMonth": "<number>",
  "priceCurrencyCode": "<string>",
  "licenseKeyUrl": "<URL>",
  "regionalCoverages": ["<string>", "<string>", "..."],
  "dataCategories": ["<string>", "<string>", "..."],
  "industries": ["<string>", "<string>", "..."],
  "sapApplications": ["<string>", "<string>", "..."],
  "shipments": ["OpenSql|External|Direct"],
  "productArtifacts": [
    {
      "name": "<string>",
      "dataFilter": "<string>",
      "columns": [
        { "name": "<string>" }
      ]
    }
  ],
  "dataDocumentation": [
    {
      "name": "<string>",
      "description": "<string>",
      "blobData": "<string>",
      "mimeType": "pptx|ppt|doc|htm|html|pdf|xls|xlsx"
    }
  ],
  "additionalDataDocumentation": [
    {
      "name": "<string>",
      "description": "<string>",
      "blobData": "<string>",
      "mimeType": "pptx|ppt|doc|htm|html|pdf|xls|xlsx"
    }
  ],
  "sampleBlobs": [
    {
      "name": "<string>",
      "description": "<string>",
      "blobData": "<string>",
      "mimeType": "json"
    }
  ],
  "images": [
    {
      "name": "<string>",
      "description": "<string>",
      "blobData": "<string>",
      "mimeType": "bmp|svg|gif|jfif|jpe|jpeg|jpg|png|tif|tiff"
    }
  ],
  "legalDocuments": [
    {
      "name": "<string>",
      "description": "<string>",
      "blobData": "<string>",
      "mimeType": "pptx|ppt|doc|htm|html|pdf|xls|xlsx"
    }
  ],
  "termsOfUse": "string",
  "sizeCategory": "S|M|L|XL|XXL|XXXL",
  "contractType": "Free|LicenseKey|OnRequest",
  "deliveryMode": "OneTime|Full",
  "deliveryPattern": "Daily|Weekly|Biweekly|Monthly|Quarterly|Yearly|Other",
  "deliveryPatternDescription": "<string>",
  "contexts": ["<string>", "<string>", "..."]
}
```

The parameters are set as follows:

| Parameters | Corresponding Name in Data Sharing Cockpit | Description |
|---|---|---|
| `<dataProviderProductID>` | — | The unique ID of the specified product in the data provider's system. Is not set manually in the Data Sharing Cockpit. |
| `<contentAggregatorProductID>` | — | The unique ID of the specified product in the content aggregator's system (if the corresponding data provider is managed by a content aggregator). Is not set manually in the Data Sharing Cockpit. |
| `<name>` | *Name* | Name for your data product. |
| `<description>` | *Description* | Accurate and meaningful information about your data product, e.g. what type of data it contains and what it is used for. |
| `<space>` | *Artifact Space* | The technical name of the space that contains the product's referenced data artifacts. Mandatory if your transfer type is set to `Direct`. The user calling the API must have access to the Space (must be associated with a Space). |
| `<pricingModel>` | *Pricing Model* | Pricing model for your data product: `One Time` or `Monthly`. Only relevant for the contract type “LicenseKey”. |
| `<pricingDescription>` | *Pricing Description* | Pricing information for users. Mandatory for `<contractType>` `LicenseKey`, otherwise optional. Textual description of the pricing model and/or metric and possibly also the price. |
| `<price>` | *Price* | One-time price. Mandatory for `<pricingModel>` `OneTime`, otherwise optional. The associated currency must also be specified (`priceCurrencyCode`). |
| `<pricePerMonth>` | *Price per month* | Monthly price. Mandatory for `<pricingModel>` `Monthly`, otherwise optional. Specifies the monthly product subscription price. The associated currency must also be specified (`priceCurrencyCode`). |
| `<priceCurrencyCode>` | *Currency Code* | Currency code to use, e.g. `EUR`, `USD`. Mandatory for `<pricingModel>` `Monthly` or `OneTime`, otherwise optional. Valid currency codes can be found in the drop-down list in the Data Sharing Cockpit under “Create a new data provider profile”. |
| `<licenseKeyUrl>` | *URL for purchasing a license key* | URL to the data provider's shop where users can purchase licenses for the data product. |
| `<regionalCoverages>` | *Regional Coverage* | String values ​​for each region to which the data applies (multiple values ​​possible). Same list of values ​​as in [6.1.1](#611-the-data-provider-definition-file-format) (`regionalCoverages`). |
| `<dataCategories>` | *Data Category* | Coded values ​​for each data category (multiple values ​​possible). Same list of values ​​as in [6.1.1](#611-the-data-provider-definition-file-format) (`dataCategories`, `C001`-`C231`). |
| `<industries>` | *Industry* | String values ​​for each industry (multiple values ​​possible). Same list of values ​​as under [6.1.1](#611-the-data-provider-definition-file-format) (`industries`). |
| `<sapApplications>` | *SAP Application* | String values ​​for each SAP application (multiple values ​​possible). Same list of values ​​as under [6.1.1](#611-the-data-provider-definition-file-format) (`sapApplications`). |
| `<shipments>` | *Data Transfer* | Transmission types that are offered. This information is particularly important if the data provider has not yet listed any products, as only the transmission types specified here are used for the search. Select: <br>• `Direct` - The data is copied directly to the space that the users select.<br>• `External` - The data is provided by sharing files outside of SAP Datasphere.<br>• `OpenSQL` - The users are required to provide an Open SQL schema via the data ingress. Once activated, you can access the data through the data builder and the provided schema will appear as the source. |
| `<productArtifacts>` | *Views* | One or more views from the specified `<space>` to be included in the data product (tables are not supported). Mandatory if `<shipments>` is set to `Direct` in combination with the `Listed` lifecycle status. For all other transmission types, product artifacts must be omitted. You can also specify filters that should be applied to the view. |
| `<dataDocumentation>` | *Data Documentation* | File containing the data documentation (string array). |
| `<additionalDataDocumentation>` | *Additional Data Documentation* | Base64 encoded file with additional data documentation. MIME types: `pptx`, `ppt`, `doc`, `htm`, `html`, `pdf`, `xls`, `xlsx`. |
| `<sampleBlobs>` | *Sample Data* | A `.json` file with sample data. |
| `<images>` | *Image* | An image that represents the data product. Base64 encoded, MIME types: `bmp`, `svg`, `gif`, `jfif`, `jpe`, `jpeg`, `jpg`, `png`, `tif`, `tiff`. |
| `<legalDocuments>` | *Legal Requirements Description* | Legal information file encoded in Base64. MIME types: `pptx`, `ppt`, `doc`, `htm`, `html`, `pdf`, `xls`, `xlsx`. |
| `<termsOfUse>` | *Terms and Conditions* | Written, unformatted description of the product's terms of use. Displayed and confirmed by the customer upon product activation. |
| `<sizeCategory>` | *Size Category* | Indicates approximately how many records can be expected in the dataset (rough estimate, also with regard to the data volume consumed in the target space): `S` = less than 1,000, `M` = 1,000-100,000, `L` = 100,000-1,000,000, `XL` = 1,000,000-10,000,000, `XXL` = 10,000,000–100,000,000, `XXXL` = more than 100,000,000 records. |
| `<contractType>` | *Contract Type* | Defines how access to the product is managed/granted. `OnRequest` is mandatory for all products with transfer type `OpenSql` or `ExternalDelivery`. `Free`: Customer can activate without further authorization from the data provider. `LicenseKey`: Customer requires a valid license for the key to authorize product activation (create license via Data Sharing Cockpit, generate activation key; `<licenseKeyUrl>` recommended). |
| `<deliveryMode>` | *Delivery Mode* | Controls whether processes are enabled that allow regular data updates to be sent to customers of the product: <br>• `OneTime` - data set is static, no automatic updates expected (customer can still trigger manually).<br>• `Full` - data set is updated regularly; Update pattern is described by `<DeliveryPattern>`/`<DeliveryPatternDescription>`. Only relevant if `<ShipmentType>` is set to `Direct`. |
| `<deliveryPattern>` | *Delivery Pattern* | Information about the data update pattern. Mandatory for `<DeliveryMode>` = `Full`. Possible values: `Daily`, `Weekly`, `Biweekly`, `Monthly`, `Quarterly`, `Yearly`, `Other`. |
| `<deliveryPatternDescription>` | *Delivery Pattern Description* | Free text with more detailed information (e.g. time/day of the week of the update). Example: *"Data will be delivered on the second business day of a week at 7:00 p.m. CET."* |
| `<contexts>` | *Context* | Names of the contexts in which the specified data product is visible. |

> ℹ️ **Note**
> If you create a fully delivered data product using the command line interface (CLI), you cannot create a *release* using the CLI. Make sure to manually create a release in the *Release Management* section of the *Data Sharing Cockpit*. A release is mandatory if you want to *list* your data product, for example.

For example, the following code snippet defines a new data product:

```json
{
  "dataProviderProductID": "My_Data_Product",
  "contentAggregatorProductID": "CW_4711",
  "name": "Sales Sample Data for SAP",
  "description": "Lorem Ipsum description of my Provider",
  "space": "SAMPLE_SPACE",
  "pricingModel": "OneTime",
  "pricingDescription": "string",
  "price": 599.99,
  "pricePerMonth": 9.99,
  "priceCurrencyCode": "string",
  "licenseKeyUrl": "http://mysapdatalicenseshop.com",
  "regionalCoverages": [
    "Germany",
    "France"
  ],
  "dataCategories": [
    "C001",
    "C031"
  ],
  "industries": [
    "Financial Services",
    "Energy and Natural Ressources"
  ],
  "sapApplications": [
    "HR & People Engagement",
    "ERP & Finance"
  ],
  "shipments": [
    "OpenSql"
  ],
  "productArtifacts": [
    {
      "name": "My_View",
      "dataFilter": "country = 'france' and year = '2019'",
      "columns": [
        { "name": "string" }
      ]
    }
  ],
  "dataDocumentation": [
    {
      "name": "My_DataDocumentation_File.pdf",
      "description": "My data documentation file",
      "blobData": "string",
      "mimeType": "doc"
    }
  ],
  "additionalDataDocumentation": [
    {
      "name": "My_Documentation_File.pdf",
      "description": "My additional data documentation file",
      "blobData": "string",
      "mimeType": "doc"
    }
  ],
  "sampleBlobs": [
    {
      "name": "My_File.json",
      "description": "My sample data",
      "blobData": "string",
      "mimeType": "json"
    }
  ],
  "images": [
    {
      "name": "My_Image_File.jpg",
      "description": "My image file",
      "blobData": "string",
      "mimeType": "jpg"
    }
  ],
  "legalDocuments": [
    {
      "name": "My_Legal_File.pdf",
      "description": "My legal document",
      "blobData": "string",
      "mimeType": "doc"
    }
  ],
  "termsOfUse": "The terms of use are complex.",
  "sizeCategory": "S",
  "contractType": "Free",
  "deliveryMode": "OneTime",
  "deliveryPattern": "Weekly",
  "deliveryPatternDescription": "Data is delivered on the 2nd workday of a week at 7pm CET",
  "contexts": [
    "My Private Context"
  ]
}
```

Use `.json` file format to save the data product definition. It is needed for the upload, e.g. Part of the `create` command.

For more information about creating data products, see the Data Provider Guide under *Creating Marketplace Data Products*.


---

# 6.3–6.5 Licenses, Releases, and Contexts on the Data Marketplace via the Command Line

*(Pages 127–158 of the original PDF)* — Part of the series [Accessing SAP Datasphere via the Command Line](../README.md). Previous parts: Sections 6.1 and 6.2 in this file.

> ℹ️ Note about the `--provider-identifier` option, which appears in virtually all commands in this chapter: You have the following options:
> • Specify the UUID of the data provider or content aggregator.
> • Specify the content aggregator UUID and a content aggregator provider ID (`contentAggregatorProviderID`) separated by a colon. Example: `List["0b0dfe8e-f974-407d-8987-6d863b2c5e83", "f97dfe8e-f9a4-4d2d-8187-ed863bdc5e88:rubix-b2b-risk-assessment-amp-monitoring-solutions-all-cou-rubix-data-sciences"]`

---

## 6.3 Managing Data Marketplace Licenses via the Command Line

You can use the SAP Datasphere command line interface, `datasphere`, to create and manage data marketplace licenses in the Data Sharing Cockpit.

**Prerequisites**

To manage licenses from the command line, you need an application space role that gives you access to a space with the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *Data Builder in the Data Warehouse* (`CRUD----`) – to create, edit, and delete licenses.

The *DW Modeler* role template, for example, grants these permissions. Additionally, the following is required (installation + sign-in, see Chapter 2).

For more information about managing your licenses and generating activation keys for users to ensure full compliance when accessing your data products, see *Managing Licenses*.

### datasphere marketplace licenses-by-provider list

Returns a concise list of all licenses available for your data provider profile.

```
datasphere marketplace licenses-by-provider list
```

| Parameters | Description |
|---|---|
| `--accept <accept>` | Format of the return value: `application/vnd.sap.marketplace.licenses.list+json` *(Default)*, `application/vnd.sap.marketplace.licenses.details+json` |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace licenses-by-provider create

Creates a new license. The new license is created with the status “Draft”. You can change the status via the `change-lifecycle-status` command.

```
datasphere marketplace licenses-by-provider create
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your license definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace licenses-by-provider read

Lists the properties of a license. You must provide the UUID of the license.

```
datasphere marketplace licenses-by-provider read
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--license-identifier <license-identifier>` | UUID of the license. |

### datasphere marketplace licenses-by-provider update

Updates the properties of a specific license. You must provide the UUID of the license.

```
datasphere marketplace licenses-by-provider update
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your license definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--license-identifier <license-identifier>` | UUID of the license. |

### datasphere marketplace licenses-by-provider overwrite

Overrides all properties of a specific license.

```
datasphere marketplace licenses-by-provider overwrite
```

> ℹ️ **Note**
> If you only want to update specific properties, use the `update` command.

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--file-path <path>` | Path to a file with the `.json` extension containing your license definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--license-identifier <license-identifier>` | UUID of the license. |

### datasphere marketplace licenses-by-provider delete

Deletes an existing license.

```
datasphere marketplace licenses-by-provider delete
```

| Parameters | Description |
|---|---|
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace licenses-by-provider change-lifecycle-status

Changes the lifecycle status of a license from Draft to Active or vice versa. The status “Draft” is automatically set for a newly created license.

```
datasphere marketplace licenses-by-provider change-lifecycle-status
```

Select Active (or Draft) status, and then provide the UUID of the license.

| Parameters | Description |
|---|---|
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace licenses-by-provider keys list

Returns a list of all existing activation keys for a given license.

```
datasphere marketplace licenses-by-provider keys list
```

| Parameters | Description |
|---|---|
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace licenses-by-provider keys generate

Generates activation keys for a specific license.

```
datasphere marketplace licenses-by-provider keys generate
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--file-path <path>` | Path to a file with the `.json` extension containing the keys. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace licenses-by-provider keys delete

Deletes an activation key from a specific license.

```
datasphere marketplace licenses-by-provider keys delete
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--file-path <path>` | Path to a file with the `.json` extension containing the key. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace licenses-by-provider products add

Adds data products to a license.

| Parameters | Description |
|---|---|
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--file-path <path>` | Path to a file with the `.json` extension containing your license definition. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace licenses-by-provider products delete

Removes data products from a license.

| Parameters | Description |
|---|---|
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--file-path <path>` | Path to a file with the `.json` extension containing your license definition. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace licenses-by-provider keys assign-users

Assigns users to a license key.

When a user installs the product for the first time, the appropriate authorization of the user account is verified by the marketplace service using the registered email address. It then generates a key and activates the data product in the background. This allows the user to immediately install a data product that requires a license key without having to enter the license key.

```
datasphere marketplace licenses-by-provider keys assign-users
```

| Parameters | Description |
|---|---|
| `--license-identifier <license-identifier>` | UUID of the license. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--filePath <user-file>` | Path to a file with a `.json` extension that contains the necessary information for the users you want to map (email address, key UUID, tenant URL). Example payload:<br>`[ { "email": "john.doe@sap.com", "keyUUID": "1b9e9f0b-266e-4422-9354-5647c45c5dd5", "tenantURL": "dwc-master-hc-datamacons.master.hanacloudservices.cloud.sap" }, { "email": "jane.smith@sap.com", "keyUUID": "e5faa991-6a16-44a5-8380-a1f168d2b93d", "tenantURL": "dwc-master-hc-datamacons2.master.hanacloudservices.cloud.sap" } ]` |
| `--input <input>` | *[Optional]* Input as a string. |

---

## 6.3.1 The License Definition File Format

The properties of a license definition are set and retrieved in the space definition file format and saved as a `.json` file. A license definition file cannot exceed **25 MB**.

### License Properties

Users with the *DW Modeler* role can create licenses and set any license properties using the following syntax:

```json
{
  "providerUUID": "<string>",
  "reference": "<string>",
  "company": "<string>",
  "domains": ["<string>", "<string>", "..."],
  "validUntil": "<string>",
  "scope": ["<string>", "<string>", "..."]
}
```

The parameters are set as follows:

| Technical Parameters | Corresponding Name in Data Sharing Cockpit | Description |
|---|---|---|
| `<providerUUID>` | *Data Provider* | The unique identifier (UUID) of the data provider (string in UUID format). |
| `<reference>` | *Reference* | A descriptive name, contract number, or other reference information (string). |
| `<company>` | *Company* | The name of the company that will use the license (String). |
| `<domains>` | *Domains* | One or more domains to limit the validity of the license (string array). |
| `<validUntil>` | *Valid Until* | The last date the license was valid (string in datetime format). |
| `<scope>` | *License Scope* | The data products to be included in the license scope (string array, where each string represents a product UUID). |

For example, the following code snippet defines a new license:

```json
{
  "providerUUID": "66c9b1e6-1d84-4f1d-8f98-1c1e26f54b8d",
  "reference": "Example Reference",
  "company": "Example Company",
  "domains": ["example.com", "anotherexample.com"],
  "validUntil": "2023-02-16T16:20:20.698Z",
  "scope": ["dcccaddb-e343-4830-b0e3-8a0233309c24", "77d0a15d-a68b-4e6d-b7ea-262b16b03cce"]
}
```

Use `.json` file format to save the license definition. It is needed for the upload, e.g. Part of the `create` command.

For more information about licenses, see *Managing Licenses* in the Data Provider Guide.

---

## 6.4 Managing Data Marketplace Releases via the Command Line

You can use the SAP Datasphere command line interface, `datasphere`, to publish and manage data product releases to the data marketplace.

**Prerequisites**

To manage releases from the command line, you need an application space role that gives you access to a space with the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *Data Builder in the Data Warehouse* (`CRUD----`) – to create, edit, and delete releases.

The *DW Modeler* role template, for example, grants these permissions. Additionally, the following is required (installation + sign-in, see Chapter 2).

Data Marketplace publication management allows you to manage data updates and delivery to your users. For each data product update, you create a new release. For more information about data marketplace releases, see *Publishing new releases*.

### datasphere marketplace releases list

Returns a simplified list of all releases of a data product.

```
datasphere marketplace releases list
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product (see `datasphere marketplace products list`). |
| `--accept <accept>` | Format of the return value: `application/vnd.sap.marketplace.releases.list+json` *(Default)*, `application/vnd.sap.marketplace.releases.details+json` |

### datasphere marketplace releases create

Creates a new release.

```
datasphere marketplace releases create
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your release definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

### datasphere marketplace releases read

Lists the properties of a release. You must provide the UUID of the release.

```
datasphere marketplace releases read
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |
| `--release-identifier <release-identifier>` | Release UUID. |

### datasphere marketplace releases update

Updates properties of a specified release for a data product. You must provide the data product UUID and the release UUID.

```
datasphere marketplace releases update
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |
| `--file-path <path>` | Path to a file with the `.json` extension containing your release definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--release-identifier <release-identifier>` | Release UUID. |

### datasphere marketplace releases overwrite

Overrides all properties of a specific release.

```
datasphere marketplace releases overwrite
```

> ℹ️ **Note**
> If you only want to update specific properties, use the `update` command.

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |
| `--file-path <path>` | Path to a file with the `.json` extension containing your release definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--release-identifier <release-identifier>` | Release UUID. |

### datasphere marketplace releases delete

Deletes an existing release.

```
datasphere marketplace releases delete
```

| Parameters | Description |
|---|---|
| `--release-identifier <release-identifier>` | Release UUID. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

### datasphere marketplace releases publish

Publishes a release to make data product updates available to users.

```
datasphere marketplace releases publish
```

| Parameters | Description |
|---|---|
| `--release-identifier <release-identifier>` | Release UUID. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

### datasphere marketplace releases lock

Locks a specific release of a data product.

```
datasphere marketplace releases lock
```

| Parameters | Description |
|---|---|
| `--release-identifier <release-identifier>` | Release UUID. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

### datasphere marketplace releases unlock

Unlocks a specific release of a data product.

```
datasphere marketplace releases unlock
```

| Parameters | Description |
|---|---|
| `--release-identifier <release-identifier>` | Release UUID. |
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

### datasphere marketplace releases lock-all

Locks all releases of a data product.

```
datasphere marketplace releases lock-all
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

### datasphere marketplace releases unlock-all

Unlocks all releases of a data product.

```
datasphere marketplace releases unlock-all
```

| Parameters | Description |
|---|---|
| `--data-product-uuid <data-product-uuid>` | UUID of the data product. |

---

## 6.4.1 The Release Definition File Format

The properties of a release definition are set and retrieved in the space definition file format and saved as a `.json` file. A release definition file cannot exceed **25 MB**.

### Release properties

Users with the *DW Modeler* role can create releases and set any release properties using the following syntax:

```json
{
  "dataContained": "<string>",
  "comment": "<string>",
  "from": "<string>",
  "to": "<string>",
  "isLocked": "<boolean>",
  "isPublished": "<boolean>"
}
```

The parameters are set as follows:

| Technical Parameters | Corresponding Name in Data Sharing Cockpit | Description |
|---|---|---|
| `<dataContained>` | *Data Contained* | A description of the data included in the release (string). |
| `<comment>` | *Comment* | A comment on the release (string). |
| `<from>` | *Date Range* | The start date of the release (string in datetime format). |
| `<to>` | *Date Range* | The end date of the release (string in datetime format). |
| `<isLocked>` | *Locked* | Indicates whether the release is locked or not (Boolean). |
| `<isPublished>` | — | Indicates whether the release has been published or not (Boolean). |

For example, the following code snippet defines a new release:

```json
{
  "dataContained": "Data Contained Description",
  "comment": "Release Comment",
  "from": "2023-02-16T16:20:20.698Z",
  "to": "2023-02-16T16:20:20.698Z",
  "isLocked": false,
  "isPublished": false
}
```

Use `.json` file format to save the release definition. It is needed for the upload, e.g. Part of the `create` command.

For more information about releases, see *Publishing new releases* in the Data Provider Guide.

---

## 6.5 Managing Data Marketplace Contexts via the Command Line

You can use the SAP Datasphere command line interface, `datasphere`, to create and manage data marketplace contexts.

**Prerequisites**

To manage contexts from the command line, you need an application space role that gives you access to a space with the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *Data Builder in the Data Warehouse* (`CRUD----`) – to create, edit, and delete contexts.

The *DW Modeler* role template, for example, grants these permissions. Additionally, the following is required (installation + sign-in, see Chapter 2).

Use contexts to limit the visibility of your data provider profile and data products to selected users. For more information about data marketplace contexts, see *Using contexts to create public, private, and internal offerings*.

### datasphere marketplace contexts-by-provider list

Returns a list of a data provider's contexts.

```
datasphere marketplace contexts-by-provider list
```

| Parameters | Description |
|---|---|
| `--accept <accept>` | Format of the return value: `application/vnd.sap.marketplace.contexts.list+json` *(Default)*, `application/vnd.sap.marketplace.contexts.details+json` |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace contexts-by-provider create

Creates a new context for a specified data provider. The new context is created with the status “Draft”. You can enable the context using the `datasphere marketplace context-by-provider change-lifecycle-status` command.

```
datasphere marketplace contexts-by-provider create
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace contexts-by-provider read

Lists the properties of a context for a specific data provider. You must provide the context UUID and the data provider UUID.

```
datasphere marketplace contexts-by-provider read
```

| Parameters | Description |
|---|---|
| `--context-identifier <context-identifier>` | Context UUID. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |

### datasphere marketplace contexts-by-provider update

Updates the selected properties of a specific context.

```
datasphere marketplace contexts-by-provider update
```

| Parameters | Description |
|---|---|
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |

### datasphere marketplace contexts-by-provider overwrite

Overwrites all properties of the specified context with the provided data in the context definition file.

```
datasphere marketplace contexts-by-provider overwrite
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace contexts-by-provider delete

Deletes an existing context of a specified data provider.

```
datasphere marketplace contexts-by-provider delete
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |

### datasphere marketplace contexts-by-provider change-lifecycle-status

Changes the lifecycle state of a context to active. A newly created context is automatically set to draft status: Before users can use their activation keys to join a context in the data marketplace, you must activate the context.

```
datasphere marketplace contexts-by-provider change-lifecycle-status
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |

### datasphere marketplace contexts-by-provider join

This command allows you to join an existing context. After joining, all data products listed in this context will be displayed.

```
datasphere marketplace contexts-by-provider join
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace contexts-by-provider leave

With this command you leave a context. If you leave a context, you will no longer be able to see the data products listed in that context.

```
datasphere marketplace contexts-by-provider leave
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace contexts-by-provider keys list

Returns a list of all existing activation keys for a given context.

```
datasphere marketplace contexts-by-provider keys list
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |

### datasphere marketplace contexts-by-provider keys generate

Generates activation keys for a specific context.

```
datasphere marketplace contexts-by-provider keys generate
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |

### datasphere marketplace contexts-by-provider keys delete

Deletes an activation key from a specific context.

```
datasphere marketplace contexts-by-provider keys delete
```

| Parameters | Description |
|---|---|
| `--provider-identifier <provider-identifier>` | Provider ID (see note above). |
| `--context-identifier <context-identifier>` | Context UUID. |
| `--file-path <path>` | Path to a file with the `.json` extension containing your context definition. |
| `--input <input>` | *[Optional]* Input as a string. |

---

## 6.5.1 The Context Definition File Format

The properties of a context definition are set and retrieved in the space definition file format and saved as a `.json` file. A context definition file cannot exceed **25 MB**.

### Context Properties

Users with the *DW Modeler* role can create contexts and set any context properties using the following syntax:

```json
{
  "contextOwnerUUID": "<string>",
  "contextUUID": "<string>",
  "contextType": "<string>",
  "contextName": "<string>",
  "description": "<string>",
  "logo": {
    "name": "<string>",
    "blobData": "<string>",
    "mimeType": "<string>"
  },
  "status": "<string>",
  "domains": ["<string>", "<string>", "..."]
}
```

The parameters are set as follows:

| Technical Parameters | Corresponding Name in Data Sharing Cockpit | Description |
|---|---|---|
| `<contextOwnerUUID>` | — | The unique ID of the context owner (string in UUID format). |
| `<contextUUID>` | — | The unique ID of the context (string in UUID format). |
| `<contextType>` | *Type* | Select one of the following types (string): <br>• Public data marketplace: `<PublicDataMarketplace>`<br>• Data shop: `<DataShop>`<br>• Private data products: `<PrivateDataProducts>`<br>• Private data exchange: `<PrivateDataExchange>`<br>• Internal data marketplace: `<InternalDataMarketPlace>` |
| `<contextName>` | *Name* | A unique name for the context (string). |
| `<description>` | *Description* | A description for the context (string). |
| `<logo>` | — | The logo for context. Object with the properties: <br>• `<name>` – file name of the image including extension (string)<br>• `<blobData>` – Base64 encoded data of the image (string)<br>• `<mimeType>` – MIME type of the image (string). Possible values: `<image/jpeg>`, `<image/png>`, `<image/bmp>`, `<image/svg+xml>`, `<image/tiff>` |
| `<status>` | — | Status of the context (string): `<Draft>`, `<Active>`, `<Expired>` |
| `<domains>` | *Domains* | One or more domains (string array, where each string represents a domain). |

For example, the following code snippet defines a new context:

```json
{
  "contextOwnerUUID": "66c9b1e6-1d84-4f1d-8f98-1c1e26f54b8d",
  "contextUUID": "b7e4e6a3-4e1c-4e8f-a7a8-6e1e26f54b8d",
  "contextType": "PrivateDataExchange",
  "contextName": "My Context",
  "description": "My Context Description",
  "logo": {
    "name": "My_file.jpg",
    "blobData": "YXNkYXNkYXNkc2RhZA==",
    "mimeType": "image/jpeg"
  },
  "status": "Draft",
  "domains": ["example.com", "anotherexample.com"]
}
```

Use `.json` file format to save the context definition. It is needed for the upload, e.g. Part of the `create` command.

For more information about contexts, see *Using contexts to create public, private, and internal offers* in the data provider guide.
