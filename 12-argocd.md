# Instalación de ArgoCD

ArgoCD, al igual que Vault, es una de las precondiciones necesarias para poder usar el ArgoCD Vault Plugin (AVP).

Para poder configurar ArgoCD a nuestro antojo (Vault lo requiere, o Deus Vault si se prefiere)
es mejor no instalar el operador de ArgoCD para Openshift 
sino instalar el **operador OpenShift GitOps** que es el propio de OpenShift.

## Instalación de operador OpenShift GitOps

Seguir lo aquí indicado, instalando para todos los namespaces del cluster.

- [https://github.com/redhat-developer/openshift-gitops-getting-started](https://github.com/redhat-developer/openshift-gitops-getting-started)

>Log into OpenShift Web Console as a cluster admin and navigate to the Administrator perspective and then Operators → OperatorHub.
>
>In the OperatorHub, search for OpenShift GitOps and follow the operator install flow to install it.


## Instancia personalizada de ArgoCD

En próximos intentos descubriremos que es necesario 
hacer un despliegue de ArgoCD personalizado (con el Vault Plugin) 
ya que no se puede modificar el gestionado por openshift-gitops
(un operador muy temperamental sobre lo que él gestiona).

Para empezar a probar el despliegue de una instancia personalizada seguiremos el artículo:
[https://github.com/redhat-developer/openshift-gitops-getting-started#additional-argo-cd-instances](https://github.com/redhat-developer/openshift-gitops-getting-started#additional-argo-cd-instances)

>Additional Argo CD instances
>
>Although OpenShift GitOps by default installs an Argo CD instance for the cluster, there are use-cases where different application teams might need their own Argo CD instance confined to their own namespaces and applications. Therefore, OpenShift GitOps support creating additional Argo CD instances declaratively through creating ArgoCD resources.
>
>In the OpenShift Web Console, create a project called myargocd and then click on the plus sign in the top navigation bar. Then, paste the following in the YAML editor, and click on Create afterwards:

En la consola crear el namespace `myargocd` y aplicar este manifiesto desde el icono del símbolo **+**
```
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: myargocd
spec:
  server:
    route:
      enabled: true
```
>Alternatively, you can run the following CLI commands:

Se desconoce de donde sale este `argo/argocd.yaml`, o sea que mejor aplicar el YAML anterior.
```
oc new-project myargocd
oc create -f argo/argocd.yaml
```

### Acceso a los servidores ArgoCD

>Click on the Topology to view the Argo CD instance deployed in your namespace.
>
>Click on the Argo CD URL to open the Argo CD dashboard.

El pod `myargocd-server` es el que tiene la flecha con el hover Open URL.

>As described previously, Argo CD upon installation generates an initial admin password which is stored in a Kubernetes secret called `[argocd-name]-cluster`. Run the following command to decrypt the admin password and log into Argo CD dashboard:

Método que proponen:
```
oc get secret myargocd-cluster -n myargocd -ojsonpath='{.data.admin\.password}' | base64 -d
	
	5Jmx...Tq8
```
También se puede usar el método tradicional que no requiere entrar a un bash para tener base64:
```
oc extract secret/myargocd-cluster -n myargocd --to=-

	# admin.password
	5Jmx...Tq8
```
Para el operador openshift-gitops en otro namespace
```
oc extract secret/openshift-gitops-cluster -n openshift-gitops --to=-
```
Como resultado, quedan dos servidores ArgoCD accesibles, el por defecto y el que se acaba de instalar, respectivamente:
- [https://openshift-gitops-server-openshift-gitops.apps.k8spro.nextret.net/applications](https://openshift-gitops-server-openshift-gitops.apps.k8spro.nextret.net/applications)
- [https://myargocd-server-myargocd.apps.k8spro.nextret.net/applications](https://myargocd-server-myargocd.apps.k8spro.nextret.net/applications)

NB: En la vista de topología está en enlace a cada argo server, pero al final la URL no deja de ser:

	https://${namespace}-server-${namespace}.apps.${cluster}

## Utilidades

### Instalación de ArgoCD línea de comandos

El cliente de ArgoCD de línea de comandos puede ser de utilidad a futuro.

>The argocd CLI makes it easier to work with Argo CD. Through it, you can manage Argo CD projects, applications, cluster credentials, and more.
>
>To install the argocd CLI, follow these steps:

>- Download the latest Argo CD binary file from https://github.com/argoproj/argo-cd/releases/latest.
>- If you are using Linux, download the CLI and add it to your path:
```
$ sudo curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
$ sudo chmod +x /usr/local/bin/argocd
```
>If everything went well, you will see the following output by running the argocd version command. Ignore the error message you see in the last line; it is an expected message as we haven’t logged in to any OpenShift cluster yet:
```
argocd version

	argocd: v2.2.1+122ecef
	  BuildDate: 2021-12-17T01:31:40Z
	  GitCommit: 122ecefc3abfe8b691a08d9f3cecf9a170cc8c37
	  GitTreeState: clean
	  GoVersion: go1.16.11
	  Compiler: gc
	  Platform: linux/amd64
	FATA[0000] Argo CD server address unspecified
```

### API de ArgoCD

La API de ArgoCD puede ser útil a futuro para automatizar operaciones administrativas de recursos de ArgoCD.

- [https://myargocd-server-myargocd.apps.k8spro.nextret.net/swagger-ui](https://myargocd-server-myargocd.apps.k8spro.nextret.net/swagger-ui)
- [https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/](https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/)

Ejemplo de login via API. `-k`para evitar el error de TLS.
```
ARGOCD_SERVER=https://myargocd-server-myargocd.apps.k8spro.nextret.net
curl -k $ARGOCD_SERVER/api/v1/session -d $'{"username":"admin","password":"5Jm...Tq8"}'
```

## TODO ArgoCD en cualquier namespace

La instalación personalizada es capaz de desplegar solo en su propio namespace. 

Para desplegar en un conjunto de namespaces (restringido por seguridad) se sigue esta guía.

- [https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/)
