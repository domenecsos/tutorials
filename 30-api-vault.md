# Comprensión y pruebas de la API de Vault

La API de Vault es necesaria para realizar de forma desatendida algunas tareas:

- Las necesarias para que el despliegue de una nueva aplicación pueda acceder a Vault.
- Obtener nuevos `secret_id` para el ArgoCD Vault Plugin a medida que expiran sus TTL.

En este documento se procede a probar:

- Obtención de Vault token a partir de un usuario y password.
- Acceso a información con las políticas disponibles.
- Manejo de información con las políticas disponibles.

## Obtención de Vault token a partir de un usuario y password

### Creación de usuario/password en línea de comandos

Enlace de referencia

- https://developer.hashicorp.com/vault/docs/auth/userpass

> **Configuration**
>
>Auth methods must be configured in advance before users or machines can authenticate. These steps are usually completed by an operator or configuration management tool.

Activa el método de usuario y password desde la consola del pod `vault-0`. Se puede hacer desde la UI.

>Enable the userpass auth method:

```
vault auth enable userpass
	Success! Enabled userpass auth method at: userpass/
```

Cabe la posibilidad de activarlo en un path alternativo, pero no aporta.

> This enables the userpass auth method at auth/userpass. To enable it at a different path, use the -path flag:

```
vault auth enable -path=<path> userpass
```

>Configure it with users that are allowed to authenticate:

```
vault write auth/<userpass:path>/users/mitchellh \
    password=foo \
    policies=admins
```

>This creates a new user "mitchellh" with the password "foo" that will be associated with the "admins" policy. This is the only configuration necessary.

Crearemos el usuario `apiadmin/*4p14dm1n`. Ojo a la política `admins` que no está definida y no servirá de nada.

```
vault write auth/userpass/users/apiadmin \
     password=*4p14dm1n \
     policies=admins
		Success! Data written to: auth/userpass/users/apiadmin
```

Para más información sobre autenticación userpass y su manejo via API:

> **API** 
>
> The Userpass auth method has a full HTTP API. Please see the Userpass auth method API for more details.

https://developer.hashicorp.com/vault/api-docs/auth/userpass

### Prueba de obtención de Vault token a partir de un usuario y password

Realizaremos un login con este nuevo usuario `apiadmin` (en el URL) para obtener un Vault token usando el verbo HTTP POST.
El endpoint de la API está en la misma ruta que publica la UI, debiendose tener en cuenta que es un certificado autofirmado y por tanto inseguro.

```
curl \
    --request POST --insecure \
    --data '{"password": "*4p14dm1n"}' \
    https://vaultinfra.apps.k8spro.nextret.net/v1/auth/userpass/login/apiadmin	
	
		{"request_id":"7a98790d-5db6-3e12-2900-51eae81f5b81","lease_id":"","renewable":false,"lease_duration":0,"data":null,"wrap_info":null,"warnings":null,"auth":{"client_token":"hvs.CAESIAYg794Kb_1xeMivd6GON4gVYSH0Hztsup4aHlRB6a9jGh4KHGh2cy5uRFlOa0pFRm5BZTVaQnpDSGhZQWpiMUg","accessor":"RLsaZrCed72V9vETR8SHp6aE","policies":["admins","default"],"token_policies":["admins","default"],"metadata":{"username":"apiadmin"},"lease_duration":2764800,"renewable":true,"entity_id":"7e6805fe-0e1c-a7d6-02dd-10a5066654d7","token_type":"service","orphan":true,"mfa_requirement":null,"num_uses":0}}
```

De la respuesta en bonito:

- Nos quedamos con el valor del Vault token en `auth.client_token`.
- La disponibilidad de las políticas `admins` (inventada) y `default` (algo se podrá hacer).

```
{
   "request_id": "7a98790d-5db6-3e12-2900-51eae81f5b81",
   "lease_id": "",
   "renewable": false,
   "lease_duration": 0,
   "data": null,
   "wrap_info": null,
   "warnings": null,
   "auth": {
      "client_token": "hvs.CAESIAYg794Kb_1xeMivd6GON4gVYSH0Hztsup4aHlRB6a9jGh4KHGh2cy5uRFlOa0pFRm5BZTVaQnpDSGhZQWpiMUg",
      "accessor": "RLsaZrCed72V9vETR8SHp6aE",
      "policies": [
         "admins",
         "default"
      ],
      "token_policies": [
         "admins",
         "default"
      ],
      "metadata": {
         "username": "apiadmin"
      },
      "lease_duration": 2764800,
      "renewable": true,
      "entity_id": "7e6805fe-0e1c-a7d6-02dd-10a5066654d7",
      "token_type": "service",
      "orphan": true,
      "mfa_requirement": null,
      "num_uses": 0
   }
}
```
	
