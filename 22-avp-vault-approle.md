# Autenticación y autorización por approle en Vault

Esta página propone ejecutar la parte de creación de autentiación y autorización en Vault con approle,
de forma independiente de otras tareas para centrarse y evitar confusiones.

El role y la policy de Vault creadas se utilizarán en el último paso.

## Documentación de referencia

Referencias sobre authn por approle. El tutorial incluye las policies..

- https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05
- https://developer.hashicorp.com/vault/docs/auth/approle
- https://developer.hashicorp.com/vault/tutorials/auth-methods/approle
- https://github.com/werne2j/arogcd-vault-plugin-demo

Similar, pero para authn por kubernetes (service account y RBAC)

- https://cloud.redhat.com/blog/how-to-use-hashicorp-vault-and-argo-cd-for-gitops-on-openshift

La última versión de todo es el Vault Agent, con inyección de secretos, mutating webhooks y otras exquisiteces de implementación no trivial.

- https://cloud.redhat.com/blog/integrating-hashicorp-vault-in-openshift-4
- https://developer.hashicorp.com/vault/docs/platform/k8s/injector
- https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-sidecar

## Ejecucion tutorial

Se sigue el tutorial de la lista anterior:
- https://developer.hashicorp.com/vault/tutorials/auth-methods/approle

Se trabaja en el terminal del pod `vault-0` del statefulset correspondiente.

### Variables de entorno para un vault en local

Skip, ya estamos en el terminal de `vault-0`. Queda la duda de por qué se anotó este par de valores.
```
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=root
```

### Tareas previas como administrador en Vault
Sin estar recogidos en en tutorial, es necesario para evitar un 403/404 en paso siguiente.

Si no se dispone del token, habrá que rearrancar el Vault para que muestre el token y las llaves de desellado (_unsealing_). Ver el documento de instalación de Vault.
```
vault login hvs.MbBT9J9ZXyGvlJCjV8CG1IjD
```
El path enabled `-path=secret` es solo el directorio raíz del path de los secretos que se quieran crear.
```
vault secrets enable -path=secret kv-v2
```

### Crear un secreto para el test
>4. Create some test data.

Atención al `Secret Path` en la respuesta, donde se inserta el conocido `/data` detrás del path habilitado. 
```
vault kv put secret/mysql/webapp db_name="users" username="admin" password="passw0rd"

	====== Secret Path ======
	secret/data/mysql/webapp
	======= Metadata =======
	Key                Value
	---                -----
	created_time       2023-08-03T08:05:36.718175618Z
	custom_metadata    <nil>
	deletion_time      n/a
	destroyed          false
	version            1
```

### Habilitar approle como método de autenticación en Vault

> Step 1: Enable AppRole auth method (Persona: admin)
>
> Enable approle auth method by executing the following command.

El siguiente comando ya estaba ejecutado de anteriores pruebas.
```
vault auth enable approle
```

### Crear un role con una policy de acceso al secreto
> Step 2: Create a role with policy attached
(Persona: admin)

#### Crear la policy de acceso al secreto
>When you enabled the AppRole auth method, it gets mounted at the /auth/approle path. In this example, you are going to create a role for the app persona (jenkins in our scenario).
First, create a policy named jenkins with following definition.

Ejemplo de definición de policy, no ejecutar:
```
# Read-only permission on secrets stored at 'secret/data/mysql/webapp'
path "secret/data/mysql/webapp" {
  capabilities = [ "read" ]
}
```
Ahora si, aplicar la definición anterior de policy que permite leer el secreto en el path de sus datos (incluye `/data/`).

>Before creating a role, create a jenkins policy.

```
vault policy write jenkins -<<EOF
# Read-only permission on secrets stored at 'secret/data/mysql/webapp'
path "secret/data/mysql/webapp" {
  capabilities = [ "read" ]
}
EOF

	Success! Uploaded policy: jenkins
```

#### Creación del role con la policy anterior

