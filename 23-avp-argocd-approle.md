# Despliegue de aplicaciones en ArgoCD con Vault approle

En este paso final se conecta la autenticación por approle de Vault con las credenciales de configuración del ArgoCD Vault Plugin (AVP).

En resumen:
- Las credenciales necesarias se ponen en un secreto de OpenShift.
- Se modifica el repo server para que tome variables de entorno a partir del secreto anterior. 
En estas variables va la configuración de AVP.

## Rotación de secret_id

De cara a la rotación de `secret_id`, de los approle de Vault, será necesario poder periódicamente:
- Acceder a Vault para hacer un `write -f` que genere un nuevo `secret_id` (por API de Vault parece el mejor método).
- Actualizar el secreto (API de OpenShift).
- Rearrancar el repo server de ArgoCD para aplicar los cambios, como `rollout restarts`. 

Muy por encima, secretos y configmaps no son versionables en K8s, lo que hace difícil forzar rearranques. Pero esto también evita que configuraciones no validadas rearranquen un proyecto.

A futuro, este artículo propone realizar los `rollout restarts` 
uniendo configMap o Secret con el deployment o statefulset 
anotando en el YAML de los segundos el hash de los primeros. 
Esto se podrá hacer de forma periódica y OpenShift/K8s sólo hará rearranques cuando haya un cambio verdadero.
- https://blog.questionable.services/article/kubernetes-deployments-configmap-change/

## Antes de empezar

Tomamos como fuente 
- [https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05](https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05)

Y suponemos al lector habituado con la guía anterior sobre approle, role_id y secret_id.
De esta aprovecharemos el approle `jenkins` y su política de acceso a un secreto en un path.
Pero usaremos otro secreto en otro path y añadiremos ese path a la política.

## Variables de entorno para configurar el AVP

### Conseguir role_id y secret_id

Ir al namespace `myargocd` 
y abrir un terminal del repo server 
donde podemos ejecutar el `argocd-vault-plugin`.
De una instalación anterior a esta prueba de concepto, tenemos en namespace `myargocd` en la instancia de `myargocd-repo-server`:
Los valores de `VAULT_ADDR`, `AVP_TYPE` y `AVP_AUTH_TYPE` son correctos.
```
echo $VAULT_ADDR && echo $AVP_TYPE && echo $AVP_AUTH_TYPE && echo $AVP_ROLE_ID && echo $AVP_SECRET_ID
	http://vault.vault-infra.svc.cluster.local:8200
	vault
	approle
	{role_id inadecuado}
	{secret-id desfasado}
```

Vamos al namespace y pod de vault y 
usamos lo descrito para obtener un secret-id para el role_id definido.
```
vault login hvs.MbBT9J9ZXyGvlJCjV8CG1IjD
	Success! ---
vault read auth/approle/role/jenkins/role-id
	role_id    9fa0a37a-d130-0b6c-8b30-a18fb203dc10
vault write -force auth/approle/role/jenkins/secret-id
	secret_id             25cf360f-3171-74c6-5cf0-f71cbc28d729
	secret_id_accessor    4bd420b4-2f19-264a-7575-2f0931f3b0fa
	secret_id_num_uses    0
	secret_id_ttl         0s
```

### Paso de variables de entorno por Secret
El repo-server carga los valores como variables de entorno 
desde un secret `argocd-vault-plugin-credentials` que vamos a crear.

Aplicar este fichero con los valores oportunos pasados por el codificador base64.
Para ofuscar un valor en Base64 **NO USAR BAJO NINGÚN CONCEPTO**
este comando, que añade un \n final 
`echo "Valor a ofuscar" | base64`. 
Esto causó horrores intentando hacer que funcionase la conexión de AVP a Vault.

Fichero a aplicar en el namespace `myargocd` con todos los valores en base64.
```
kind: Secret
apiVersion: v1
metadata:
  name: argocd-vault-plugin-credentials
  namespace: argocd
type: Opaque
data:
  AVP_AUTH_TYPE: approle
  AVP_TYPE: vault
  AVP_ROLE_ID: your_role_id
  AVP_SECRET_ID: your_secret_id
  VAULT_ADDR: your_vault_addr
```
Una vez aplicados los valores ofuscados se pueden ver los valores cargados revelándolos
en el apartado de Secrets del namespace `myargocd`.