## Acceso a información con las políticas disponibles

En la UI el botón `Policies` lleva a 

- https://vaultinfra.apps.k8spro.nextret.net/ui/vault/policy/acl

y a opción `default` (una de las que tenemos según informa el login) lleva a

- https://vaultinfra.apps.k8spro.nextret.net/ui/vault/policies/acl/default

En esta observamos como interesante `sys/internal/ui/resultant-acl` descrita como 
_Allow a token to look up its resultant ACL from all policies_.
Esta nos permitirá validar la política `default` y al mismo tiempo ver todo lo accesible.

Para la llamada se guarda el token en una variable de entorno 
y se llama a la `v1` respecto a la ruta de Vault.

```
export VAULT_TOKEN=hvs.CAESIAYg794Kb_1xeMivd6GON4gVYSH0Hztsup4aHlRB6a9jGh4KHGh2cy5uRFlOa0pFRm5BZTVaQnpDSGhZQWpiMUg

curl \
	--header "X-Vault-Token: $VAULT_TOKEN" \
	--insecure \
	--request GET \
	https://vaultinfra.apps.k8spro.nextret.net/v1/sys/internal/ui/resultant-acl
		{"request_id":"a85cfe90-ec54-ad5b-9ea0-0f64a06561e5","lease_id":"","renewable":false,"lease_duration":0,"data":{"exact_paths":{"auth/token/lookup-self":{"capabilities":["read"]},"auth/token/renew-self":{"capabilities":["update"]},"auth/token/revoke-self":{"capabilities":["update"]},"identity/entity/id/7e6805fe-0e1c-a7d6-02dd-10a5066654d7":{"capabilities":["read"]},"identity/entity/name/entity_faca25e6":{"capabilities":["read"]},"sys/capabilities-self":{"capabilities":["update"]},"sys/control-group/request":{"capabilities":["update"]},"sys/internal/ui/resultant-acl":{"capabilities":["read"]},"sys/leases/lookup":{"capabilities":["update"]},"sys/leases/renew":{"capabilities":["update"]},"sys/renew":{"capabilities":["update"]},"sys/tools/hash":{"capabilities":["update"]},"sys/wrapping/lookup":{"capabilities":["update"]},"sys/wrapping/unwrap":{"capabilities":["update"]},"sys/wrapping/wrap":{"capabilities":["update"]}},"glob_paths":{"cubbyhole/":{"capabilities":["create","delete","list","read","update"]},"sys/tools/hash/":{"capabilities":["update"]}},"root":false},"wrap_info":null,"warnings":null,"auth":null}
```

El resultado en modo legible:
```

{
   "request_id": "a85cfe90-ec54-ad5b-9ea0-0f64a06561e5",
   "lease_id": "",
   "renewable": false,
   "lease_duration": 0,
   "data": {
      "exact_paths": {
         "auth/token/lookup-self": {
            "capabilities": [
               "read"
            ]
         },
         "auth/token/renew-self": {
            "capabilities": [
               "update"
            ]
         },
         "auth/token/revoke-self": {
            "capabilities": [
               "update"
            ]
         },
         "identity/entity/id/7e6805fe-0e1c-a7d6-02dd-10a5066654d7": {
            "capabilities": [
               "read"
            ]
         },
         "identity/entity/name/entity_faca25e6": {
            "capabilities": [
               "read"
            ]
         },
         "sys/capabilities-self": {
            "capabilities": [
               "update"
            ]
         },
         "sys/control-group/request": {
            "capabilities": [
               "update"
            ]
         },
         "sys/internal/ui/resultant-acl": {
            "capabilities": [
               "read"
            ]
         },
         "sys/leases/lookup": {
            "capabilities": [
               "update"
            ]
         },
         "sys/leases/renew": {
            "capabilities": [
               "update"
            ]
         },
         "sys/renew": {
            "capabilities": [
               "update"
            ]
         },
         "sys/tools/hash": {
            "capabilities": [
               "update"
            ]
         },
         "sys/wrapping/lookup": {
            "capabilities": [
               "update"
            ]
         },
         "sys/wrapping/unwrap": {
            "capabilities": [
               "update"
            ]
         },
         "sys/wrapping/wrap": {
            "capabilities": [
               "update"
            ]
         }
      },
      "glob_paths": {
         "cubbyhole/": {
            "capabilities": [
               "create",
               "delete",
               "list",
               "read",
               "update"
            ]
         },
         "sys/tools/hash/": {
            "capabilities": [
               "update"
            ]
         }
      },
      "root": false
   },
   "wrap_info": null,
   "warnings": null,
   "auth": null
}
```