>Creates a role named jenkins with jenkins policy attached. The generated token's time-to-live (TTL) is set to 1 hour and can be renewed for up to 4 hours of its first creation. (NOTE: This example creates a role which operates in pull mode.)

Interesa el `token_policies` que relaciona con la política de lectura anterior.
Somos generosos con el TTL, en lugar de horas.
```
vault write auth/approle/role/jenkins \
    token_policies="jenkins" \
    token_ttl=5d token_max_ttl=30d

	Success! Data written to: auth/approle/role/jenkins
```
> Read the jenkins role you created to verify.

```
vault read auth/approle/role/jenkins

	Key                        Value
	---                        -----
	...
	token_max_ttl              720h
	token_policies             [jenkins]
	token_ttl                  120h
```

### Obtención de RoleID y SecretID

>Step 3: Get RoleID and SecretID

>The RoleID and SecretID are like a username and password that a machine or app uses to authenticate.
Since the example created a jenkins role which operates in pull mode, Vault will generate the SecretID. You can set properties such as usage-limit, TTLs, and expirations on the SecretIDs to control its lifecycle.
To retrieve the RoleID, invoke the auth/approle/role/<ROLE_NAME>/role-id endpoint. To generate a new SecretID, invoke the auth/approle/role/<ROLE_NAME>/secret-id endpoint.

#### Obtención de RoleID
Primero obtener el `role_id`, el equivalente al "nombre de usuario" del role para las operaciones de autenticación. El nombre que le hemos dado sería el nombre descriptivo.

>Now, you need to fetch the RoleID and SecretID of a role.
Execute the following command to retrieve the RoleID for the jenkins role.

```
vault read auth/approle/role/jenkins/role-id

	Key        Value
	---        -----
	role_id    9fa0a37a-d130-0b6c-8b30-a18fb203dc10
```

#### Obtención de SecretID

Luego de tener el `role_id` se puede obtener el `secret_id`.
En las operaciones de autenticación este sería la password.

Importante notar que tiene una validez máxima de 30 días y que se debe hacer una renovación periódica por política de seguridad.

>Execute the following command to generate a SecretID for the jenkins role.

```
vault write -force auth/approle/role/jenkins/secret-id
	Key                   Value
	---                   -----
	secret_id             8f87d184-23e3-2cc0-b6bc-ca63478f83b7
	secret_id_accessor    e0010d48-ce7f-e717-d47d-912d0150eb7a
	secret_id_num_uses    0
	secret_id_ttl         0s
```
> The -force (or -f) flag forces the write operation to continue without any data values specified. Or you can set parameters such as cidr_list.
If you specified secret_id_ttl, secret_id_num_uses, or bound_cidr_list on the role in Step 2, the generated SecretID carries out the conditions.

>Tip: The RoleID is similar to a username; therefore, you will get the same value for a given role. In this case, the jenkins role has a fixed RoleID. While SecretID is similar to a password that Vault will generate a new value every time you request it.

### Verificación anteriores pasos

#### Login con RoleID y SecretID para obtener token de acceso
>Step 4: Login with RoleID & SecretID
(Persona: app)

>To login, use the auth/approle/login endpoint by passing the RoleID and SecretID.
Example:

```
vault write auth/approle/login \
	role_id="9fa0a37a-d130-0b6c-8b30-a18fb203dc10" \
	secret_id="8f87d184-23e3-2cc0-b6bc-ca63478f83b7"

		Key                     Value
		---                     -----
		token                   hvs.CAESIIulXqsaZSsGj1DwRPeEp-g2Ssq1qa3OA04wPQp9LVLIGh4KHGh2cy50QXVTSUJIMzcxRDVEbHl1MEpGSElDdVM
		token_accessor          LnCeSXHQux3PmtMZ0MrqIIDD
		token_duration          120h
		token_renewable         true
		token_policies          ["default" "jenkins"]
		identity_policies       []
		policies                ["default" "jenkins"]
		token_meta_role_name    jenkins
```