Para que el `repo-server` cargue los valores en este Secret como variables de entorno, 
ir a Deployments -> Repo Server y en la pestaña de `Environment` 
usar `All values from existing ConfigMaps or Secrets (envFrom) ConfigMap/Secret`. 
Esto escribe el `envFrom` dentro de una de las instancias de `containers` (a la altura de las sondas y volume mounts) y allí se respeta.
No se puede editar manualmente en el YAML.

El despliegue de repo-server necesita un reinicio para adquirir las variables de entorno en un nuevo pod.

#### Otras formas de definir las variables de entorno
La forma de definir las variables de entorno en el repo server es la más funcional encontrada.

Anteriormente, en la fuente del tutorial se observaba:

>The only thing left to do is to make that secret available as environment variables in the argocd-repo-server pods. Go back to the argocd-repo-server deployment where you initially added the initContainer and add an envFrom pointing to the secret you just created.

```
containers:
- name: argocd-repo-server
  volumeMounts:
  - name: custom-tools
    mountPath: /usr/local/bin/argocd-vault-plugin
    subPath: argocd-vault-plugin
  envFrom:
    - secretRef:
        name: argocd-vault-plugin-credentials
```
Cuidado que si los despliegues de ArgoCD están gestionados por _openshif_gitops_ habrá que definirlo en el YAML de su manejador, el ACD `myargocd`:
```
spec:
  repo:
    envFrom:
      - secretRef:
          name: argocd-vault-plugin-credentials
```

>That is it! You should now have a configured plugin pointing to your Vault. We are now ready to test out the plugin!

Pues no. La entrada `envFrom` se borra y desaparece del YAML si se pretende meter en el YAML. Curiosamente, si que se conserva el `envFrom` si se pone en el _initContainer_, pero pasar variables de entorno desde un _initContainer_ requiere soluciones demasiado creativas.