## Manejo de información con las políticas disponibles

En `glob_paths` se observa:

```
 "cubbyhole/": {
	"capabilities": [
	   "create",
	   "delete",
	   "list",
	   "read",
	   "update"
	]
 },
```
Empecemos por pedir información del path `cubbyhole` con un `?help=1`:
```
 curl \
	--header "X-Vault-Token: $VAULT_TOKEN" \
	--insecure \
    https://vaultinfra.apps.k8spro.nextret.net/v1/cubbyhole?help=1
		{"help":"## DESCRIPTION\n\nThe cubbyhole backend reads and writes arbitrary secrets to the backend.\nThe secrets are encrypted/decrypted by Vault: they are never stored\nunencrypted in the backend and the backend never has an opportunity to\nsee the unencrypted value.\n\nThis backend differs from the 'kv' backend in that it is namespaced\nper-token. Tokens can only read and write their own values, with no\nsharing possible (per-token cubbyholes). This can be useful for implementing\ncertain authentication workflows, as well as \"scratch\" areas for individual\nclients. When the token is revoked, the entire set of stored values for that\ntoken is also removed.\n\n## PATHS\n\nThe following paths are supported by this backend. To view help for\nany of the paths below, use the help command with any route matching\nthe path pattern. Note that depending on the policy of your auth token,\nyou may or may not be able to access certain paths.\n\n    ^(?P\u003cpath\u003e.*)$\n        Pass-through secret storage to a token-specific cubbyhole in the storage\n        backend, allowing you to read/write arbitrary data into secret storage.","openapi":{"openapi":"3.0.2","info":{"title":"HashiCorp Vault API","description":"HTTP API that gives you full access to Vault. All API routes are prefixed with `/v1/`.","version":"1.13.1","license":{"name":"Mozilla Public License 2.0","url":"https://www.mozilla.org/en-US/MPL/2.0"}},"paths":{"/{path}":{"description":"Pass-through secret storage to a token-specific cubbyhole in the storage backend, allowing you to read/write arbitrary data into secret storage.","parameters":[{"name":"path","description":"Specifies the path of the secret.","in":"path","schema":{"type":"string"},"required":true}],"x-vault-createSupported":true,"get":{"summary":"Retrieve the secret at the specified location.","parameters":[{"name":"list","description":"Return a list if `true`","in":"query","schema":{"type":"string"}}],"responses":{"200":{"description":"OK"}}},"post":{"summary":"Store a secret at the specified location.","responses":{"200":{"description":"OK"}}},"delete":{"summary":"Deletes the secret at the specified location.","responses":{"204":{"description":"empty body"}}}}},"components":{"schemas":{}}},"see_also":null}

```
En legible:
```

{
   "help": "## DESCRIPTION
   
	The cubbyhole backend reads and writes arbitrary secrets to the backend.
	The secrets are encrypted/decrypted by Vault: they are never stored
	unencrypted in the backend and the backend never has an opportunity to
	see the unencrypted value.

	This backend differs from the 'kv' backend in that it is namespaced
	per-token. Tokens can only read and write their own values, with no
	sharing possible (per-token cubbyholes). This can be useful for implementing
	certain authentication workflows, as well as \"scratch\" areas for individual
	clients. When the token is revoked, the entire set of stored values for that
	token is also removed.

	## PATHS

	The following paths are supported by this backend. To view help for
	any of the paths below, use the help command with any route matching
	the path pattern. Note that depending on the policy of your auth token,
	you may or may not be able to access certain paths.
		^(?P<path>.*)$
			Pass-through secret storage to a token-specific cubbyhole in the storage
			backend, allowing you to read/write arbitrary data into secret storage.",
   "openapi": {
      "openapi": "3.0.2",
      "info": {
         "title": "HashiCorp Vault API",
         "description": "HTTP API that gives you full access to Vault. All API routes are prefixed with `/v1/`.",
         "version": "1.13.1",
         "license": {
            "name": "Mozilla Public License 2.0",
            "url": "https://www.mozilla.org/en-US/MPL/2.0"
         }
      },
      "paths": {
         "/{path}": {
            "description": "Pass-through secret storage to a token-specific cubbyhole in the storage backend, allowing you to read/write arbitrary data into secret storage.",
            "parameters": [
               {
                  "name": "path",
                  "description": "Specifies the path of the secret.",
                  "in": "path",
                  "schema": {
                     "type": "string"
                  },
                  "required": true
               }
            ],
            "x-vault-createSupported": true,
            "get": {
               "summary": "Retrieve the secret at the specified location.",
               "parameters": [
                  {
                     "name": "list",
                     "description": "Return a list if `true`",
                     "in": "query",
                     "schema": {
                        "type": "string"
                     }
                  }
               ],
               "responses": {
                  "200": {
                     "description": "OK"
                  }
               }
            },
            "post": {
               "summary": "Store a secret at the specified location.",
               "responses": {
                  "200": {
                     "description": "OK"
                  }
               }
            },
            "delete": {
               "summary": "Deletes the secret at the specified location.",
               "responses": {
                  "204": {
                     "description": "empty body"
                  }
               }
            }
         }
      },
      "components": {
         "schemas": {}
      }
   },
   "see_also": null
}
```
Crearemos un secreto `cubbyhole/mi-secreto` que solo será visible en las conexiones autenticadas
con este Vault token, que es el funcionamiento del almacenamiento privado `cubbyhole` 
tal como se puede leer en la ayuda de este path.

