# Instalación de ArgoCD Vault Plugin (AVP)

Instalar AVP se resume a que en uno de los servidores de ArgoCD se disponga de 
un binario ejecutable capaz de hacer cambios en los manifiestos que maneja ArgoCD. Este binario debe:
- Estar registrado como plugin para que se pueda seleccionar durante la creación de una aplicación ArgoCD.
- Ser capaz de recibir configuración de como acceder a un repositorio de secretos externo, lo que se hará a través de variables de entorno.
- Con la configuración dada, acceder al repositorio de secretos y con lo obtenido realizar cambios en los manifiestos, poniendo en ellos información sensible que no debiera estar en ningún repositorio de código abierto a cualquiera.
Recordatorio: Los manifiestos para poder ser enriquecidos con secretos por ArgoCD deben estar anotados, la anotación debe dar un path o información de como llegar al secreto deseado en el sistema externo configurado, y tener unas marcas de sustitución con el nombre atributo del secreto rodeado por `<` y `>`. 

## Retos, opciones y alternativas

**Forma de transferir los secretos**

En esta prueba se hace una instalación del tipo que ArgoCD despliega secretos de K8s que contienen los secretos de Valt visibles para administradores de cluster y namespace. Es un riesgo asumido y asumible si las políticas de seguridad en efecto lo permiten.

**Tipo de instalación del plugin**

