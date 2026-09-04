# Appendix C – Connection Definition Formats

Adapted from the SAP guide (PDF 2026.02, Ch. 7.1–7.29).
Commands: `datasphere spaces connections create|edit|…` — see [Chapter 6](../chapters/06-connections-certificates-ucl.md).
Additionally (not in the PDF): UCL via `datasphere configuration system-connections`.


---
# 7 Managing Connectivity via the Command Line

*(Pages 159–196 of the original PDF, split across multiple files)* — Part of the series [Accessing SAP Datasphere via the Command Line](../README.md)

Users with the Administrator role can use the `datasphere` CLI to manage TLS server certificates. Users with an integrator role can list, read, validate and delete connections, in addition to creating and editing connections for specific connection types.

More information:

- **7.1 Managing TLS server certificates from the command line** *(this file)*
- **7.2 Managing connections from the command line** *(this file)*
- 7.3–7.29 Connection definition file formats by connection type → see [this file](C-connection-definition-formats.md)

---

## 7.1 Managing TLS Server Certificates via the Command Line

Users with the *DW Administrator* role (or equivalent permissions) can list, upload, and delete TLS server certificates via the command line.

**Prerequisites**

To manage TLS server certificates on the command line, you need a global role that grants you the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *System Information* (`-RU-----`) – for access to the *Configuration* area in the *System* tool.

The *DW Administrator* role template, for example, grants these permissions. Additionally, the following is required (installation + sign-in, see Chapter 2).

To browse the available commands:

```
datasphere configuration certificates
```

More information about certificate management in SAP Datasphere can be found under *Manage Certificates for Connections*.

### List TLS Certificates

You can list all TLS server certificates that have been uploaded to SAP Datasphere.

```
datasphere configuration certificates list
```

### Upload TLS Certificates

You can upload a TLS server certificate.

```
datasphere configuration certificates upload
    --description <description>
    --file-path<path> | --input <input>
```

| Parameters | Description |
|---|---|
| `--description <description>` | Enter a description to provide plain information about the certificate, e.g. to indicate which connection type the certificate applies to. |
| `--file-path <path>` | *[Optional]* Path to a certificate file with a supported file extension: `.pem` (Privacy-Enhanced Mail), `.crt` or `.cer`. |
| `--input <input>` | *[Optional]* Certificate definition as a `.json` string instead of via `--file-path`. |

For example, to upload a TLS server certificate for SAP SuccessFactors connections:

```
datasphere configuration certificates upload --description "SAP Success Factors" --file-path MySAPSuccssFactorsCertificate.pem
```

### Delete TLS Certificates

You can delete a certificate.

```
datasphere configuration certificates delete
    --fingerprint <fingerprint>
```

| Parameters | Description |
|---|---|
| `--fingerprint <fingerprint>` | Enter the fingerprint of the certificate you want to delete. You can get the fingerprint using the `datasphere configuration certificates list` command. |

---

## 7.2 Managing Connections via the Command Line

Users with an integrator role can read, list, validate, create, edit, and delete connections.

**Prerequisites**

To work with connections on the command line, you need a scoped application role that grants you access to a space with the following permissions:

- *Data Warehouse General* (`-R------`) – for access to SAP Datasphere.
- *Data Warehouse Connection* (`CRUD----`) – to create, edit, validate, or delete a connection.
- *Space Files* (`CRUD----`) – to create, read, update, and delete objects in your spaces.

The *DW Space Administrator* and *DW Integrator* role templates, for example, grant these permissions.

To specify a location ID other than the default storage location when you use Cloud Connector for your connection, you need a role that grants the following permission:

- *Connection* (`-R------`)

The *DW Administrator* role template, for example, grants this permission. More information can be found under *Permissions and Rights* and *Standard Roles Delivered with SAP Datasphere*.

Additionally, the following is required (installation + sign-in, see Chapter 2).

To browse the available commands:

```
datasphere spaces connections
```

Information about working with connections in SAP Datasphere can be found under *Integrating Data via Connections*.

### Connection Types Supported for Creating and Editing Connections

Creating and editing connections via the command line is supported for the following connection types:

| Connection Type | Type ID on the Command Line | More Information |
|---|---|---|
| Amazon Athena | `ATHENA` | [7.3](#73-amazon-athena-connection-definition-file-format) |
| Amazon Redshift | `REDSHIFT` | [7.4](#74-amazon-redshift-connection-definition-file-format) |
| Amazon Simple Storage Service | `S3` | [7.5](#75-amazon-simple-storage-service-connection-definition-file-format) |
| Apache Kafka | `KAFKA` | [7.6](#76-apache-kafka-connection-definition-file-format) |
| Cloud Data Integration | `CDI` | [7.7](#77-cloud-data-integration-connection-definition-file-format) |
| Confluent | `CONFLUENT` | [7.8](#78-confluent-connection-definition-file-format) |
| Generic JDBC | `GENERICJDBC` | [7.9](#79-generische-jdbc-connection-definition-file-format) |
| Generic OData | `ODATA` | [7.10](#710-generic-odata-connection-definition-file-format) |
| Generic SFTP | `SFTP` | [7.11](#711-generisches-sftp-connection-definition-file-format) |
| Google BigQuery | `BIGQUERY` | [7.12](#712-google-bigquery-connection-definition-file-format) |
| Google Cloud Storage | `GCS` | [7.13](#713-google-cloud-storage-connection-definition-file-format) |
| Hadoop Distributed File System | `(HDFS)` | [7.14](#714-hadoop-distributed-file-system-connection-definition-file-format) |
| Microsoft Azure Blob Storage | `WASB` | [7.15](#715-microsoft-azure-blob-storage-connection-definition-file-format) |
| Microsoft Azure Data Lake Store Gen2 | `ADL` | [7.16](#716-microsoft-azure-data-lake-store-gen2-connection-definition-file-format) |
| Microsoft Azure SQL Database | `AZURESQL` | [7.17](#717-microsoft-azure-sql-datenbank-connection-definition-file-format) |
| Microsoft SQL Server | `MSSQL` | [7.18](#718-microsoft-sql-server-connection-definition-file-format) |
| Oracle | `ORACLEDB` | [7.19](#719-oracle-connection-definition-file-format) |
| SAP ABAP | `ABAP` | [7.20](#720-sap-abap-connection-definition-file-format) |
| SAP BW | `SAPBW` | [7.21](#721-sap-bw-connection-definition-file-format) |
| SAP BW/4HANA Model Transfer | `SAPBWMODELTRANSFER` | [7.22](#722-sap-bw4hana-model-transfer-connection-definition-file-format) |
| SAP ECC | `SAPECC` | [7.23](#723-sap-ecc-connection-definition-file-format) |
| SAP HANA | `HANA` | [7.24](#724-sap-hana-connection-definition-file-format) |
| SAP HANA Cloud, Data Lake Files | `HDL_FILES` | [7.25](#725-sap-hana-cloud-data-lake-dateien-connection-definition-file-format) |
| Relational Engine of SAP HANA Cloud, Data Lake | `HDLDB` | [7.26](#726-relational-engine-of-sap-hana-cloud-data-lake-connection-definition-file-format) |
| SAP SuccessFactors | `SAPSF` | [7.27](#727-sap-successfactors-connection-definition-file-format) |
| SAP S/4HANA Cloud | `SAPS4HANACLOUD` | [7.28](#728-sap-s4hana-cloud-connection-definition-file-format) |
| SAP S/4HANA On-Premise | `SAPS4HANAOP` | [7.29](#729-sap-s4hana-on-premise-connection-definition-file-format) |

### List Connections in a Space

You can list all connections in a space and optionally write the output to a file.

```
datasphere spaces connections list
    --space <space>
    [--accept <accept>]
    [--details]
    [--name]
    [--features ]
    [--top <n>]
    [--skip <n>]
    [--output file.json]
```

| Parameters | Description |
|---|---|
| `--space <space>` | Enter the *Space ID* of the space. |
| `--accept <accept>` | *[Optional]* Connection definition format: `"application/vnd.sap.datasphere.space.connections.list+json"` *[Default]*, `"application/vnd.sap.datasphere.space.connections.details+json"` |
| `--details` | *[Optional]* List the connections with all details (except credentials). |
| `--name` | *[Optional]* List only the technical names of the connections. |
| `--features` | *[Optional]* List the connections with their technical name and associated information about enabled and disabled features. |
| `--top <n>` | *[Optional]* List only the first `<n>` connections (after the creation date), maximum 200. Default: `10`. |
| `--skip <n>` | *[Optional]* Skip the first `<n>` connections. Default: `0`. |
| `--output <file>.json` | *[Optional]* Path to a `.json` file for output. |

For example, to list all connections in Space `MySpace` with the associated technical and business name as well as type ID, creation date, creator and replication status and write them to a file:

```
datasphere spaces connections list --space MySpace --output MySpaceConnections.json
```

### Read Connection Details

You can read the JSON definition of a connection (without the associated credentials) in a space and optionally write the output to a file.

```
datasphere spaces connections get
    --space <space>
    --name <name>
    [--output file.json]
```

| Parameters | Description |
|---|---|
| `--space <space>` | Enter the *Space ID* of the space. |
| `--name <name>` | *[Optional]* Enter the technical name of the connection. |
| `--output <file>.json` | *[Optional]* Path to a `.json` file for output. |

For example, to read the definition of the connection `MyConnection` in Space `MySpace` and write it to the default filename:

```
datasphere spaces connections list --space MySpace --name MyConnection --output MySpaceConnections.json
```

### Create Connections

You can create a connection in a space by entering a definition in a JSON file or an input string. For an overview of the supported connection types and information about the required file format, see [Connection types supported for creating and editing connections](#connection-types-supported-for-creating-and-editing-connections).

```
datasphere spaces connections create
    --space <space>
    --type-id <connection type id>
    --file-path<path> | --input <input>
```

| Parameters | Description |
|---|---|
| `--space <space>` | Enter the *Space ID* of the space. |
| `--type-id <connection type id>` | Enter the connection type ID (see table above). |
| `--file-path <path>` | *[Optional]* Path to a file with a `.json` extension that contains your connection definition. |
| `--input <input>` | *[Optional]* Connection definition as a `.json` string instead of via `--file-path`. |

For example, to create the SAP SuccessFactors connection `MyConnection` in Space `MySpace`:

```
datasphere spaces connections create --space MySpace --type-id SAPSF --file-path MySFConnectionDefinition.json
```

### Validate a Connection

You can validate a connection in a space.

```
datasphere spaces connections validate
    --space <space>
    --name <name>
```

| Parameters | Description |
|---|---|
| `--space <space>` | Enter the *Space ID* of the space. |
| `--name <name>` | Enter the technical name of the connection. |

For example, to validate the connection `MyConnection` in Space `MySpace`:

```
datasphere spaces connections validate --space MySpace --name MyConnection
```

###Edit Connections

You can edit a connection in a Space by entering a new definition in a JSON file or an input string. For an overview of the supported connection types and information about the required file format, see [Connection types supported for creating and editing connections](#connection-types-supported-for-creating-and-editing-connections).

> ℹ️ **Note**
> The update file must contain the existing optional parameters that you used when creating the connection. Otherwise, the parameters are reset to their default values.

```
datasphere spaces connections edit
    --space <space>
    --name <name>
    --file-path<path> | --input <input>
```

| Parameters | Description |
|---|---|
| `--space <space>` | Enter the *Space ID* of the space. |
| `--name <name>` | Enter the technical name of the connection. |
| `--file-path <path>` | *[Optional]* Path to a file with a `.json` extension that contains your connection definition. |
| `--input <input>` | *[Optional]* Connection definition as a `.json` string instead of via `--file-path`. |

For example, to edit the SAP SuccessFactors connection `MyConnection` in Space `MySpace`:

```
datasphere spaces connections edit --space MySpace --name MySFConnection --file-path MySFConnectionDefinition.json
```

### Delete Connections

You can delete a connection in a space.

```
datasphere spaces connections delete
    --space <space>
    --name <name>
    [--force]
```

| Parameters | Description |
|---|---|
| `--space <space>` | Enter the *Space ID* of the space. |
| `--name <name>` | Enter the technical name of the connection. |
| `--force` | *[Optional]* Suppress the *Confirm Delete* dialog box and delete the connection without confirmation. |

For example, to delete the connection `MyConnection` in Space `MySpace` and suppress the *Confirm Delete* dialog:

```
datasphere spaces connections delete --space MySpace --name MyConnection --force
```


---

#7.3-7.29 Connection Definition File Formats

*(Pages 167–195 of the original PDF)* — Part of the series [Accessing SAP Datasphere via the Command Line](../README.md). Previous part: Sections 7.1–7.2 in this file.

For each supported connection type: Properties are set and retrieved in connection definition file format and saved as a `.json` file. A connection definition file cannot exceed **25 MB**. Users with the *DW Integrator* role can create connections and set any connection properties using connection type-specific syntax. To get detailed information about the connection syntax, you can read a corresponding connection from your space and write the output to a file using the `--get` option (see [Read connection details](#read-connection-details)).

> ℹ️ For all following connection types: if a parameter is not set, it receives the default value (when creating or editing the connection). Credentials must always be specified.

---

## 7.3 Amazon Athena (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "region": "us-east-2",
    "workgroup": "primary",
    "authType": "APIKey",
    "accessKey": "<access key>",
    "secretKey": "<secret key>"
}
```

| Parameters | Connection Property | Description |
|---|---|---|
| `name` | *Technical Name* | *[Mandatory]* Technical name of the connection. Alphanumeric characters and underscores only (`_`); cannot begin or end with `_`; must be unique within the space. *(Once the object has been saved, the technical name cannot be changed.)* |
| `region` | *Region* | *[Required]* Amazon Athena Regional Endpoint AWS Region, e.g. `us-west-2`. |
| `workgroup` | *Workgroup* | *[Required]* Workgroup name (controls query access and costs). Default: `primary`. |
| `authType` | — | *[Required]* `APIKey`. |
| `accessKey` | *Access Key* | *[Required]* User's access key ID for authentication. |
| `secretKey` | *Secret Key* | *[Required]* User's secret access key for authentication. |
| `businessName` | *Business Name* | *[Optional]* Descriptive name for easier identification; changeable at any time. |
| `description` | *Description* | *[Optional]* Further information about the object. |
| `package` | *Package* | *[Optional]* Existing package to facilitate transport between tenants. Default: none. |

---

## 7.4 Amazon Redshift (Connection Definition File Format)

Example syntax:

```json
{
    "authType": "Basic",
    "name": "<technical name>",
    "databaseName": "<database name>",
    "host": "<host name>",
    "port": "<port number>",
    "security": {
        "useSSL": "true",
        "validateCertificate": "true"
    },
    "username": "<user name>",
    "password": "<password>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

---

## 7.5 Amazon Simple Storage Service (Connection Definition File Format)

Example syntax with parameters for encryption with the AWS Key Management Service key:

```json
{
    "name": "<technical name>",
    "authType": "<description>",
    "protocol": "https",
    "endpoint": "<URL of the Amazon S3 server without protocol prefix>",
    "accessKey": "<access key>",
    "secretKey": "<secret key>",
    "rootPath": "<root path starting with character slash>",
    "encryptionKeyType": "AWS-KMS",
    "encryptionKeyARN": "<KMS key ARN>",
    "assumeRole": "true",
    "roleARN": "<role ARN>",
    "serverSideEncryption": "true",
    "durationSeconds": 3000
}
```

Example syntax with parameters for S3 managed encryption and using Assume Role:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "authType": "APIKey",
    "protocol": "https",
    "endpoint": "<URL of the Amazon S3 server without protocol prefix>",
    "accessKey": "<access key>",
    "secretKey": "<secret key>",
    "rootPath": "<root path starting with character slash>",
    "encryptionKeyType": "S3-MANAGED",
    "assumeRole": "true",
    "roleARN": "<role ARN>",
    "serverSideEncryption": "true",
    "roleSessionName": "<name to uniquely identify the assumed role session>",
    "durationSeconds": 3600,
    "externalId": "<external ID>",
    "rolePolicy": "<IAM policy in JSON format>"
}
```

---

## 7.6 Apache Kafka (Connection Definition File Format)

Example syntax with parameters for the authentication type *Kerberos with username and password*:

```json
{
    "KAFKABrokers": "<comma-separated list of brokers in the format host:port>",
    "name": "<technical name>",
    "authType": "SASLKerberosNamedUser",
    "username": "<user name>",
    "password": "<password>",
    "kerberosConfig": "<content of the krb5.conf configuration file>",
    "kerberosRealm": "<realm defined for the Kafka Kerberos broker>",
    "kerberosServiceName": "<Kerberos service used by the Kafka broker>",
    "mtls": "false"
}
```

Example syntax with parameters for an Apache Kafka cluster located behind the firewall (without authentication):

```json
{
    "KAFKABrokers": "<comma-separated list of brokers in the format host:port>",
    "name": "<technical name>",
    "authType": "NoAuth",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "auto"
    },
    "tls": "false"
}
```

---

## 7.7 Cloud Data Integration (Connection Definition File Format)

Example syntax with parameters for basic authentication:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "authType": "Basic",
    "username": "<user name>",
    "password": "<password>",
    "url": "<protocol>://<host><service path>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

Example syntax with parameters for authentication with X.509 client certificates:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "authType": "ClientCertificate",
    "x509ClientCertificate": "-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----",
    "x509ClientPrivateKey": "-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----",
    "url": "<protocol>://<host><service path>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

---

## 7.8 Confluent (Connection Definition File Format)

Example syntax with parameters for Confluent Cloud:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "systemType": "confluentCloud",
    "authType": "PLAIN",
    "KAFKABrokers": "<comma-separated list of brokers in the format host:port>",
    "username": "<user name>",
    "password": "<password>",
    "schemaRegistry": {
        "url": "<URL of the Schema Registry service in the format protocol://host:port>",
        "authType": "Basic",
        "username": "<user name>",
        "password": "<password>"
    }
}
```

Example syntax with parameters for Confluent Platform:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "systemType": "confluentPlatform",
    "KAFKABrokers": "<comma-separated list of brokers in the format host:port>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual port in Cloud Connector>"
    },
    "authType": "SASLKerberosKeytab",
    "username": "<user name used to connect to the Kerberos service>",
    "kerberosConfig": "<content of the krb5.conf configuration file>",
    "kerberosRealm": "<realm defined for the Kafka Kerberos broker>",
    "kerberosServiceName": "<Kerberos service used by the Kafka broker>",
    "kerberosKeyTab": "<content of keytab file>",
    "clientKey": "-----BEGIN PRIVATE KEY-----...-----END CERTIFICATE-----",
    "mtls": "True",
    "schemaRegistry": {
        "url": "<URL of the Schema Registry service in the format protocol://host:port>",
        "authType": "Basic",
        "username": "<user name used to connect to the Schema Registry>",
        "password": "<password>",
        "cloudConnector": {
            "useCloudConnector": "true",
            "cloudConnectorLocation": "",
            "virtualDestination": "manual",
            "virtualHost": "<Schema Registry virtual host in Cloud Connector>",
            "virtualPort": "<Schema Registry virtual port in Cloud Connector>"
        }
    }
}
```

---

## 7.9 Generic JDBC (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "driverClass": "<JDBC driver class for the database you are using>",
    "url": "<URL for the JDBC driver>",
    "username": "<user name>",
    "password": "<password>",
    "authType": "Basic",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

---

## 7.10 Generic OData (Connection Definition File Format)

Example syntax with parameters for OData V2 and OAuth 2.0 authentication with grant type *Client Credentials*:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "description": "<description>",
    "url": "<OData service provider URL>",
    "version": "V2",
    "authType": "OAuth2",
    "oauth2GrantType": "client_credentials",
    "oauth2TokenEndpoint": "<API endpoint to use to request an access token>",
    "clientId": "<client id>",
    "clientSecret": "<client secret>"
}
```

Example syntax with parameters for OData V4, OAuth 2.0 authentication with grant type *Client Credentials* and custom HTTP header:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "description": "<description>",
    "url": "<OData service provider URL>",
    "version": "V4",
    "authType": "OAuth2",
    "oauth2GrantType": "client_credentials",
    "oauth2TokenEndpoint": "<API endpoint to use to request an access token>",
    "oauth2TokenRequestContentType": "json",
    "oauth2Scope": "<string>",
    "clientId": "<client id>",
    "clientSecret": "<client secret>",
    "httpHeaders": [{ "name": "<header name>", "value": "<header value>" }]
}
```

---

## 7.11 Generic SFTP (Connection Definition File Format)

Example syntax with parameters for a public cloud SFTP server with Basic authentication:

```json
{
    "name": "<technical name>",
    "category": "cloud",
    "host": "<host name of the SFTP server>",
    "port": "<port number of the SFTP server>",
    "hostKey": "<public SSH host key (public key of the SFTP server, not the key fingerprint)>",
    "authType": "Basic",
    "username": "<user name>",
    "password": "<password>"
}
```

Example syntax with parameters for an SFTP server on your local network:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "category": "onpremise",
    "host": "<host name of the SFTP server>",
    "port": "<port number of the SFTP server>",
    "hostKey": "<public SSH host key (public key of the SFTP server, not the key fingerprint)>",
    "rootPath": "<root path starting with character slash>",
    "authType": "SSH",
    "user": "<user name>",
    "key": "-----BEGIN RSA PRIVATE KEY-----...-----END RSA PRIVATE KEY-----\n",
    "passphrase": "<passphrase>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "auto"
    }
}
```

---

## 7.12 Google BigQuery (Connection Definition File Format)

Example syntax with parameters for a BigQuery project that enables Google datasets from the EU location in addition to the default location:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "authType": "APIKey",
    "project": "<ID of the Google Cloud project>",
    "location": "Europe",
    "key": "<content of the json key file that is used for authentication>"
}
```

---

## 7.13 Google Cloud Storage (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "authType": "APIKey",
    "project": "<ID of the Google Cloud project>",
    "rootPath": "<root path starting with character slash>",
    "key": "<content of the json key file that is used for authentication>"
}
```

---

## 7.14 Hadoop Distributed File System (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "authType": "Kerberos",
    "endpoint": "WEBHDFS",
    "host": "<host name>",
    "port": "<port number>",
    "rootPath": "<root path>",
    "username": "<user name>",
    "krb5Conf": "krb5Conf",
    "kerberosKeyTab": "<content of keytab file>",
    "custom": {
        "useCustomParameters": "false"
    }
}
```

---

## 7.15 Microsoft Azure Blob Storage (Connection Definition File Format)

Example syntax:

```json
{
    "authType": "SharedKey",
    "name": "<technical name>",
    "protocol": "wasbs",
    "rootPath": "<root path starting with character slash>",
    "accountKey": "<account key>",
    "accountName": "<account name>",
    "endpointSuffix": "core.windows.net"
}
```

---

## 7.16 Microsoft Azure Data Lake Store Gen2 (Connection Definition File Format)

Example syntax with parameters for OAuth 2.0 authentication with grant type *Client credentials with certificate for X.509 client*:

```json
{
    "name": "<technical name>",
    "authType": "OAuth2",
    "clientSecret": "<client secret>",
    "clientId": "<client id>",
    "oauth2TokenEndpoint": "<token endpont to use to request an access token>",
    "oauth2GrantType": "client_credentials",
    "accountName": "<storage account name>"
}
```

Example syntax with parameters for OAuth 2.0 authentication with grant type *username and password*:

```json
{
    "name": "<technical name>",
    "authType": "OAuth2",
    "username": "<user name>",
    "password": "<password>",
    "oauth2ClientEndpoint": "<client endpont to use to request an access token>",
    "oauth2GrantType": "password",
    "accountName": "<storage account name>"
}
```

---

## 7.17 Microsoft Azure SQL Database (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "serverName": "<host name of the Azure server>",
    "port": "1433",
    "version": "12.0",
    "databaseName": "<database name>",
    "username": "<user name>",
    "password": "<password>"
}
```

---

## 7.18 Microsoft SQL Server (Connection Definition File Format)

Example syntax with parameters to enable remote tables by selecting a data provisioning agent (including advanced properties):

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "serverName": "<Microsoft SQL Server name>",
    "port": "<Microsoft SQL Server port number>",
    "databaseName": "<Microsoft SQL Server database name>",
    "username": "<user name>",
    "password": "<password>",
    "useSSL": "false",
    "version": "Microsoft SQL Server 2022",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>",
        "connectionPoolSize": 10,
        "triggersRecordPrimaryKeysOnly": true
    }
}
```

---

## 7.19 Oracle (Connection Definition File Format)

Example syntax with parameters to enable remote tables by selecting a data provisioning agent (including advanced properties):

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "description": "<description>",
    "host": "<host name or IP address on which the remote Oracle database is running>",
    "port": "<Oracle database server port number>",
    "databaseNameOrSID": "<Oracle database name>",
    "serviceName": "<service name of Oracle database>",
    "username": "<user name>",
    "password": "<password>",
    "useSSL": "false",
    "version": "Oracle 12c",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>",
        "connectionPoolSize": 10,
        "triggersRecordPrimaryKeysOnly": true
    }
}
```

Example syntax with parameters for an on-premise Oracle database that supports data flows using Cloud Connector and remote tables by selecting a data provisioning agent (including advanced properties):

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "host": "<host name or IP address on which the remote Oracle database is running>",
    "port": "<Oracle database server port number>",
    "databaseNameOrSID": "<Oracle database name>",
    "serviceName": "<service name of Oracle database>",
    "username": "<user name>",
    "password": "<password>",
    "useSSL": "false",
    "version": "Oracle 12c",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>",
        "connectionPoolSize": 10,
        "triggersRecordPrimaryKeysOnly": true
    },
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual port in Cloud Connector>"
    }
}
```

---

## 7.20 SAP ABAP (Connection Definition File Format)

Example syntax with parameters for an on-premise system with load balancing, supporting data flows by using Cloud Connector and remote tables by selecting a data provisioning agent (including advanced properties):

```json
{
    "protocol": "RFC",
    "sapLogonConnectionType": "messageServer",
    "messageServer": "<message server used for load balancing>",
    "messageServerPort": "<numerical port>",
    "messageServerGroup": "PUBLIC",
    "systemId": "<system id>",
    "client": "<client number>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual numerical port in Cloud Connector>"
    },
    "username": "<user name>",
    "password": "<password>",
    "authType": "Basic",
    "remoteTables": {
        "dataProvisioningOption": "dpAgent",
        "dataProvisioningAgent": "<Data Provisioning Agent name>",
        "rfcSerialization": "rowBased"
    },
    "name": "<technical name>"
}
```

---

## 7.21 SAP BW (Connection Definition File Format)

Example syntax with parameters for load balancing and supporting data flows using Cloud Connector and remote tables by selecting a data provisioning agent:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "description": "<description>",
    "authType": "Basic",
    "messageServer": "<message server used for load balancing>",
    "sapLogonConnectionType": "messageServer",
    "messageServerPort": "<numerical port>",
    "messageServerGroup": "PUBLIC",
    "systemId": "<system id>",
    "client": "<client number>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual numerical port in Cloud Connector>"
    },
    "username": "<user name>",
    "password": "<password>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

---

## 7.22 SAP BW/4HANA Model Transfer (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "authType": "Basic",
    "tunnelName": "<technical name of the live data connection of type tunnel>",
    "schema": "<schema name>",
    "host": "<host name>",
    "port": "<port name>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    },
    "security": {
        "useSSL": "true",
        "validateCertificate": "true"
    },
    "username": "<user name>",
    "password": "<password>"
}
```

---

## 7.23 SAP ECC (Connection Definition File Format)

Example syntax with parameters for supporting remote tables by selecting a data provisioning agent:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "authType": "Basic",
    "applicationServer": "<application server>",
    "sapLogonConnectionType": "applicationServer",
    "systemNumber": "<system instance number>",
    "client": "<client number>",
    "username": "<user name>",
    "password": "<password>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

Example syntax with parameters for using load balancing, supporting data flows using Cloud Connector and remote tables by selecting a data provisioning agent:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",
    "description": "<description>",
    "authType": "Basic",
    "messageServer": "<message server used for load balancing>",
    "sapLogonConnectionType": "messageServer",
    "messageServerPort": "<numerical port>",
    "messageServerGroup": "PUBLIC",
    "systemId": "<system id>",
    "client": "<client number>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual numerical port in Cloud Connector>"
    },
    "username": "<user name>",
    "password": "<password>",
    "remoteTables": {
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    }
}
```

---

## 7.24 SAP HANA (Connection Definition File Format)

Example syntax with parameters for SAP HANA Cloud with basic authentication and data access *Remote only*:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "host": "<fully qualified host name or IP address on which the remote SAP HANA server is running>",
    "port": "443",
    "authType": "Basic",
    "category": "cloud",
    "username": "<user name>",
    "password": "<password>",
    "remoteTables": {
        "dataAccess": "federationOnly"
    }
}
```

Example syntax with parameters for SAP HANA on-premise with basic authentication, encrypted communications, supporting remote tables by selecting a data provisioning agent (including advanced properties), and supporting data and replication flows using Cloud Connector:

```json
{
    "name": "<technical name>",
    "description": "<description>",
    "host": "<fully qualified host name or IP address on which the remote SAP HANA server is running>",
    "port": "<TCP SQL port number of the remote SAP HANA server>",
    "authType": "Basic",
    "username": "<user name>",
    "password": "<password>",
    "category": "onpremise",
    "sslEncryption": {
        "enable": "true",
        "validate": "false"
    },
    "remoteTables": {
        "dataProvisioningOption": "dpAgent",
        "dataProvisioningAgent": "<Data Provisioning Agent name>",
        "conn_pool_size": "10",
        "record_pk_only": "true"
    },
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "empty",
        "virtualDestination": "auto"
    }
}
```

---

## 7.25 SAP HANA Cloud, Data Lake Files (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "dataAccessLevel": "fileSystem",
    "host": "<host name>",
    "rootPath": "",
    "authType": "KeyStore",
    "keyStoreFile": "<Base64-encoded value of the client keystore file>",
    "keyStorePassword": "<client keystore password>"
}
```

---

## 7.26 Relational Engine of SAP HANA Cloud, Data Lake (Connection Definition File Format)

Example syntax:

```json
{
    "name": "<technical name>",
    "host": "<host name>",
    "port": "<port name>",
    "username": "<user name>",
    "password": "<password>",
    "authType": "Basic"
}
```

---

## 7.27 SAP SuccessFactors (Connection Definition File Format)

Example syntax with parameters for OData-V4 and basic authentication:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",  // optional
    "description": "<description>",  // optional
    "authType": "Basic",
    "url": "https://<SAP SuccessFactors API Server>/odatav4/<supported SAP SuccessFactors service group>",
    "version": "V4",
    "username": "<user name>",
    "password": "<password>"
}
```

Example syntax with parameters for OData-V2 and OAuth2 authentication:

```json
{
    "name": "<technical name>",
    "businessName": "<business name>",  // optional
    "description": "<description>",  // optional
    "authType": "OAuth2",
    "url": "https://<SAP SuccessFactors API Server>/odata/v2/",
    "version": "V2",
    "oauth2GrantType": "saml_bearer",
    "oauth2TokenEndpoint": "https://oauth2TokenEndpoint.com/oauth/token",
    "oauth2CompanyId": "<SAP SuccessFactors company ID>",
    "clientId": "<client id>",
    "clientSecret": "<SAML assertion>"
}
```

The parameters are set as follows:

| Parameters | Connection Property | Description |
|---|---|---|
| `name` | *Technical Name* | *[Mandatory]* Only alphanumeric characters and underscores (`_`), must not start or end with `_`, must be unique within the space. |
| `businessName` | *Business Name* | *[Optional]* Descriptive name; changeable at any time. |
| `description` | *Description* | *[Optional]* Further information about the object. |
| `package` | *Package* | *[Optional]* Default: None |
| `authType` | *Authentication Type* | *[Mandatory]* Authentication type to connect to the OData endpoint: `Standard` (username/password) or `OAuth2`. *(HTTP Basic Authentication in SAP SuccessFactors will soon be deprecated — see SAP SuccessFactors What's New Viewer, "Deprecation of HTTP Basic Authentication.")* |
| `url` | *URL* | *[Required]* URL of the OData service provider of the SAP SuccessFactors service. Syntax: for V2 `<SAP SuccessFactors API Server>/odata/v2` (specifying a supported service group `/<Service Group>` optional); for V4 `<SAP SuccessFactors API Server>/odatav4/<supported SAP SuccessFactors Service Group>`. |
| `version` | *version* | *[Mandatory]* OData version: `V2` or `V4`. |
| `oauth2GrantType` | *OAuth Grant Type* | *[Mandatory]* `SAML Bearer` as a grant type used to obtain an access token. |
| `oauth2TokenEndpoint` | *OAuth Token Endpoint* | *[Required]* API endpoint to request an access token: `<SAP SuccessFactors API Server>/oauth/token`. |
| — | *OAuth Scope* | *[Optional]* If necessary, specify OAuth scope. |
| `oauth2CompanyId` | *OAuth Company ID* | *[Required]* SAP SuccessFactors company ID (identifies the SAP SuccessFactors system on the SAP SuccessFactors API server) used to request an access token. |
| `clientId` | *Client ID* | *[Required]* API key that you received when registering SAP Datasphere as an OAuth2 client application in SAP SuccessFactors. |
| `clientSecret` | *SAML Assertion* | *[Required]* Valid SAML assertion generated for authentication. *(If the SAML assertion expires, the connection becomes invalid until you update it with a new valid SAML assertion.)* |

---

## 7.28 SAP S/4HANA Cloud (Connection Definition File Format)

Example syntax with parameters for basic authentication and remote table support using a data provisioning agent for federation and replication:

```json
{
    "applicationServer": "myXXXXX-api.s4hana.ondemand.com",
    "port": "443",
    "username": "<user name>",
    "password": "<password>",
    "authType": "Basic",
    "remoteTables": {
        "dataProvisioningOption": "dpAgent",
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    },
    "name": "<technical name>",
    "client": "<client number>"
}
```

Example syntax with parameters for authentication with X.509 client certificate or certificate chain and remote table support using a data provisioning agent for federation and replication:

```json
{
    "applicationServer": "myXXXXX-api.s4hana.cloud.sap",
    "port": "443",
    "authType": "ClientCertificate",
    "x509ClientCertificate": "<certificate or certificate chain>",
    "x509ClientPrivateKey": "-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----",
    "remoteTables": {
        "dataProvisioningOption": "dpAgent",
        "dataProvisioningAgent": "<Data Provisioning Agent name>"
    },
    "name": "<technical name>",
    "client": "<client number>"
}
```

---

## 7.29 SAP S/4HANA On-Premise (Connection Definition File Format)

Example syntax with parameters that support the use of the ABAP SQL service for remote tables:

```json
{
    "sapLogonConnectionType": "applicationServer",
    "applicationServer": "<application server>",
    "systemNumber": "<system instance number>",
    "systemId": "<system id>",
    "client": "<client number>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual port defined in the Cloud Connector system mapping for the HTTP/HTTPS protocol which has been created for remote tables via ABAP SQL>"
    },
    "username": "<user name>",
    "password": "<password>",
    "authType": "Basic",
    "remoteTables": {
        "dataProvisioningOption": "direct"
    },
    "name": "<technical name>"
}
```

Example syntax with parameters for using load balancing, with support for flows and model import using Cloud Connector and Remote Tables, and model import by selecting a data provisioning agent (including advanced properties):

```json
{
    "sapLogonConnectionType": "messageServer",
    "messageServer": "<message server used for load balancing>",
    "messageServerPort": "<numerical port>",
    "messageServerGroup": "PUBLIC",
    "systemId": "<system id>",
    "client": "<client number>",
    "cloudConnector": {
        "useCloudConnector": "true",
        "cloudConnectorLocation": "",
        "virtualDestination": "manual",
        "virtualHost": "<virtual host in Cloud Connector>",
        "virtualPort": "<virtual numerical port in Cloud Connector>"
    },
    "username": "<user name>",
    "password": "<password>",
    "authType": "Basic",
    "remoteTables": {
        "dataProvisioningOption": "dpAgent",
        "dataProvisioningAgent": "<Data Provisioning Agent name>",
        "rfcSerialization": "rowBased"
    },
    "name": "<technical name>"
}
```

---

## Disclaimer and Legal Aspects

*(Page 195 of the original PDF — final standard section of the SAP document)*

**Hyperlinks:** Some links are classified by an icon and/or tooltip text. Links to websites not hosted by SAP do not constitute a product liability claim against SAP; SAP does not object to their content and assumes no liability for damage caused by their use (except in cases of gross negligence or intent).

**Videos hosted on external platforms:** SAP does not guarantee the future availability of videos on third-party video hosting platforms.

**Beta and other experimental features:** Experimental features are not part of the official delivery package, are subject to change at any time without notice, and are not intended for use in a production system.

**Example code:** Source code and code snippets in this document are exclusively exemplary representations to explain usage, syntax and behavior and are not intended for use in a production system. SAP does not guarantee the accuracy or completeness of the sample code.

**Unbiased language:** SAP supports a culture of diversity and inclusion and uses unbiased language where possible.

---

© 2026 SAP SE or an SAP affiliate company. All rights reserved. *(Copyright notice from back of original PDF, page 196.)*