>Vault returns a client token with default and jenkins policies attached.
Store the generated token value in an environment variable named, APP_TOKEN.
Example:

```
export APP_TOKEN="hvs.CAESIIulXqsaZSsGj1DwRPeEp-g2Ssq1qa3OA04wPQp9LVLIGh4KHGh2cy50QXVTSUJIMzcxRDVEbHl1MEpGSElDdVM"
```

#### Leer secreto con el token devuelto por el login

>Step 5: Read secrets using the AppRole token
(Persona: app)

Ejecutar en una sola línea:
```
VAULT_TOKEN=$APP_TOKEN vault kv get secret/mysql/webapp

	====== Secret Path ======
	secret/data/mysql/webapp

	======= Metadata =======
	Key                Value
	---                -----
	created_time       2023-08-03T08:05:36.718175618Z
	custom_metadata    <nil>
	deletion_time      n/a
	destroyed          false
	version            1

	====== Data ======
	Key         Value
	---         -----
	db_name     users
	password    passw0rd
	username    admin
```
Si se llama directamente a `vault kv get secret/mysql/webapp` se usa el login general en vault de la sesión bash.
Al poner delante `VAULT_TOKEN=$APP_TOKEN` si se tiene en cuenta ese valor específico. 
```
VAULT_TOKEN=$APP_TOKEN vault kv delete secret/mysql/webapp
	Error deleting secret/data/mysql/webapp: Error making API request.
	URL: DELETE http://127.0.0.1:8200/v1/secret/data/mysql/webapp
	Code: 403. Errors:
	* 1 error occurred:
			* permission denied
```

## Documentación adicional sobre role_id y secret_id

Del recurso https://developer.hashicorp.com/vault/docs/auth/approle

**Credentials/Constraints**

>RoleID is an identifier that selects the AppRole against which the other credentials are evaluated. When authenticating against this auth method's login endpoint, the RoleID is a required argument (via role_id) at all times. By default, RoleIDs are unique UUIDs, which allow them to serve as secondary secrets to the other credential information. However, they can be set to particular values to match introspected information by the client (for instance, the client's domain name).
>
> SecretID is a credential that is required by default for any login (via secret_id) and is intended to always be secret. (For advanced usage, requiring a SecretID can be disabled via an AppRole's bind_secret_id parameter, allowing machines with only knowledge of the RoleID, or matching other set constraints, to fetch a token). SecretIDs can be created against an AppRole either via generation of a 128-bit purely random UUID by the role itself (Pull mode) or via specific, custom values (Push mode). Similarly to tokens, SecretIDs have properties like usage-limit, TTLs and expirations.

**Pull and push SecretID modes**

> If the SecretID used for login is fetched from an AppRole, this is operating in Pull mode. If a "custom" SecretID is set against an AppRole by the client, it is referred to as a Push mode. Push mode mimics the behavior of the deprecated App-ID auth method; however, in most cases Pull mode is the better approach. The reason is that Push mode requires some other system to have knowledge of the full set of client credentials (RoleID and SecretID) in order to create the entry, even if these are then distributed via different paths. However, in Pull mode, even though the RoleID must be known in order to distribute it to the client, the SecretID can be kept confidential from all parties except for the final authenticating client by using Response Wrapping.

> Push mode is available for App-ID workflow compatibility, which in some specific cases is preferable, but in most cases Pull mode is more secure and should be preferred.

**Further constraints**

> role_id is a required credential at the login endpoint. AppRole pointed to by the role_id will have constraints set on it. This dictates other required credentials for login. The bind_secret_id constraint requires secret_id to be presented at the login endpoint. Going forward, this auth method can support more constraint parameters to support varied set of Apps. Some constraints will not require a credential, but still enforce constraints for login. For example, secret_id_bound_cidrs will only allow logins coming from IP addresses belonging to configured CIDR blocks on the AppRole.
