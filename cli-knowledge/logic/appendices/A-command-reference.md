# Appendix A – Complete Command Reference (@sap/datasphere-cli 2026.14.0)

This reference was generated from `datasphere … --help` output for **@sap/datasphere-cli 2026.14.0**.

For many commands the CLI lists only command-specific options; generic options are often omitted from help. Details: [https://tinyurl.com/yck8vv4w](https://tinyurl.com/yck8vv4w).

**Note:** Content may change with the CLI version — always verify with `datasphere <command> --help`.


## catalog

```
Usage: datasphere catalog [options] [command]
```

manage your SAP catalog

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `data-products [options]` | manage dataproducts installation from catalog |
| `help [command]` | display help for command |


### catalog data-products

```
Usage: datasphere catalog data-products [options] [command]
```

manage dataproducts installation from catalog

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `install [options]` | install dataproduct from catalog |
| `uninstall [options]` | uninstall dataproduct from catalog |
| `help [command]` | display help for command |


### catalog data-products install

```
Usage: datasphere catalog data-products install [options]
```

install dataproduct from catalog

**Options:**

| Option | Description |
| --- | --- |
| `-S, --system-connection <system-connection>` | UCL shared connection technical name. Example: --system-connection MY_CONNECTION (optional) |
| `-f, --api-resource-ord-id <api-resource-ord-id>` | Dataproduct api resource ord id. Example: --api-resource-ord-id MY_ORD_ID (optional) |
| `-y, --space <space>` | consumer space technical name. Example: --space MY_SPACE (optional) |
| `-h, --help` | display help for command |


### catalog data-products uninstall

```
Usage: datasphere catalog data-products uninstall [options]
```

uninstall dataproduct from catalog

**Options:**

| Option | Description |
| --- | --- |
| `-S, --system-connection <system-connection>` | UCL shared connection technical name. Example: --system-connection MY_CONNECTION (optional) |
| `-f, --api-resource-ord-id <api-resource-ord-id>` | Dataproduct api resource ord id. Example: --api-resource-ord-id MY_ORD_ID (optional) |
| `-y, --space <space>` | consumer space technical name. Example: --space MY_SPACE (optional) |
| `-h, --help` | display help for command |


## config

```
Usage: datasphere config [options] [command]
```

configure your CLI

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `cache` | work with the local CLI cache |
| `host` | configure host properties |
| `passcode-url [options]` | display the passcode url |
| `secrets` | work with the locally stored secrets |
| `help [command]` | display help for command |


### config cache

```
Usage: datasphere config cache [options] [command]
```

work with the local CLI cache

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `init [options]` | initialize the local CLI cache |
| `clean [options]` | clean the local CLI cache |
| `show` | display local CLI cache entries |
| `help [command]` | display help for command |


### config cache clean

```
Usage: datasphere config cache clean [options]
```

clean the local CLI cache

**Options:**

| Option | Description |
| --- | --- |
| `-P, --purge-all` | clean the whole local CLI cache (optional) |
| `-h, --help` | display help for command |


### config cache init

```
Usage: datasphere config cache init [options]
```

initialize the local CLI cache

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### config host

```
Usage: datasphere config host [options] [command]
```

configure host properties

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `set <host>` | set global host |
| `show` | show global host |
| `clean` | clean global host |
| `help [command]` | display help for command |


### config host set

```
Usage: datasphere config host set [options] <host>
```

set global host

**Arguments:**

| Argument | Description |
| --- | --- |
| `host` | global host |

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### config passcode-url

```
Usage: datasphere config passcode-url [options]
```

display the passcode url

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### config secrets

```
Usage: datasphere config secrets [options] [command]
```

work with the locally stored secrets

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `show` | display locally stored secrets for interactive OAuth authentication |
| `refresh [options]` | refresh the access token for interactive OAuth authentication |
| `reset` | remove all locally stored secrets for interactive OAuth authentication |
| `check [options]` | check secrets file consistency |
| `help [command]` | display help for command |


### config secrets check

```
Usage: datasphere config secrets check [options]
```

check secrets file consistency

**Options:**

| Option | Description |
| --- | --- |
| `-s, --secrets-file <file>` | path to secrets file (optional) |
| `-h, --help` | display help for command |


### config secrets show

```
Usage: datasphere config secrets show [options]
```

display locally stored secrets for interactive OAuth authentication

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


## configuration

```
Usage: datasphere configuration [options] [command]
```

manage configuration of a tenant

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `certificates [options]` | manage TLS certificates |
| `system-connections [options]` | manage UCL shared connections |
| `help [command]` | display help for command |


### configuration certificates

```
Usage: datasphere configuration certificates [options] [command]
```

manage TLS certificates

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `list [options]` | list TLS certificates |
| `upload [options]` | upload a TLS certificate |
| `delete [options]` | delete a TLS certificate |
| `help [command]` | display help for command |


### configuration certificates delete

```
Usage: datasphere configuration certificates delete [options]
```

delete a TLS certificate

**Options:**

| Option | Description |
| --- | --- |
| `-f, --fingerprint <fingerprint>` | fingerprint value (optional) |
| `-h, --help` | display help for command |


### configuration certificates list

```
Usage: datasphere configuration certificates list [options]
```

list TLS certificates

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### configuration certificates upload

```
Usage: datasphere configuration certificates upload [options]
```

upload a TLS certificate

**Options:**

| Option | Description |
| --- | --- |
| `-Y, --description <description>` | a description for the certificate (optional) |
| `-Z, --purpose <purpose>` | the purpose of the certificate (optional) (choices: "TLS Server", "X.509 Client (Open SQL)") |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### configuration system-connections

```
Usage: datasphere configuration system-connections [options] [command]
```

manage UCL shared connections

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `list [options]` | list UCL shared connection |
| `authorize [options]` | authorize UCL shared connection for specified consumption spaces |
| `help [command]` | display help for command |


### configuration system-connections authorize

```
Usage: datasphere configuration system-connections authorize [options]
```

authorize UCL shared connection for specified consumption spaces

**Options:**

| Option | Description |
| --- | --- |
| `-f, --technical-name <technical-name>` | technical name of the UCL shared connection. Example: --technical-name MY_CONNECTION (optional) |
| `-S, --spaces <spaces>` | comma-separated list of consumption spaces. Example: --spaces MY_SPACE1,MY_SPACE2 (optional) |
| `-h, --help` | display help for command |


### configuration system-connections list

```
Usage: datasphere configuration system-connections list [options]
```

list UCL shared connection

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


## dbusers

```
Usage: datasphere dbusers [options] [command]
```

manage database users

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `list [options]` | list database users |
| `create [options]` | create database user |
| `update [options]` | update database user |
| `delete [options]` | delete database user |
| `password [options]` | maintain password of database user |
| `certificate [options]` | manage certificate based database users |
| `help [command]` | display help for command |


### dbusers certificate

```
Usage: datasphere dbusers certificate [options] [command]
```

manage certificate based database users

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `distinguishedname [options]` | extract distinguished name from a certificate for a database user |
| `help [command]` | display help for command |


### dbusers certificate list

```
Usage: datasphere dbusers certificate [options] [command]
```

manage certificate based database users

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `distinguishedname [options]` | extract distinguished name from a certificate for a database user |
| `help [command]` | display help for command |


### dbusers create

```
Usage: datasphere dbusers create [options]
```

create database user

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space id (optional) |
| `-D, --databaseuser <databaseuser>` | database user id (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### dbusers delete

```
Usage: datasphere dbusers delete [options]
```

delete database user

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space id (optional) |
| `-D, --databaseuser <databaseuser>` | database user id (optional) |
| `-F, --force` | force the command execution (optional) |
| `-h, --help` | display help for command |


### dbusers list

```
Usage: datasphere dbusers list [options]
```

list database users

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space id (optional) |
| `-h, --help` | display help for command |


### dbusers password

```
Usage: datasphere dbusers password [options] [command]
```

maintain password of database user

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `reset [options]` | reset password of database user |
| `help [command]` | display help for command |


### dbusers password reset

```
Usage: datasphere dbusers password reset [options]
```

reset password of database user

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space id (optional) |
| `-D, --databaseuser <databaseuser>` | database user id (optional) |
| `-h, --help` | display help for command |


### dbusers update

```
Usage: datasphere dbusers update [options]
```

update database user

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space id (optional) |
| `-D, --databaseuser <databaseuser>` | database user id (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


## global-roles

```
Usage: datasphere global-roles [options] [command]
```

manage global roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `list [options]` | list global roles |
| `users [options]` | manage assignment of users to global roles |
| `help [command]` | display help for command |


### global-roles list

```
Usage: datasphere global-roles list [options]
```

list global roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### global-roles users

```
Usage: datasphere global-roles users [options] [command]
```

manage assignment of users to global roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `add [options]` | add users to a global role |
| `list [options]` | list all users assigned to a global role |
| `remove [options]` | remove users from a global role |
| `help [command]` | display help for command |


### global-roles users add

```
Usage: datasphere global-roles users add [options]
```

add users to a global role

**Options:**

| Option | Description |
| --- | --- |
| `-R, --role <role>` | role ID (optional) |
| `-u, --users <users>` | comma separated user IDs (optional) |
| `-h, --help` | display help for command |


### global-roles users list

```
Usage: datasphere global-roles users list [options]
```

list all users assigned to a global role

**Options:**

| Option | Description |
| --- | --- |
| `-R, --role <role>` | role ID (optional) |
| `-h, --help` | display help for command |


## job-status

```
Usage: datasphere job-status [options] [command]
```

manage job status

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `get [options]` | get job status |
| `help [command]` | display help for command |


### job-status get

```
Usage: datasphere job-status get [options]
```

get job status

**Options:**

| Option | Description |
| --- | --- |
| `-j, --job-id <job-id>` | the job id (optional) |
| `-h, --help` | display help for command |


## login

```
Usage: datasphere login [options]
```

log in to your account using interactive OAuth authentication

**Options:**

| Option | Description |
| --- | --- |
| `-H, --host <host>` | specifies the url where the tenant is hosted (optional) |
| `-A, --authorization-url <url>` | authorization url for interactive oauth session authentication (optional) |
| `-T, --token-url <url>` | token url for interactive oauth session authentication (optional) |
| `-c, --client-id <id>` | client id for interactive oauth session authentication (optional) |
| `-C, --client-secret <secret>` | client secret for interactive oauth session authentication (optional) |
| `-a, --access-token <token>` | access token for interactive oauth session authentication (optional) |
| `-b, --code <code>` | code for oauth token retrieval (optional) |
| `-r, --refresh-token <token>` | refresh token for interactive oauth session authentication (optional) |
| `-s, --secrets-file <file>` | path to secrets file (optional) |
| `-t, --tls-version <version>` | specifies the TLS version to use for HTTPS connections (optional) (choices: "TLSv1.3", "TLSv1.2", default: "TLSv1.3") |
| `-B, --browser <browser>` | specifies the browser to open (optional) (choices: "browser", "chrome", "brave", "firefox", "edge", default: "browser") |
| `-d, --authorization-flow <authorization-flow>` | specifies the authorization flow to use (optional) (choices: "authorization_code", "client_credentials", default: "authorization_code") |
| `-F, --force` | skip confirmation prompt when overwriting existing secrets (optional) |
| `-h, --help` | display help for command |


## logout

```
Usage: datasphere logout [options]
```

log out from your account

**Options:**

| Option | Description |
| --- | --- |
| `-l, --login-id <id>` | specifies the login ID (optional) (choices: "0", default: "0") |
| `-h, --help` | display help for command |


## marketplace

```
Usage: datasphere marketplace [options] [command]
```

manage your SAP Data Marketplace

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `providers [options]` | manage your providers |
| `products-by-provider [options]` | manage your data products |
| `licenses-by-provider [options]` | manage your licenses |
| `releases [options]` | manage your releases |
| `contexts-by-provider [options]` | manage your contexts |
| `products [options]` | manage your data products |
| `help [command]` | display help for command |


### marketplace contexts-by-provider

```
Usage: datasphere marketplace contexts-by-provider [options] [command]
```

manage your contexts

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a new context |
| `list [options]` | return a list of existing contexts |
| `overwrite [options]` | overwrite an existing context |
| `update [options]` | update an existing context |
| `read [options]` | read an existing context |
| `delete [options]` | delete an existing context |
| `change-lifecycle-status [options]` | change the lifecycle status of the context |
| `keys [options]` | manage the context keys |
| `join [options]` | join a list of contexts as a member data provider |
| `leave [options]` | leave a list of contexts as a member data provider |
| `mass-delete [options]` | delete a list of contexts for a given provider |
| `help [command]` | display help for command |


### marketplace licenses-by-provider

```
Usage: datasphere marketplace licenses-by-provider [options] [command]
```

manage your licenses

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a new license |
| `list [options]` | return a list of existing licenses |
| `overwrite [options]` | overwrite an existing license |
| `update [options]` | update an existing license |
| `read [options]` | read an existing license |
| `delete [options]` | delete an existing license |
| `change-lifecycle-status [options]` | change the lifecycle status of the license |
| `products [options]` | manage products assigned to the license |
| `keys [options]` | manage the license keys |
| `mass-delete [options]` | delete a list of licenses for a given provider |
| `help [command]` | display help for command |


### marketplace products

```
Usage: datasphere marketplace products [options] [command]
```

manage your data products

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a new data product |
| `list [options]` | return a list of existing data products |
| `overwrite [options]` | overwrite all properties of the data product with the provided data |
| `update [options]` | overwrite only those properties of the data product defined in the provided data |
| `read [options]` | read a data product |
| `delete [options]` | delete a data product |
| `change-lifecycle-status [options]` | change the lifecycle status of the data product |
| `install [options]` | install a data product |
| `help [command]` | display help for command |


### marketplace products change-lifecycle-status

```
Usage: datasphere marketplace products change-lifecycle-status [options]
```

change the lifecycle status of the data product

**Options:**

| Option | Description |
| --- | --- |
| `-L, --lifecycle-status <lifecycle-status>` | new lifecycle status (optional) (choices: "Listed", "Delisted", "Deactivated") |
| `-q, --data-product-uuid <data-product-uuid>` | data product UUID (optional) |
| `-h, --help` | display help for command |


### marketplace products create

```
Usage: datasphere marketplace products create [options]
```

create a new data product

**Options:**

| Option | Description |
| --- | --- |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### marketplace products install

```
Usage: datasphere marketplace products install [options]
```

install a data product

**Options:**

| Option | Description |
| --- | --- |
| `-S, --space-id <space-id>` | (optional) |
| `-u, --license-key <license-key>` | (optional) |
| `-U, --update-type <update-type>` | (optional) (choices: "Manual", "Immediate", default: "Manual") |
| `-q, --data-product-uuid <data-product-uuid>` | data product UUID (optional) |
| `-h, --help` | display help for command |


### marketplace products list

```
Usage: datasphere marketplace products list [options]
```

return a list of existing data products

**Options:**

| Option | Description |
| --- | --- |
| `-g, --accept <accept>` | format to return the content in (optional) (choices: "application/vnd.sap.marketplace.products.list+json", "application/vnd.sap.marketplace.products.details+json", default: "application/vnd.sap.marketplace.products.list+json") |
| `-h, --help` | display help for command |


### marketplace products-by-provider

```
Usage: datasphere marketplace products-by-provider [options] [command]
```

manage your data products

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a new data product |
| `list [options]` | list existing data products |
| `overwrite [options]` | overwrite all properties of the data product with the provided data |
| `update [options]` | overwrite only those properties of the data product defined in the provided data |
| `read [options]` | read a data product |
| `delete [options]` | delete a data product |
| `change-lifecycle-status [options]` | change the lifecycle status of the data product |
| `help [command]` | display help for command |


### marketplace providers

```
Usage: datasphere marketplace providers [options] [command]
```

manage your providers

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a new provider |
| `list [options]` | return a list of existing providers |
| `overwrite [options]` | overwrite all properties of the provider with the provided data |
| `update [options]` | overwrite only those properties of the provider defined in the provided data |
| `read [options]` | read a provider |
| `keys [options]` | manage the provider keys |
| `help [command]` | display help for command |


### marketplace providers create

```
Usage: datasphere marketplace providers create [options]
```

create a new provider

**Options:**

| Option | Description |
| --- | --- |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### marketplace providers list

```
Usage: datasphere marketplace providers list [options]
```

return a list of existing providers

**Options:**

| Option | Description |
| --- | --- |
| `-g, --accept <accept>` | format to return the content in (optional) (choices: "application/vnd.sap.marketplace.providers.list+json", "application/vnd.sap.marketplace.providers.details+json", default: "application/vnd.sap.marketplace.providers.list+json") |
| `-h, --help` | display help for command |


### marketplace providers read

```
Usage: datasphere marketplace providers read [options]
```

read a provider

**Options:**

| Option | Description |
| --- | --- |
| `-j, --provider-identifier <provider-identifier>` | provider identifier (optional) |
| `-h, --help` | display help for command |


### marketplace releases

```
Usage: datasphere marketplace releases [options] [command]
```

manage your releases

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a new release |
| `list [options]` | return a list of existing releases |
| `overwrite [options]` | overwrite an existing release |
| `update [options]` | update an existing release |
| `read [options]` | read an existing release |
| `delete [options]` | delete an existing release |
| `publish [options]` | publish an existing release |
| `lock [options]` | lock an existing release |
| `unlock [options]` | unlock an existing release |
| `lock-all [options]` | lock all releases of a data product |
| `unlock-all [options]` | unlock all releases of a data product |
| `help [command]` | display help for command |


## objects

```
Usage: datasphere objects [options] [command]
```

manage modeling objects

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `remote-tables [options]` | manage remote tables |
| `local-tables [options]` | manage local tables |
| `er-models [options]` | manage er models |
| `views [options]` | manage views |
| `analytic-models [options]` | manage analytic models |
| `task-chains [options]` | manage task chains |
| `data-flows [options]` | manage data flows |
| `replication-flows [options]` | manage replication flows |
| `transformation-flows [options]` | manage transformation flows |
| `data-access-controls [options]` | manage data access controls |
| `business-entities [options]` | manage business entities |
| `fact-models [options]` | manage fact models |
| `consumption-models [options]` | manage consumption models |
| `intelligent-lookups [options]` | manage intelligent lookups |
| `ontologies [options]` | manage ontologies |
| `contexts [options]` | manage contexts |
| `types [options]` | manage types |
| `services [options]` | manage services |
| `help [command]` | display help for command |


### objects analytic-models

```
Usage: datasphere objects analytic-models [options] [command]
```

manage analytic models

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects business-entities

```
Usage: datasphere objects business-entities [options] [command]
```

manage business entities

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects consumption-models

```
Usage: datasphere objects consumption-models [options] [command]
```

manage consumption models

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects contexts

```
Usage: datasphere objects contexts [options] [command]
```

manage contexts

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects data-access-controls

```
Usage: datasphere objects data-access-controls [options] [command]
```

manage data access controls

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects data-flows

```
Usage: datasphere objects data-flows [options] [command]
```

manage data flows

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects er-models

```
Usage: datasphere objects er-models [options] [command]
```

manage er models

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects fact-models

```
Usage: datasphere objects fact-models [options] [command]
```

manage fact models

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects intelligent-lookups

```
Usage: datasphere objects intelligent-lookups [options] [command]
```

manage intelligent lookups

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects local-tables

```
Usage: datasphere objects local-tables [options] [command]
```

manage local tables

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects local-tables create

```
Usage: datasphere objects local-tables create [options]
```

create an object from a JSON file or input string

**Options:**

| Option | Description |
| --- | --- |
| `-S, --save-anyway` | save the object even if there are validation messages (optional) |
| `-f, --allow-missing-dependencies` | allow creation or update of the object even if one or more objects it depends on are not present (optional) |
| `-N, --no-deploy` | do not deploy the object after saving (optional) |
| `-g, --custom-validation-options <custom-validation-options>` | include custom validation options. Example: --custom-validation-options "option:value,option:value,..." (optional) |
| `-y, --space <space>` | space ID (optional) |
| `-F, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### objects local-tables delete

```
Usage: datasphere objects local-tables delete [options]
```

delete an object

**Options:**

| Option | Description |
| --- | --- |
| `-D, --delete-anyway` | force the deletion of the object, even if other objects depend on it (optional) |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of an object (optional) |
| `-F, --force` | force the command execution (optional) |
| `-h, --help` | display help for command |


### objects local-tables list

```
Usage: datasphere objects local-tables list [options]
```

output a list of the objects in JSON format

**Options:**

| Option | Description |
| --- | --- |
| `-f, --technical-names <technical-names>` | filter the list using technical names. Example: --technical-names "MY_OBJECT1,MY_OBJECT2" (optional) |
| `-F, --filter <filter>` | filter the li/repository/remotesst using standard OData filter syntax. Example: --filter "status eq Deployed" (optional) |
| `-S, --select <select>` | choose the properties to include in the list. Example: --select "technicalName,status" (optional) (default: "technicalName") |
| `-Q, --top <top>` | restrict the list to the first <top> objects (optional) (default: "25") |
| `-W, --skip <skip>` | exclude the first <skip> objects when creating the list (optional) (default: "0") |
| `-y, --space <space>` | space ID (optional) |
| `-h, --help` | display help for command |


### objects local-tables read

```
Usage: datasphere objects local-tables read [options]
```

read the JSON definition of an object

**Options:**

| Option | Description |
| --- | --- |
| `-g, --accept <accept>` | return all content or only design-time or run-time content (optional) (choices: "application/vnd.sap.datasphere.object.content+json", "application/vnd.sap.datasphere.object.content.design-time+json", "application/vnd.sap.datasphere.object.content.run-time+json", "application/vnd.sap.datasphere.object.content.simplified+json", default: "application/vnd.sap.datasphere.object.content+json") |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of an object (optional) |
| `-h, --help` | display help for command |


### objects local-tables update

```
Usage: datasphere objects local-tables update [options]
```

update the properties of an object from a JSON file or input string

**Options:**

| Option | Description |
| --- | --- |
| `-S, --save-anyway` | save the object even if there are validation messages (optional) |
| `-f, --allow-missing-dependencies` | allow creation or update of the object even if one or more objects it depends on are not present (optional) |
| `-N, --no-deploy` | do not deploy the object after saving (optional) |
| `-g, --custom-validation-options <custom-validation-options>` | include custom validation options. Example: --custom-validation-options "option:value,option:value,..." (optional) |
| `-y, --space <space>` | space ID (optional) |
| `-i, --technical-name <technical-name>` | technical name of an object (optional) |
| `-F, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-I, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### objects ontologies

```
Usage: datasphere objects ontologies [options] [command]
```

manage ontologies

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects remote-tables

```
Usage: datasphere objects remote-tables [options] [command]
```

manage remote tables

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects replication-flows

```
Usage: datasphere objects replication-flows [options] [command]
```

manage replication flows

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects services

```
Usage: datasphere objects services [options] [command]
```

manage services

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects task-chains

```
Usage: datasphere objects task-chains [options] [command]
```

manage task chains

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects transformation-flows

```
Usage: datasphere objects transformation-flows [options] [command]
```

manage transformation flows

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects types

```
Usage: datasphere objects types [options] [command]
```

manage types

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects views

```
Usage: datasphere objects views [options] [command]
```

manage views

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create an object from a JSON file or input string |
| `list [options]` | output a list of the objects in JSON format |
| `read [options]` | read the JSON definition of an object |
| `update [options]` | update the properties of an object from a JSON file or input string |
| `delete [options]` | delete an object |
| `help [command]` | display help for command |


### objects views create

```
Usage: datasphere objects views create [options]
```

create an object from a JSON file or input string

**Options:**

| Option | Description |
| --- | --- |
| `-S, --save-anyway` | save the object even if there are validation messages (optional) |
| `-f, --allow-missing-dependencies` | allow creation or update of the object even if one or more objects it depends on are not present (optional) |
| `-N, --no-deploy` | do not deploy the object after saving (optional) |
| `-g, --custom-validation-options <custom-validation-options>` | include custom validation options. Example: --custom-validation-options "option:value,option:value,..." (optional) |
| `-y, --space <space>` | space ID (optional) |
| `-F, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### objects views list

```
Usage: datasphere objects views list [options]
```

output a list of the objects in JSON format

**Options:**

| Option | Description |
| --- | --- |
| `-f, --technical-names <technical-names>` | filter the list using technical names. Example: --technical-names "MY_OBJECT1,MY_OBJECT2" (optional) |
| `-F, --filter <filter>` | filter the li/repository/remotesst using standard OData filter syntax. Example: --filter "status eq Deployed" (optional) |
| `-S, --select <select>` | choose the properties to include in the list. Example: --select "technicalName,status" (optional) (default: "technicalName") |
| `-Q, --top <top>` | restrict the list to the first <top> objects (optional) (default: "25") |
| `-W, --skip <skip>` | exclude the first <skip> objects when creating the list (optional) (default: "0") |
| `-y, --space <space>` | space ID (optional) |
| `-h, --help` | display help for command |


### objects views read

```
Usage: datasphere objects views read [options]
```

read the JSON definition of an object

**Options:**

| Option | Description |
| --- | --- |
| `-g, --accept <accept>` | return all content or only design-time or run-time content (optional) (choices: "application/vnd.sap.datasphere.object.content+json", "application/vnd.sap.datasphere.object.content.design-time+json", "application/vnd.sap.datasphere.object.content.run-time+json", "application/vnd.sap.datasphere.object.content.simplified+json", default: "application/vnd.sap.datasphere.object.content+json") |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of an object (optional) |
| `-h, --help` | display help for command |


## scoped-roles

```
Usage: datasphere scoped-roles [options] [command]
```

manage scoped roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a scoped role based on an import file |
| `list [options]` | list all scoped roles |
| `read [options]` | view properties of a scoped role |
| `update [options]` | update a scoped role based on an import file |
| `delete [options]` | delete a scoped role |
| `users [options]` | manage assignment of users to scoped roles |
| `scopes [options]` | manage assignment of scopes to scoped roles |
| `help [command]` | display help for command |


### scoped-roles create

```
Usage: datasphere scoped-roles create [options]
```

create a scoped role based on an import file

**Options:**

| Option | Description |
| --- | --- |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### scoped-roles delete

```
Usage: datasphere scoped-roles delete [options]
```

delete a scoped role

**Options:**

| Option | Description |
| --- | --- |
| `-R, --role <role>` | role ID (optional) |
| `-F, --force` | force the command execution (optional) |
| `-h, --help` | display help for command |


### scoped-roles list

```
Usage: datasphere scoped-roles list [options]
```

list all scoped roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### scoped-roles read

```
Usage: datasphere scoped-roles read [options]
```

view properties of a scoped role

**Options:**

| Option | Description |
| --- | --- |
| `-R, --role <role>` | role ID (optional) |
| `-h, --help` | display help for command |


### scoped-roles scopes

```
Usage: datasphere scoped-roles scopes [options] [command]
```

manage assignment of scopes to scoped roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `read [options]` | list all scopes assigned to a scoped role |
| `add [options]` | add scopes to a scoped role |
| `remove [options]` | remove scopes from a scoped role |
| `help [command]` | display help for command |


### scoped-roles scopes list

```
Usage: datasphere scoped-roles scopes [options] [command]
```

manage assignment of scopes to scoped roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `read [options]` | list all scopes assigned to a scoped role |
| `add [options]` | add scopes to a scoped role |
| `remove [options]` | remove scopes from a scoped role |
| `help [command]` | display help for command |


### scoped-roles update

```
Usage: datasphere scoped-roles update [options]
```

update a scoped role based on an import file

**Options:**

| Option | Description |
| --- | --- |
| `-R, --role <role>` | role ID (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### scoped-roles users

```
Usage: datasphere scoped-roles users [options] [command]
```

manage assignment of users to scoped roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `read [options]` | list all users assigned to a scoped role |
| `add [options]` | add users to a scoped role |
| `remove [options]` | remove users from a scoped role |
| `help [command]` | display help for command |


### scoped-roles users list

```
Usage: datasphere scoped-roles users [options] [command]
```

manage assignment of users to scoped roles

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `read [options]` | list all users assigned to a scoped role |
| `add [options]` | add users to a scoped role |
| `remove [options]` | remove users from a scoped role |
| `help [command]` | display help for command |


## spaces

```
Usage: datasphere spaces [options] [command]
```

manage spaces

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create or update space details based on an import file |
| `save [options]` | save space details based on an import file |
| `read [options]` | fetch space details for a specified space |
| `delete [options]` | delete an existing space |
| `connections [options]` | manage connections of a space |
| `users [options]` | manage assignment of users to spaces |
| `list [options]` | return a list of existing spaces |
| `help [command]` | display help for command |


### spaces connections

```
Usage: datasphere spaces connections [options] [command]
```

manage connections of a space

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `get [options]` | retrieve connection details |
| `edit [options]` | edit a connection of a space |
| `delete [options]` | delete a connection of a space |
| `validate [options]` | validate a connection of a space |
| `list [options]` | lists connections of a space |
| `create [options]` | create a connection of a space |
| `help [command]` | display help for command |


### spaces connections create

```
Usage: datasphere spaces connections create [options]
```

create a connection of a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | Space ID (optional) |
| `-X, --type-id <type-id>` | type ID (optional) (choices: "ABAP", "ADL", "ATHENA", "AZURESQL", "BIGQUERY", "CDI", "CONFLUENT", "GCS", "GENERICJDBC", "GENERICHTTP", "HANA", "HDFS", "HDLDB", "HDL_FILES", "REDSHIFT", "KAFKA", "MSSQL", "ODATA", "ORACLEDB", "S3", "SAPBWMODELTRANSFER", "SAPBW", "SAPECC", "SAPSF", "SAPS4HANACLOUD", "SAPS4HANAOP", "SFTP", "SNOWFLAKE", "SIGNAVIO", "ONELAKE", "WASB") |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### spaces connections delete

```
Usage: datasphere spaces connections delete [options]
```

delete a connection of a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-J, --name <name>` | connection name (optional) |
| `-F, --force` | force the command execution (optional) |
| `-h, --help` | display help for command |


### spaces connections edit

```
Usage: datasphere spaces connections edit [options]
```

edit a connection of a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-J, --name <name>` | connection name (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### spaces connections get

```
Usage: datasphere spaces connections get [options]
```

retrieve connection details

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-J, --name <name>` | connection name (optional) |
| `-h, --help` | display help for command |


### spaces connections list

```
Usage: datasphere spaces connections list [options]
```

lists connections of a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-g, --accept <accept>` | format to return the connections content (optional) (choices: "application/vnd.sap.datasphere.space.connections.list+json", "application/vnd.sap.datasphere.space.connections.details+json", default: "application/vnd.sap.datasphere.space.connections.list+json") |
| `-K, --details` | get all connections details (optional) |
| `-J, --name` | get all connections name (optional) |
| `-M, --features` | get all connections name with features (optional) |
| `-Q, --top <top>` | The number of items to return (page size). (optional) (default: "10") |
| `-W, --skip <skip>` | The number of items to skip (offset). (optional) (default: "0") |
| `-h, --help` | display help for command |


### spaces connections validate

```
Usage: datasphere spaces connections validate [options]
```

validate a connection of a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-J, --name <name>` | connection name (optional) |
| `-h, --help` | display help for command |


### spaces create

```
Usage: datasphere spaces create [options]
```

create or update space details based on an import file

**Options:**

| Option | Description |
| --- | --- |
| `-w, --force-definition-deployment` | force redeployment of definitions (optional) |
| `-N, --no-async` | do not run deployment asynchronously (optional) |
| `-E, --enforce-database-user-deletion` | to allow deletion of Database users (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### spaces delete

```
Usage: datasphere spaces delete [options]
```

delete an existing space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-F, --force` | force the command execution (optional) |
| `-h, --help` | display help for command |


### spaces list

```
Usage: datasphere spaces list [options]
```

return a list of existing spaces

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### spaces read

```
Usage: datasphere spaces read [options]
```

fetch space details for a specified space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-z, --no-space-definition` | do not read space definition (optional) |
| `-G, --definitions [definitions]` | read definitions (optional) |
| `-I, --connections [connections]` | read connections (optional) |
| `-h, --help` | display help for command |


### spaces save

```
Usage: datasphere spaces save [options]
```

save space details based on an import file

**Options:**

| Option | Description |
| --- | --- |
| `-x, --force-save` | force save of definitions (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### spaces users

```
Usage: datasphere spaces users [options] [command]
```

manage assignment of users to spaces

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `add [options]` | add users to a space |
| `update [options]` | update assignment of users to a space |
| `read [options]` | list all users assigned to a space |
| `remove [options]` | remove users from a space |
| `help [command]` | display help for command |


### spaces users add

```
Usage: datasphere spaces users add [options]
```

add users to a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### spaces users list

```
Usage: datasphere spaces users [options] [command]
```

manage assignment of users to spaces

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `add [options]` | add users to a space |
| `update [options]` | update assignment of users to a space |
| `read [options]` | list all users assigned to a space |
| `remove [options]` | remove users from a space |
| `help [command]` | display help for command |


### spaces users read

```
Usage: datasphere spaces users read [options]
```

list all users assigned to a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-g, --accept <accept>` | format to return the assigned users content (optional) (choices: "application/vnd.sap.datasphere.space.users.list+json", "application/vnd.sap.datasphere.space.users.details+json", default: "application/vnd.sap.datasphere.space.users.list+json") |
| `-h, --help` | display help for command |


### spaces users remove

```
Usage: datasphere spaces users remove [options]
```

remove users from a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### spaces users update

```
Usage: datasphere spaces users update [options]
```

update assignment of users to a space

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


## tasks

```
Usage: datasphere tasks [options] [command]
```

manage tasks

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `chains [options]` | manage taskchains |
| `consent [options]` | manage consents |
| `logs [options]` | manage logs |
| `replication-flows [options]` | manage replication flows |
| `help [command]` | display help for command |


### tasks chains

```
Usage: datasphere tasks chains [options] [command]
```

manage taskchains

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `run [options]` | run a taskchain |
| `cancel [options]` | cancel a running taskchain |
| `retry [options]` | retry a failed taskchain |
| `help [command]` | display help for command |


### tasks chains cancel

```
Usage: datasphere tasks chains cancel [options]
```

cancel a running taskchain

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-l, --log-id <log-id>` | logId of a task run (optional) |
| `-h, --help` | display help for command |


### tasks chains retry

```
Usage: datasphere tasks chains retry [options]
```

retry a failed taskchain

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --object <object>` | technical name of an object (optional) |
| `-h, --help` | display help for command |


### tasks chains run

```
Usage: datasphere tasks chains run [options]
```

run a taskchain

**Options:**

| Option | Description |
| --- | --- |
| `-i, --input-parameters <input-parameters>` | Optional input parameters for the task chain (optional) |
| `-y, --space <space>` | space ID (optional) |
| `-f, --object <object>` | technical name of an object (optional) |
| `-h, --help` | display help for command |


### tasks consent

```
Usage: datasphere tasks consent [options] [command]
```

manage consents

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `get [options]` | get the status of the consent |
| `give [options]` | give consent to execute tasks on behalf of the user |
| `revoke [options]` | revoke consent given by the customer |
| `help [command]` | display help for command |


### tasks consent get

```
Usage: datasphere tasks consent get [options]
```

get the status of the consent

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### tasks consent give

```
Usage: datasphere tasks consent give [options]
```

give consent to execute tasks on behalf of the user

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### tasks consent revoke

```
Usage: datasphere tasks consent revoke [options]
```

revoke consent given by the customer

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### tasks logs

```
Usage: datasphere tasks logs [options] [command]
```

manage logs

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `get [options]` | get logs info of a given task by log Id |
| `get-extended [options]` | get logs info of a given task by log Id with enhanced format control |
| `list [options]` | get all logs of a certain object |
| `help [command]` | display help for command |


### tasks logs get

```
Usage: datasphere tasks logs get [options]
```

get logs info of a given task by log Id

**Options:**

| Option | Description |
| --- | --- |
| `-i, --info-level <info-level>` | task log detail level (status or details) (optional) (choices: "status", "details", default: "status") |
| `-y, --space <space>` | space ID (optional) |
| `-l, --log-id <log-id>` | logId of a task run (optional) |
| `-h, --help` | display help for command |


### tasks logs get-extended

```
Usage: datasphere tasks logs get-extended [options]
```

get logs info of a given task by log Id with enhanced format control

**Options:**

| Option | Description |
| --- | --- |
| `-g, --accept <accept>` | content type for task log response format (optional) (choices: "application/vnd.sap.datasphere.task.log.status+json", "application/vnd.sap.datasphere.task.log.status.object+json", "application/vnd.sap.datasphere.task.log.details+json", "application/vnd.sap.datasphere.task.log.details.extended+json", default: "application/vnd.sap.datasphere.task.log.status+json") |
| `-y, --space <space>` | space ID (optional) |
| `-l, --log-id <log-id>` | logId of a task run (optional) |
| `-h, --help` | display help for command |


### tasks logs list

```
Usage: datasphere tasks logs list [options]
```

get all logs of a certain object

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --objectname <objectname>` | technical name of an object (optional) |
| `-h, --help` | display help for command |


### tasks replication-flows

```
Usage: datasphere tasks replication-flows [options] [command]
```

manage replication flows

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `run [options]` | Start deployed replication flow |
| `status [options]` | Get the status of a replication flow |
| `stop [options]` | Stop a replication flow |
| `restart-object [options]` | Restart an object in a replication flow |
| `pause [options]` | Pause a replication flow |
| `resume [options]` | Resume a replication flow |
| `pause-object [options]` | Pause an object in a replication flow |
| `resume-object [options]` | Resume an object in a replication flow |
| `help [command]` | display help for command |


### tasks replication-flows pause

```
Usage: datasphere tasks replication-flows pause [options]
```

Pause a replication flow

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of the replication flow (optional) |
| `-h, --help` | display help for command |


### tasks replication-flows resume

```
Usage: datasphere tasks replication-flows resume [options]
```

Resume a replication flow

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of the replication flow (optional) |
| `-h, --help` | display help for command |


### tasks replication-flows run

```
Usage: datasphere tasks replication-flows run [options]
```

Start deployed replication flow

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of the replication flow (optional) |
| `-h, --help` | display help for command |


### tasks replication-flows status

```
Usage: datasphere tasks replication-flows status [options]
```

Get the status of a replication flow

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of the replication flow (optional) |
| `-g, --object <object>` | technical name of the dataset (optional) |
| `-h, --help` | display help for command |


### tasks replication-flows stop

```
Usage: datasphere tasks replication-flows stop [options]
```

Stop a replication flow

**Options:**

| Option | Description |
| --- | --- |
| `-y, --space <space>` | space ID (optional) |
| `-f, --technical-name <technical-name>` | technical name of the replication flow (optional) |
| `-N, --no-cleanup` | do not Stops the replication flow without cleaning up replication tasks. (optional) |
| `-h, --help` | display help for command |


## users

```
Usage: datasphere users [options] [command]
```

manage users

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `create [options]` | create a user based on an import file |
| `list [options]` | list all users |
| `update [options]` | update user properties based on an import file |
| `delete [options]` | delete users |
| `help [command]` | display help for command |


### users create

```
Usage: datasphere users create [options]
```

create a user based on an import file

**Options:**

| Option | Description |
| --- | --- |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


### users delete

```
Usage: datasphere users delete [options]
```

delete users

**Options:**

| Option | Description |
| --- | --- |
| `-u, --users <users>` | comma separated user IDs (optional) |
| `-F, --force` | force the command execution (optional) |
| `-h, --help` | display help for command |


### users list

```
Usage: datasphere users list [options]
```

list all users

**Options:**

| Option | Description |
| --- | --- |
| `-g, --accept <accept>` | format to return the assigned users content (optional) (choices: "application/vnd.sap.datasphere.space.users.list+json", "application/vnd.sap.datasphere.space.users.details+json", default: "application/vnd.sap.datasphere.space.users.list+json") |
| `-h, --help` | display help for command |


### users update

```
Usage: datasphere users update [options]
```

update user properties based on an import file

**Options:**

| Option | Description |
| --- | --- |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


## workload

```
Usage: datasphere workload [options] [command]
```

workload management

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |

**Commands:**

| Command | Description |
| --- | --- |
| `list [options]` | list workload management |
| `update [options]` | update workload management |
| `help [command]` | display help for command |


### workload list

```
Usage: datasphere workload list [options]
```

list workload management

**Options:**

| Option | Description |
| --- | --- |
| `-h, --help` | display help for command |


### workload update

```
Usage: datasphere workload update [options]
```

update workload management

**Options:**

| Option | Description |
| --- | --- |
| `-f, --file-path <path>` | specifies the file to use as input for the command (optional) |
| `-i, --input <input>` | specifies input as string to use for the command (optional) |
| `-h, --help` | display help for command |


---

**Note on JSON payloads:** Schemas and examples for JSON inputs (spaces, objects, connections, etc.) are in the other appendices and topic chapters of this handbook — not in this command-only reference.