Los datos necesarios para crear un secreto:

```
{
  "foo": "bar",
  "zip": "zap"
}
```

Envío de los anteriores con un POST para crear el secreto `mi-secreto` en `cubbyhole`.

```
curl \
	--header "X-Vault-Token: $VAULT_TOKEN" \
    --request POST --insecure \
    --data '{  "foo": "bar",  "zip": "zap"}' \
   https://vaultinfra.apps.k8spro.nextret.net/v1/cubbyhole/mi-secreto
(sin respuestalegible)
```

Petición GET para obtener el secreto `mi-secreto` en `cubbyhole`.

```
curl \
	--header "X-Vault-Token: $VAULT_TOKEN" \
    --request GET --insecure \
   https://vaultinfra.apps.k8spro.nextret.net/v1/cubbyhole/mi-secreto
{"request_id":"b0894317-5e49-1d8a-3ac1-b3052a1e60f0","lease_id":"","renewable":false,"lease_duration":0,"data":{"foo":"bar","zip":"zap"},"wrap_info":null,"warnings":null,"auth":null}
```

Forma legible de los datos recibidos.

```
{
   "request_id": "b0894317-5e49-1d8a-3ac1-b3052a1e60f0",
   "lease_id": "",
   "renewable": false,
   "lease_duration": 0,
   "data": {
      "foo": "bar",
      "zip": "zap"
   },
   "wrap_info": null,
   "warnings": null,
   "auth": null
}
```

Petición para ver la lista de secretos en `cubbyhole`.
```
curl \
	--header "X-Vault-Token: $VAULT_TOKEN" \
    --request LIST --insecure \
   https://vaultinfra.apps.k8spro.nextret.net/v1/cubbyhole
	{"request_id":"796f8dda-4ea6-1f2d-ecf1-558d0bfc9530","lease_id":"","renewable":false,"lease_duration":0,"data":{"keys":["mi-secreto"]},"wrap_info":null,"warnings":null,"auth":null}
```

La lista muestra los secretos

```
   "data": {
      "keys": [
         "mi-secreto"
      ]
   },
```

En la UI de Vault donde se ha entrado con el token de root no aparece `mi-secreto`,
sino un secreto `otrosecret` creado con el token de root.

Se puede ver `mi-secreto` en la UI si se accede con el token obtenido con el login de la API.
Si en la CLI cambiamos el Vault Token por el de root, se verà `otrosecret`.

```
export VAULT_TOKEN=hvs.MbBT9J9ZXyGvlJCjV8CG1IjD
curl \
	--header "X-Vault-Token: $VAULT_TOKEN"     
	--request LIST --insecure \
	https://vaultinfra.apps.k8spro.nextret.net/v1/cubbyhole
		{"request_id":"ccffd84c-6714-7e6c-cdb5-2bfc2578ee20","lease_id":"","renewable":false,"lease_duration":0,"data":{"keys":["otrosecret"]},"wrap_info":null,"warnings":null,"auth":null}
			data: {
				keys: [
					"otrosecret"
				]
			},			
```

Este es el carácter especial del `cubbyhole`, donde los secretos están asociados a un token
y su ciclo de vida acaba con el del token.