Existe la alternativa de usar contenedores inyectores, que durante el ciclo de vida del contenedor principal inyectan en la memoria de este el secreto acabado de leer de Vault.
- [https://developer.hashicorp.com/vault/docs/platform/k8s/injector](https://developer.hashicorp.com/vault/docs/platform/k8s/injector)

La instalación tal como se propone plantea varias opciones:
- La forma de instalar el AVP usada en esta prueba de concepto es la de 
los llamados `initContainer` que arrancan con el contenedor compartiendo espacio de disco.
El `initContainer` es quien se encarga de obtener el plugin y dejarlo en el contenedor principal antes de salir de escena al acabar la inicialización.
- Hay alternativas como crear imágenes del servidor ArgoCD con el plugin ya instalado.

**Modificación de componentes del operador de ArgoCD**

Las configuraciones requeridas hacen necesario reconfigurar alguno de los servidores de ArgoCD.

Se ha observado que el operador *gitops-operator* o "ArgoCD de Red Hat" no siempre permite estas reconfiguraciones, y se ha optado por una instancia personalizada.

**TTL de los secret id en Vault approle**

En este modo de autenticación y autorización en Vault, existe un id de rol inmutable (asimilable al "nombre de usuario" del rol) y un secret id que hace las funciones de password del rol.
El id de secreto tiene una validez temporal de máximo 720 horas o 30 días. Suficiente para una prueba de concepto, pero no para explotación.

Esta limitación es buscada para forzar una política de renovación de secretos, entendida como buena práctica.

## Instalación ArgoCD Vault Plugin (AVP)

Seguiremos la sección **How to Install and use the Plugin** de [https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05](https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05)
hasta llegar al punto en que se empiezan a configurar approles. En ese momento seguiremos en
[Autenticación y autorización por approle en Vault](22-avp-vault-approle.md) y
[Despliegue de aplicaciones en ArgoCD con Vault approle](23-avp-argocd-approle.md) donde se explica en detalle al margen de la instalación.


### Make Plugin Available to be used by ArgoCD

>In order to use the plugin, we first need to download the plugin and then register the plugin with ArgoCD to use as a custom plugin. There are a couple different methods for doing this that you can read about here but for this example we are going to use the Volume Mount strategy. In order to do this, we will have to customize the argocd-repo-server deployment:

Se intenta inyectar un `initContainer` en el `repo server` para que al arrancar descargue el plugin y lo copie donde toca.

**Cómo no hacerlo**

O también "con *openshift-gitops* hemos topado":
- Si se edita el deployment del repo server mientras este ejecuta:
```
Error "Forbidden: pod updates may not add or remove containers" for field "spec.initContainers".
```
- Si se para y se edita, salta este warning y no se guarda. Soltar el warning forma parte de lo correcto en OpenShift 
[http://openshift.github.io/openshift-origin-design/designs/administrator/olm/warn-managed-resource/](http://openshift.github.io/openshift-origin-design/designs/administrator/olm/warn-managed-resource/).
```
This resource is managed by ArgoCD
ACD
openshift-gitops
 and any modifications may be overwritten. Edit the managing resource to preserve changes.
http://openshift.github.io/openshift-origin-design/designs/administrator/olm/warn-managed-resource/
```

**Qué hay que montar**

Estos son los cambios necesarios para poder inyectar el plugin AVP con 
el initContainer `download-tools` en el `repo server`,
con el que comparte un `volumeMount` llamado `/custom-tools`.
El volumen compartido se monta en un directorio de trabajo del initContainer,
pero para el repo server es el directorio de binarios en el path del sistema.
```
containers:
- name: argocd-repo-server
  volumeMounts:
  - name: custom-tools
    mountPath: /usr/local/bin/argocd-vault-plugin
    subPath: argocd-vault-plugin

volumes:
- name: custom-tools
  emptyDir: {}

initContainers:
- name: download-tools
  image: alpine:3.8
  command: [sh, -c]
  args:
    - wget -O argocd-vault-plugin
      https://github.com/argoproj-labs/argocd-vault-plugin/releases/download/v1.6.0/argocd-vault-plugin_1.6.0_linux_amd64

      chmod +x argocd-vault-plugin &&\
      mv argocd-vault-plugin /custom-tools/
  volumeMounts:
    - mountPath: /custom-tools
      name: custom-tools
```

### Inserción del plugin 

En el namespace donde esté la instancia personalizada de ArgoCD (`myargocd` en esta prueba), 
ir al despliegue del `argocd-repo-server`.
En su ficha aparece debajo del nombre un enlace _managed by_.
Acceder a ese recurso de tipo ArgoCD y editar el YAML
cambiando el `repo {}` por esta estructura con
`volumes`, `volumeMounts` e `initContainers`:
```
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
spec:
  repo:
    volumes:
      - emptyDir: {}
        name: custom-tools
    volumeMounts:
      - mountPath: /usr/local/bin/argocd-vault-plugin
        name: custom-tools
        subPath: argocd-vault-plugin
    initContainers:
      - command:
          - sh
          - '-c'
        args:
          - >-
            cd /tmp

            wget -O argocd-vault-plugin https://github.com/argoproj-labs/argocd-vault-plugin/releases/download/v1.6.0/argocd-vault-plugin_1.6.0_linux_amd64

            chmod +x argocd-vault-plugin && mv argocd-vault-plugin /custom-tools/
        image: 'alpine:3.8'
        name: download-tools
        volumeMounts:
          - mountPath: /custom-tools
            name: custom-tools
```

Es interesante ver como en el arranque del initContainer se va
al directorio /tmp para hacer una descarga a la que luego se le dan permisos de ejecución y luego se envía al directorio compartido con el repo server.

Se propone que la descarga del plugin sea de un repositorio controlado y no directamente de github.

Para depurar el arranque del initContainer con `oc logs` 
hay que usar la opción `-c download-tools` después del id del pod, según
[https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/](https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/)
```
oc logs myargocd-repo-server-74cbcc69b7-wzfkw -c download-tools
	Connecting to github.com (140.82.121.3:443)
	Connecting to objects.githubusercontent.com (185.199.108.133:443)
	argocd-vault-plugin   42% |*************                  | 17335k  0:00:01 ETA
	argocd-vault-plugin   74% |**********************         | 30119k  0:00:00 ETA
	argocd-vault-plugin   92% |****************************   | 37607k  0:00:00 ETA
	argocd-vault-plugin  100% |*******************************| 40672k  0:00:00 ETA
```
En este punto cuando ya ha arrancado el contenedor principal con el plugin copiado y ejecutable, 
se puede entrar por terminal y validar que ejecute.
```
argocd-vault-plugin

	This is a plugin to replace <placeholders> with Vault secrets
	Usage:
	  argocd-vault-plugin [flags]
	  argocd-vault-plugin [command]
	Available Commands:
	  completion  generate the autocompletion script for the specified shell
	  generate    Generate manifests from templates with Vault values
	  help        Help about any command
	  version     Print argocd-vault-plugin version information
	Flags:
	  -h, --help   help for argocd-vault-plugin
	Use "argocd-vault-plugin [command] --help" for more information about a command.

argocd-vault-plugin version

	argocd-vault-plugin v1.6.0 (947668d260d7e630b3dbc7d9dadfc4ed0650ccd3) BuildDate: 2021-12-01T21:37:22Z
````
Esta ejecución a demanda se puede hacer incluso en otro Linux incluído WSL-2 en Windows, lo que resultó esclarecedor para trazar algún error de configuración (como se verá, pasando variables de entorno).

### Registrar el plugin en ArgoCD

Por plugin disponible (_available_) se entiende que el repo server ya lo puede ejecutar, aunque de momento no es más que un binario en el path de ejecutables.

> Once the plugin has been made available, 
the next step is to register the plugin with ArgoCD itself. 
This is a pretty straight forward step. 
There is a configMap called `argocd-cm`. All that is required to to go to that configMap and add:

En el configMap `argocd-cm` del namespace `myargocd` se efectúa este cambio.
Básicamente se le dice a ArgoCD que dispone de este plugin que durante la fase `generate` de ArgoCD deberá ser llamado con los parámetros para generar en el directorio actual.
A los parámetros `args` del plugin se le pueden añadir otros si se tiene claro donde se va.
```
data:
  configManagementPlugins: |-
    - name: argocd-vault-plugin
      generate:
        command: ["argocd-vault-plugin"]
        args: ["generate", "./"]
```

**gitops-operator no editable**

Al editar el configMap `argocd-cm` tendremos de nuevo el agradable aviso de que no es posible al ser un recurso manejado.
Editaremos el recurso manejante y situaremos la información así:
```
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
spec:
  configManagementPlugins: |-
    - name: argocd-vault-plugin
      generate:
        command: ["argocd-vault-plugin"]
        args: ["generate", "./"]
```

**Validación de la disponibilidad del plugin**

Para validar la disponibilidad del plugin:
- Rearrancar el reposerver (llevar a cero instancias, y el manejador subirá a 1 automágicamente).
- Entrar a la UI del servidor.
	- Crear una aplicación.
	- Scroll down hasta pasar los grupos _general, source, destination_
	- El desplegable del último grupo seleccionar _Plugins_
	- En la sección de _Plugins_ encontrar el _ArgoCD Vault Plugin_ en el desplegable de nombres.

**Deprecación de los argocd-cm CMP**

El proyecto ArgoCD tiene la intención de quitar el soporte de 
los Config Management Plugins (CMP) que usan configmap argocd-cm 
en favor del uso de sidecars (contenedores a los que se les manda un tarball con los manifiestos manejados y que devuelven otro tarball).
- [https://github.com/argoproj/argo-cd/issues/8117](https://github.com/argoproj/argo-cd/issues/8117)
- [https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/](https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/)