Repasando el yaml que define el yaml de este CRD caemos en cuenta de que se puede definir como variables individuales (!)
[https://github.com/redhat-developer/gitops-operator/blob/master/config/crd/bases/argoproj.io_argocds.yaml](https://github.com/redhat-developer/gitops-operator/blob/master/config/crd/bases/argoproj.io_argocds.yaml)
```
  repo:
    env:
      - name: VAULT_ADDR
        valueFrom:
          secretKeyRef:
            name: argocd-vault-plugin-credentials
            key: VAULT_ADDR
```
Este método funciona pero no es tan compacto como el propuesto en primer lugar.

## Creación del secreto
Para desplegar una aplicación de ejemplo es necesario crear
otro secreto en el path `avp/test`, lo que requiere los ya conocidos:
```
vault secrets enable -path=avp kv-v2
vault kv put avp/test sample=secret
	== Secret Path ==
	avp/data/test

	======= Metadata =======
	Key                Value
	---                -----
	created_time       2023-08-07T05:57:40.32059702Z
	custom_metadata    <nil>
	deletion_time      n/a
	destroyed          false
	version            1 

vault kv get avp/test
	== Secret Path ==
	avp/data/test
	===== Data =====
	Key       Value
	---       -----
	sample    secret
```
Es necesaria una policy para leer `avp/test`.
Reciclamos la policy `jenkins` ya asociada al role homónimo

https://vaultinfra.apps.k8spro.nextret.net/ui/vault/policy/acl/jenkins
```
# Read-only permission on secrets stored at 'secret/data/mysql/webapp'
path "secret/data/mysql/webapp" {
  capabilities = [ "read" ]
}
# Más acceso para esta política.
path "avp/data/test" {
  capabilities = [ "read" ]
}
```
No se ha encontrado la forma de modificar la política desde CLI.

## Configuración aplicación ArgoCD

Usaremos la aplicación ejemplo definida en https://github.com/werne2j/arogcd-vault-plugin-demo 
donde `example-secret.yaml` contiene:
- Una marca <sample> como el `sample` definido para el secreto en Vault.
- La anotación `avp.kubernetes.io/path: "avp/data/test"` que coincide con el secret path devuelto para el secreto en Vault.

```
kind: Secret
apiVersion: v1
metadata:
  name: example-secret
  annotations:
    avp.kubernetes.io/path: "avp/data/test"
type: Opaque
stringData:
  sample-secret: <sample>
```

A través de la ruta `myargocd-server` llegamos a [https://myargocd-server-myargocd.apps.k8spro.nextret.net](https://myargocd-server-myargocd.apps.k8spro.nextret.net)

Para obtener la password del usuario
```
oc extract secret/myargocd-cluster -n myargocd --to=-
	# admin.password
	5JmxFBg23eAcizLHvO0fNYEbdRPjXTq8
```

Y a partir de aquí crear una aplicación tal como indica el tutorial de referencia.

> Open ArgoCD and create a new application

> We are going to name it sample-secret and put it in the default project

> I have a sample repo that we will use to pull a example secret file from at https://github.com/werne2j/arogcd-vault-plugin-demo

> We will put the secret in-cluster (Within the cluster ArgoCD is installed) and in the default namespace

> The last piece needed is to specify the argocd-vault-plugin plugin to be used

> Now we can click the create button and see if it worked!

> You should see an application created in the ArgoCD UI

> And if you click the application, you will hopefully see this:

> If so, you have successfully used the argocd-vault-plugin! We can confirm this by looking for the secret in Kubernetes and checking its value:

El tutorial sugiere aquí refrescar el valor en Vault y volver a sincronizarlo.
Para el refresco con el hard refresh ver la siguiente sección **Sincronización**

> However we are not done yet! One of the great things about the plugin is that if the value changes in Vault we can update the value in the cluster with little effort. So update the value in vault:

```
vault kv put avp/test sample=new_secret
```

> Now in ArgoCD you can do a hard refresh, this will perform a dry-run of the plugin

> Now you should notice that is application is out of sync:

> This means that the plugin performed the dry run and determined that the output was different than what was currently in the cluster. Now all we have to do is sync the application and we should see the application back green!

## Despliegue en otros namespaces

A efectos de un despliegue en ArgoCD hay que contar con un conjunto de ámbitos:

- El **clúster**, que en esta prueba de concepto se restringe al clúster local.
- El **proyecto ArgoCD**, que es una entidad que tiene sentido en el ámito de ArgoCD.
- El **namespace** o **project** de **OpenShift**. 
  Es la entidad que agrupa recursos de forma lógica en OpenShift.
  Hay que tener cuidado de no confundirlo con el proyecto de ArgoCD.

Con una instancia de ArgoCD fresca y sin más configuración 
hay una limitación importante: _Sólo se puede desplegar al propio namespace de ArgoCD_. En esta prueba de concepto, `myargocd`.
Si al crear una app de ArgoCD se le da como destino un namespace sin preparar nada, tendremos el error:
```
ComparisonError
Namespace "mynamespace" 
for Secret "example-secret" 
is not managed
```

En [https://access.redhat.com/solutions/6158462](https://access.redhat.com/solutions/6158462) 
se proponen dos soluciones en función de la granularidad que se quiera dar del control sobre el namespace destino.

### Control total del namespace destino

Esta solución consiste en crear (borrar si ya existe) 
el namespace de forma que sea gestionado por ArgoCD.
Esto implica que ArgoCD puede hacer cualquier cosa en el namespace.

```
cat << EOF >> nstest.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mynamespace
  labels:
    argocd.argoproj.io/managed-by: myargocd
EOF

oc apply -f nstest.yaml
	namespace/mynamespace created
```

Elementos a sustituir en el manifiesto:
- `name: mynamespace`: new namespace to be managed by an existing Argo CD instance.
- `argocd.argoproj.io/managed-by: myargocd`: namespace where Argo CD is deployed.

Con esto ha sido posible deplegar la aplicación al nuevo namespace manejado por ArgoCD.

### Control parcial  del namespace destino

Se deja aquí anotada la opción que da control a ArgoCD con una granularidad fina de permisos, ya que el artículo requiere una cuenta de RedHat para acceder a leerlo.

> There are two options to grant permissions to ArgoCD 
to manage different namespaces. First option applyes roles and rolebindings 
and it is referenced in another solution (https://access.redhat.com/solutions/5875661). 
This solutions adds more flexibility as the resources and verbs 
that are granted can be defined.

>It is needed to create a Role and a RoleBinding to give privileges to the new ArgoCD instance. This way, ArgoCD will be able to create resources in a different namespace.

>The `role.yaml` should be similar to the one below, but it can be configured with different verbs depending on the user case:

```
$ cat << EOF >> role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: <role-name>
  namespace: <target-ns>
rules:
- apiGroups:
  - "*"
  resources:
  - "*"
  verbs:
  - Get
  - List
  - Watch
  - Patch
EOF

$ oc create -f  role.yaml
```
The RoleBinding should be similar to the following:

```
$ cat << EOF >> rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: RoleBinding
metadata:
  name: <role-binding-name>
  namespace: <target-ns>
roleRef:
  apiGroup: rbac.authorization.k8s.io  
  kind: Role
  name: <role-name>
subjects:
- kind: ServiceAccount
  name: <application-controller-name> 
  namespace: <application-controller-namespace> 
EOF

oc create -f  rolebinding.yaml
```
Valores a sustituir:
- `role-binding-name`: Nombre a voluntad para el role binding.
- `role-name`: Nombre a voluntad para el role.
- `target-ns`: El namespace a controlar ya creado.
- `application-controller-name`: Suponemos para la prueba de concepto el `myargocd-application-controller`. 
- `application-controller-namespace`: Suponemos para la prueba de concepto el `myargocd`. 


> After creating the Role and RoleBindig, the sync process should finish successfully.

No lo hace pero por la necesidad ya indicada del tutorial de hacer un hard refresh para el caso de los secretos.

## Creación de objetos para desplegar una app en ArgoCD

Se ha visto como es necesario crear el namespace destino de forma que sea controlado por ArgoCD para poder desplegar.

Del mismo modo, el proyecto de ArgoCD también tiene algunas sutilidades. Veamos un modo conveniente de crearlos. 
Los objetos creados de forma conveniente tienen una ventaja: Aparecen en los desplegables de la página de creación de una app en la UI de ArgoCD.

### Creación del proyecto

El proyecto se puede crear sin más en la UI de ArgoCD.

### Registrar el repositorio git

Para repositorios públicos esto no es necesario, pero para repos privados protegidos con una clave privada lo siguiente es necesario. Y de paso y como se ha dicho, aparece en el desplegable de repositorios.

Se recomienda tener un mínimo de repositorios de configuración de ArgoCD y luego usar el path relativo a la raíz. En la prueba de concepto se han usado repos específicos con `.` como path para usarlos directamente en su raíz.

De otro proyecto en otra entidad tomamos este ejemplo.

La autenticación se hace por una clave privada que tendremos en un fichero de texto llamado en este ejemplo `id_rsa` 
```
-----BEGIN RSA PRIVATE KEY----- 
MIIEowIBAAKCAQE(…)
(…)OZmfh6DQ3D6pTGDPwxFFhX5sLrwshSgu11bW9
-----END RSA PRIVATE KEY-----
```
Se añade el URL de git repo el proyecto.
```
argocd repo add \
  git@gitlab.irtve.rtve.int:kubernetes/rtve-app-pf-play.git
	
	Repository 'git@gitlab.irtve.rtve.int:kubernetes/rtve-app-pf-play.git' added
```
Si el repositorio es privado y no se registra debidamente en ArgoCD, cuando se cree la aplicación se obtendrá un error como el siguiente:
```
Unable to create application: application spec for pf-news is invalid: 
InvalidSpecError: application repo git@gitlab.irtve.rtve.int:kubernetes/rtve-app-pf-news.git is not permitted in project 'rtve-pro'
```

### Permisos en el namespace destino
Esta es una solución alternativa a las vistas anteriormente, que funcionó con el `gitops-operator`, no en una instancia personalizada.

Para que un proyecto de ArgoCD pueda desplegar en un namespace de Openshift es necesario ejecutar el comando `argocd proj add-destination <PROJECT> <CLUSTER>,<NAMESPACE>`, que permite que el namespace de Openshift sea destino de las aplicaciones en el proyecto ArgoCD. Esta operación es necesaria una sola vez para todas las aplicaciones en ese proyecto.
```
argocd proj add-destination \
	rtve-pro \
	https://kubernetes.default.svc \
	rtve-pf
```
Si no se ha permitido que el proyecto ArgoCD despliegue en el namespace de OpenShift, cuando se cree la aplicación se obtendrá un error como el siguiente:
```
Unable to create application: application spec for pf-news is invalid: 
InvalidSpecError: application destination {https://kubernetes.default.svc rtve-pf} is not permitted in project 'rtve-pro'
```
Para disponer de los permisos de creación de aplicaciones en un namespace de OpenShift se eleva (previamente) el serviceaccount de ArgoCD a admin en Openshift.
```
>oc adm policy add-role-to-user admin system:serviceaccount:openshift-gitops:openshift-gitops-argocd-application-controller -n rtve-pf
```
La falta de esta elevación podría haber dado lugar a un mensaje como este
```
Unable to create application: permission denied: applications, create, rtve-pro/pf-news, sub: CiRhMzk4NDliZC05ZWQxLTRlMWUtYTdiMi1kOTcyOWRlMDEwNmYSCW9wZW5zaGlmdA, iat: 2022-12-14T08:50:39Z
```

## Refresco y deprecación del AVP

El tutorial seguido habla de la necesidad de hacer un hard refresh y luego sincronizar.
El hard refresh es una subopción disponible en el botón del refresh de la UI,
y también se puede hacer desde línea de comandos. 
Después del hard refresh, por el método que sea, el sync de la aplicación ArgoCD trae los nuevos valores del Vault.

La explicación plausible es que el secreto fuente en ArgoCD no cambia, tiene la misma marca de sustitución.
Al hacer el hard refresh se hace un _dry run_ en el que ArgoCD ve que la salida del plugin es distinta de lo que tiene,
y es en ese momento cuando ArgoCD considera que está `OutOfSync` y ejecutará el siguiente sync realmente.
```
argocd app get sample-secrets-mynamespace --hard-refresh
	time="2023-08-09T11:03:35+02:00" level=warning msg="spec.plugin.name is set, which means this Application uses a plugin installed in the argocd-cm ConfigMap. Installing plugins via that ConfigMap is deprecated in Argo CD v2.5. Starting in Argo CD v2.6, this Application will fail to sync. Contact your Argo CD admin to make sure an upgrade plan is in place. More info: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.4-2.5/"
	Name:               myargocd/sample-secrets-mynamespace
	Project:            myargocdproject
	Server:             https://kubernetes.default.svc
	Namespace:          mynamespace
	URL:                https://myargocd-server-myargocd.apps.k8spro.nextret.net/applications/sample-secrets-mynamespace
	Repo:               https://github.com/werne2j/arogcd-vault-plugin-demo.git
	Target:             HEAD
	Path:               .
	SyncWindow:         Sync Allowed
	Sync Policy:        <none>
	Sync Status:        OutOfSync from HEAD (b7cec5a)
	Health Status:      Healthy

	GROUP  KIND    NAMESPACE    NAME            STATUS     HEALTH  HOOK  MESSAGE
		   Secret  mynamespace  example-secret  OutOfSync                secret/example-secret configured

oc extract secret/example-secret -n mynamespace --to=-
	# sample-secret
	valor nuevo
```
Recordatorio:
```
oc extract secret/myargocd-cluster -n myargocd --to=-
argocd login myargocd-server-myargocd.apps.k8spro.nextret.net
```
Respecto al mensaje que aparece en el hard refresh:
```
	level=warning 
	msg="spec.plugin.name is set, which means this Application 
	uses a plugin installed in the argocd-cm ConfigMap. 
	Installing plugins via that ConfigMap is deprecated in Argo CD v2.5. 
	Starting in Argo CD v2.6, this Application will fail to sync. 
	Contact your Argo CD admin to make sure an upgrade plan is in place. More info: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.4-2.5/"
```
De hecho estar, ya estamos en ArgoCD 2.6 sever y no ha fallado...
```
argocd version
	argocd: v2.5.3+0c7de21
	  BuildDate: 2022-11-28T17:22:28Z
	  GitCommit: 0c7de210ae66bf631cc4f27ee1b5cdc0d04c1c96
	  GitTreeState: clean
	  GoVersion: go1.18.8
	  Compiler: gc
	  Platform: windows/amd64
>>	argocd-server: v2.6.7+unknown
```
En cualquier caso, no es nuevo el tema de deprecar la configuración 
del plugin AVP con el `argocd-cm` configMap y sería bueno 
plantear el uso de contenedores sidecar para este cometido.

- https://github.com/argoproj/argo-cd/issues/11689
	- https://argo-cd.readthedocs.io/en/stable/user-guide/config-management-plugins/
		- https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
