# Instalación de Vault

La instalación de Vault se realizón en dos intentos:

- El primero según la documentación oficial de OpenShift que tenía algunas restricciones que nos hace descartar el método. Ver detalles en [Instalación de Vault según la documentación de OpenShift](11-vault-fail.md).
- El segundo como parte de un tutorial que satisface lo que se considera necesario.

Esta segunda referencia es muy similar pero 
solventa los problemas vistos en la primera opción.
[https://medium.com/hybrid-cloud-engineering/vault-integration-into-openshift-container-platform-b57c175a79da](https://medium.com/hybrid-cloud-engineering/vault-integration-into-openshift-container-platform-b57c175a79da)

Cuidado: Esta referencia está bien para instalar Vault, pero luego usa el método más complejo de inyección al contenedor. El objetivo es actualizar un secreto, simplemente.

## Instalación con UI e inicialización

### Crear un namespace para todo lo Vault

> First, create a namespace in OCP called vault-infra using the following command:
```
oc create namespace vault-infra
	namespace/vault-infra created
```

>This namespace will be the home for Vault in your OCP environment. Confirm that the new namespace is created with the following command:
```
oc get namespaces | grep vault-infra
	vault-infra                                        Active   89s
```

### Clonar localmente el Helm chart de Vault

> Clone the vault-helm GitHub repository into your local filesystem (using the command below). This step makes it much easier to keep track of the configuration changes you make to the Vault helm chart before you install it.
```
git clone https://github.com/hashicorp/vault-helm.git
	Cloning into 'vault-helm'...
	remote: Enumerating objects: 4008, done.
	remote: Counting objects: 100% (1843/1843), done.
	remote: Compressing objects: 100% (300/300), done.
	remote: Total 4008 (delta 1710), reused 1588 (delta 1537), pack-reused 2165
	Receiving objects: 100% (4008/4008), 1.05 MiB | 4.38 MiB/s, done.
	Resolving deltas: 100% (3010/3010), done.
```

### Ajustar el clon local del Helm chart de Vault

>The most important piece is the `values.yaml` file. The Vault helm chart will use this file to customize the Vault instance to your specifications. There are a large number of different configuration options ranging from high availability (HA), audit logging, probes, and more. For the purposes of this article, I will give the configuration for a quick and easy install. 
>
>In the `values.yaml` change the following keys:

No es casual que se deba activar la opción de OpenShift, donde desplegamos,
y las de ruta y UI que eran las que se echaban en falta.
```
global:
  openshift: true
server:
  route: true
ui:
  enabled: true
```

### Definir un nombre para la ruta de acceso

Atención! En `values.yaml` hay varias entradas que definen `chart-example.local` como nombre de la ruta/ingress para acceder a la consola de Vault.

El guión en el nombre no funciona con el `etc/hosts` de Windows. Cambiar `chart-example.local` por un nombre que se pueda resolver por este fichero,
o bien si funciona el DNS con el sufijo del cluster poner un nombre que encaje, 
por ejemplo: `vaultinfra.apps.k8spro.nextret.net`.

Nótese como se define como ruta, ingress inactivo, cuando se trata de deplegar a OpenShift.
```
  ingress:
    enabled: false
    hosts:
      - host: vaultinfra.apps.k8spro.nextret.net
  # OpenShift only - create a route to expose the service
  # By default the created route will be of type passthrough
  route:
    enabled: true
    host: vaultinfra.apps.k8spro.nextret.net
```

### Instalar Vault a partir del Helm Chart moldificado

> Change directory into the vault-helm sub-directory and run the following command:

```
helm install vault . -n vault-infra
```
La salida es similar a la opción probada en primer lugar y que se descartó.

Probar `helm get manifest vault`.
```
NAME: vault
LAST DEPLOYED: Tue Jun 13 13:24:57 2023
NAMESPACE: vault-infra
STATUS: deployed
REVISION: 1
NOTES:
Thank you for installing HashiCorp Vault!
Now that you have deployed Vault, you should look over the docs on using
Vault with Kubernetes available here:
https://www.vaultproject.io/docs/
Your release is named vault. To learn more about the release, try:
  $ helm status vault
  $ helm get manifest vault
```

## Tareas post instalación

### Unseal del Vault

Tal cual acaba de arrancar, el pod vault-0 del `statefulset` no está ready por estar pendiente del unsealing.

> You can then run the following command to check the status of your Vault deployment:
```
oc get pods -n vault-infra
	NAME                                    READY   STATUS    RESTARTS   AGE
	vault-0                                 0/1     Running   0          5m9s
	vault-agent-injector-76f7d7d848-tqf5s   1/1     Running   0          5m9s
```
>What you will see is that the vault-0 pod is stuck in the Ready: 0/1 state. This is because Vault needs to be initialized and unsealed before it can be used. 
>
>To see a more descriptive error message, navigate into the OpenShift console UI and navigate to Pods > vault-0 > Logs.

En el log se ve este fragmento, cuyas tres últimas líneas indican que se debe proceder al usnealing para que se inicialice Vault.
```
==> Vault server configuration:
Api Address: http://172.17.5.214:8200
Cgo: disabled
Cluster Address: https://vault-0.vault-internal:8201
Environment Variables: GODEBUG, HOME, HOSTNAME, HOST_IP, KUBERNETES_PORT, KUBERNETES_PORT_443_TCP, KUBERNETES_PORT_443_TCP_ADDR, KUBERNETES_PORT_443_TCP_PORT, KUBERNETES_PORT_443_TCP_PROTO, KUBERNETES_SERVICE_HOST, KUBERNETES_SERVICE_PORT, KUBERNETES_SERVICE_PORT_HTTPS, NAME, NSS_SDB_USE_CACHE, PATH, POD_IP, PWD, SHLVL, SKIP_CHOWN, SKIP_SETCAP, TERM, VAULT_ADDR, VAULT_AGENT_INJECTOR_SVC_PORT, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP_ADDR, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP_PORT, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP_PROTO, VAULT_AGENT_INJECTOR_SVC_SERVICE_HOST, VAULT_AGENT_INJECTOR_SVC_SERVICE_PORT, VAULT_AGENT_INJECTOR_SVC_SERVICE_PORT_HTTPS, VAULT_API_ADDR, VAULT_CLUSTER_ADDR, VAULT_K8S_NAMESPACE, VAULT_K8S_POD_NAME, VAULT_PORT, VAULT_PORT_8200_TCP, VAULT_PORT_8200_TCP_ADDR, VAULT_PORT_8200_TCP_PORT, VAULT_PORT_8200_TCP_PROTO, VAULT_PORT_8201_TCP, VAULT_PORT_8201_TCP_ADDR, VAULT_PORT_8201_TCP_PORT, VAULT_PORT_8201_TCP_PROTO, VAULT_SERVICE_HOST, VAULT_SERVICE_PORT...
Go Version: go1.20.1
Listener 1: tcp (addr: "[::]:8200", cluster address: "[::]:8201", max_request_duration: "1m30s", max_request_size: "33554432", tls: "disabled")
Log Level:
Mlock: supported: true, enabled: false
Recovery Mode: false
Storage: file
Version: Vault v1.13.1, built 2023-03-23T12:51:35Z
Version Sha: 4472e4a3fbcc984b7e3dc48f5a8283f3efe6f282
==> Vault server started! Log data will stream in below:
2023-06-13T11:25:16.786Z [INFO] proxy environment: http_proxy="" https_proxy="" no_proxy=""
2023-06-13T11:25:16.787Z [INFO] core: Initializing version history cache for core
2023-06-13T11:25:23.421Z [INFO] core: security barrier not initialized
2023-06-13T11:25:23.421Z [INFO] core: seal configuration missing, not initialized
2023-06-13T11:25:28.446Z [INFO] core: security barrier not initialized
2023-06-13T11:25:28.447Z [INFO] core: seal configuration missing, not initialized
```
De paso, al principio del log salen las variables de entorno definidas, algunas de las cuales usaremos luego.
```
Environment Variables: GODEBUG, HOME, HOSTNAME, HOST_IP, KUBERNETES_PORT, KUBERNETES_PORT_443_TCP, KUBERNETES_PORT_443_TCP_ADDR, KUBERNETES_PORT_443_TCP_PORT, KUBERNETES_PORT_443_TCP_PROTO, KUBERNETES_SERVICE_HOST, KUBERNETES_SERVICE_PORT, KUBERNETES_SERVICE_PORT_HTTPS, NAME, NSS_SDB_USE_CACHE, PATH, POD_IP, PWD, SHLVL, SKIP_CHOWN, SKIP_SETCAP, TERM, VAULT_ADDR, VAULT_AGENT_INJECTOR_SVC_PORT, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP_ADDR, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP_PORT, VAULT_AGENT_INJECTOR_SVC_PORT_443_TCP_PROTO, VAULT_AGENT_INJECTOR_SVC_SERVICE_HOST, VAULT_AGENT_INJECTOR_SVC_SERVICE_PORT, VAULT_AGENT_INJECTOR_SVC_SERVICE_PORT_HTTPS, VAULT_API_ADDR, VAULT_CLUSTER_ADDR, VAULT_K8S_NAMESPACE, VAULT_K8S_POD_NAME, VAULT_PORT, VAULT_PORT_8200_TCP, VAULT_PORT_8200_TCP_ADDR, VAULT_PORT_8200_TCP_PORT, VAULT_PORT_8200_TCP_PROTO, VAULT_PORT_8201_TCP, VAULT_PORT_8201_TCP_ADDR, VAULT_PORT_8201_TCP_PORT, VAULT_PORT_8201_TCP_PROTO, VAULT_SERVICE_HOST, VAULT_SERVICE_PORT...
```

>Initialize and Unseal Vault
>
>To initialize and unseal Vault, use the Vault CLI tool. The Vault CLI comes preinstalled in the vault container within the vault-0 pod, so I will use the Terminal tab of the container for all following commands. Alternatively, you can exec into the pod or install the Vault CLI tool locally and use your own terminal to run Vault commands.
>
>To first initialize the Vault, run the following command:

Desde el terminal del pod `vault-0` (ir al `statefulset` y buscar sus pods). 
Tendremos un primer error que corregiremos.
```
# vault version
	Vault v1.13.1 (4472e4a3fbcc984b7e3dc48f5a8283f3efe6f282), built 2023-03-23T12:51:35Z

# vault operator init
	Error initializing: Error making API request.

	URL: PUT http://127.0.0.1:8200/v1/sys/init
	Code: 400. Errors:

	* failed to initialize barrier: failed to persist keyring: mkdir /vault/data/core: permission denied
```
Corregimos el error dando permisos al directorio para una install de pruebas. Luego habrá que probar cual es la mejor solución.
```
chmod a+w  /vault/data
```

Corregido el error y con el comando de inicialización salen
- Las 5 claves de unseal, con 3 de las cuales podremos hacer unseal ya que son el quorum necesario.
- El root token que servirá para hacer login en un Vault *unsealed*.
```
vault operator init
	Unseal Key 1: TBf03DweOoMQ3A3EvxqS/wX4kZb1JV3IQOQAkNK79v7c
	Unseal Key 2: 7lSvenOE5mDq3O1xJlBqs5q4FrHJDpxT9Uri3m7FW+lH
	Unseal Key 3: f6HwDGcyMcvbXKOJMbaPQS9TjuxiOySeR/YIHSGxZLli
	Unseal Key 4: niF2XCa0pBCC5Hvxq/kH+SxximC6Hjm8Sfdkq0NQ+8kM
	Unseal Key 5: YqBZ0yTFUl4YYFQmFQS91+Nlznyp/YN7aWGVlaGQ9abv

	Initial Root Token: hvs.MbBT9J9ZXyGvlJCjV8CG1IjD

	Vault initialized with 5 key shares and a key threshold of 3. Please securely
	distribute the key shares printed above. When the Vault is re-sealed,
	restarted, or stopped, you must supply at least 3 of these keys to unseal it
	before it can start servicing requests.

	Vault does not store the generated root key. Without at least 3 keys to
	reconstruct the root key, Vault will remain permanently sealed!

	It is possible to generate new unseal keys, provided you have a quorum of
	existing unseal keys shares. See "vault operator rekey" for more information.
```

> As stated in the text of the image above, Vault needs 3/5 of the unseal keys to unseal the Vault. It is very important to remember these keys! In addition, it is important to keep track of the initial root token, because this will allow login and configuration of your Vault resources. To unseal the Vault, run the following command with 3 of your unseal keys:
>
> The most important pieces are the `Sealed=true` and `Unseal Progress` key-value pairs.

Basta con ir ejecutando el comando `vault operator unseal` con hasta tres de las claves.
```
vault operator unseal TBf03DweOoMQ3A3EvxqS/wX4kZb1JV3IQOQAkNK79v7c
	Key                Value
	---                -----
	Seal Type          shamir
	Initialized        true
-->	Sealed             true
	Total Shares       5
	Threshold          3
-->	Unseal Progress    1/3
	Unseal Nonce       9ecf62da-64e9-47d4-8967-a9b87a1e1c76
	Version            1.13.1
	Build Date         2023-03-23T12:51:35Z
	Storage Type       file
	HA Enabled         false
vault operator unseal 7lSvenOE5mDq3O1xJlBqs5q4FrHJDpxT9Uri3m7FW+lH
	Sealed             true
	Unseal Progress    2/3
vault operator unseal f6HwDGcyMcvbXKOJMbaPQS9TjuxiOySeR/YIHSGxZLli
	Sealed             false
```
> Success, Vault is now initialized and unsealed! I checked my running pods and found that the vault-0 pod changed to a Ready: 1/1 state.

Una vez inicializado, el pod se manifiesta como arrancado.
```
>oc get pods -n vault-infra
	NAME                                    READY   STATUS    RESTARTS   AGE
	vault-0                                 1/1     Running   0          26m
	vault-agent-injector-76f7d7d848-tqf5s   1/1     Running   0          26m
```
>Before running the Vault commands in the following sections, you need to login to Vault using the root token acquired in the last section. The root token will also be used later on to login to the Vault UI. To do so, run the following command:

Como se decía, login con el root para poder ejecutar comandos de Vault en el pod `vault-0`.
```
vault login hvs.MbBT9J9ZXyGvlJCjV8CG1IjD

	Success! You are now authenticated. The token information displayed below
	is already stored in the token helper. You do NOT need to run "vault login"
	again. Future Vault requests will automatically use this token.

	Key                  Value
	---                  -----
	token                hvs.LRpjkv1Kg0o9Gmj7N9bgkRDz
	token_accessor       nw6T3xFMklkwu0Qht1JL13es
	token_duration       ∞
	token_renewable      false
	token_policies       ["root"]
	identity_policies    []
	policies             ["root"]
```
### Playground: Crear secretos

>Now that all the permissions are set up, it is time to create a secret to store into Vault. The example application in the later section of this article expects a database username and password stored in the ceh/database/credentials Vault path. To create the database secret, first create the ceh path with the following command:

Un pequeño ejemplo de creación de secretos en la fuente de referencia.

Primero es necesario habilitar el path raíz `ceh` del path del secreto, y asociarle un tipo `kv-v2` de motor de secretos.
```
vault secrets enable -path=ceh kv-v2
	Success! Enabled the kv-v2 secrets engine at: ceh/
```
> This creates the ceh path with the kv-v2 secrets engine. You can find more information about Vault secrets engines here. Create a username and password entry with the following command:

Ya se puede crear un secreto en el path `ceh/database/credentials` bajo el path autorizado anteriormente. 
Nótese que aunque el path que veremos en la GUI es el que pasamos en el comando,
el que usaremos más adelante en las configuraciones
es el que aparece en la respuesta bajo `Secret Path` 
y en el que se intercala un  `/data` tras el directorio raíz habilitado.
```
vault kv put ceh/database/credentials \
  username="db-username" \
  password="db-password"
  
	======== Secret Path ========
	ceh/data/database/credentials

	======= Metadata =======
	Key                Value
	---                -----
	created_time       2023-06-13T11:55:01.028736078Z
	custom_metadata    <nil>
	deletion_time      n/a
	destroyed          false
	version            1
```
Este secreto se puede ver ya en la GUI en [https://vaultinfra.apps.k8spro.nextret.net/ui/vault/secrets/ceh/show/database/credentials](https://vaultinfra.apps.k8spro.nextret.net/ui/vault/secrets/ceh/show/database/credentials). 
Pero no, ver siguiente apartado.

Nota: De nuevo ver como se separa la raíz del resto con un `/show/` intermedio.

### Configurar TLS de la ruta

Al acceder a [https://vaultinfra.apps.k8spro.nextret.net/ui/vault/secrets/ceh/show/database/credentials](https://vaultinfra.apps.k8spro.nextret.net/ui/vault/secrets/ceh/show/database/credentials)
el navegador recibe una respuesta incorrecta debido a que el tráfico https se pasa tal cual a Vault en :8200.

Basta cambiar la ruta para tener `tls.termination: edge`. El `tls.termination: passthrough` anterior viene del Helm que ya se había modificado para el nombre del host.
```
spec:
  host: vaultinfra.apps.k8spro.nextret.net
  to:
    kind: Service
    name: vault
    weight: 100
  port:
    targetPort: 8200
  tls:
    termination: edge
```
Sobre las terminaciones de TLS:
>Routes can be either secured or unsecured. Secure routes provide the ability to use several types of TLS termination to serve certificates to the client. Unsecured routes are the simplest to configure, because they require no key or certificates, but secured routes encrypt traffic to and from the pods. A secured route specifies the TLS termination of the route. The available types of termination are listed below:
>
>- Edge Termination With edge termination, TLS termination occurs at the router, before the traffic gets routed to the pods. TLS certificates are served by the router, so they must be configured into the route, otherwise the router’s default certificate is used for TLS termination. Because TLS is terminated at the router, connections from the router to the endpoints over the internal network are not encrypted.
>
>- Pass-through Termination With pass-through termination, encrypted traffic is sent straight to the destination pod without the router providing TLS termination. No key or certificate is required. The destination pod is responsible for serving certificates for the traffic at the endpoint.
>
>- Re-encryption Termination Re-encryption is a variation on edge termination, where the router terminates TLS with a certificate, then re-encrypts its connection to the endpoint, which might have a different certificate. Therefore the full path of the connection is encrypted, even over the internal network.

Y ya en la pantalla, entramos con método `Token` indicando el valor del root token `hvs.MbBT9J9ZXyGvlJCjV8CG1IjD`
y podemos navegar al secreto antes creado [https://vaultinfra.apps.k8spro.nextret.net/ui/vault/secrets/ceh/show/database/credentials](https://vaultinfra.apps.k8spro.nextret.net/ui/vault/secrets/ceh/show/database/credentials).

### Autenticación de Kubernetes

>Configuring Kubernetes Authentication

>Before the Vault secrets can be injected into a pod, the pod needs to be able to authenticate itself to the Vault service. Vault supports multiple authentication methods which can be found here. For this article I used the Kubernetes auth method because of how easy it is to set up. To first enable the auth method endpoint, run the following command:

Este método de autenticación no está previsto en esta prueba de concepto.

