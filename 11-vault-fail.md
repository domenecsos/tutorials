# Instalación de Vault según la documentación de OpenShift

La instalación de Vault según la documentación de OpenShift presenta algunas restricciones tal como se ha seguido:

- No crea la ruta de acceso al servicio que accede a Vault.
- No parece haber instalado la interfaz gráfica de usuario.

Por estos motivos se descarta, si bien interesa observar lo que ha instalado en `example-vault`.

- Persistent volume claim `data-example-vault-0`.
- Servicio `example-vault` que conecta por puerto 8200, pero sin rutas o ingress asociados.
- Replica set `example-vault-agent-injector`.
- Stateful set `example-vault`.


## Documentación

Para instalar Vault con Helm según OpenShift

- [https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/installing-helm.html](https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/installing-helm.html)
- [https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/configuring-custom-helm-chart-repositories.html](https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/configuring-custom-helm-chart-repositories.html)

Complementario

- [https://developer.hashicorp.com/vault/docs/platform/k8s/helm/openshift](https://developer.hashicorp.com/vault/docs/platform/k8s/helm/openshift)
- [https://cloud.redhat.com/blog/integrating-hashicorp-vault-in-openshift-4](https://cloud.redhat.com/blog/integrating-hashicorp-vault-in-openshift-4)

## Installing a Helm chart on an OpenShift Container Platform cluster

Fuente: [https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/configuring-custom-helm-chart-repositories.html](https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/configuring-custom-helm-chart-repositories.html)

>Prerequisites
>
>You have a running OpenShift Container Platform cluster and you have logged into it.
>
>You have installed Helm.

Procedimiento

> Create a new project:
```
$ oc new-project vault
	Now using project "vault" on server "https://api.k8spro.nextret.net:6443".
	You can add applications to this project with the 'new-app' command. For example, try:
		oc new-app rails-postgresql-example
	to build a new example application in Ruby. Or use kubectl to deploy a simple Kubernetes application:
		kubectl create deployment hello-node --image=k8s.gcr.io/serve_hostname
```

>Add a repository of Helm charts to your local Helm client:
```
$ helm repo add openshift-helm-charts https://charts.openshift.io/
	"openshift-helm-charts" has been added to your repositories
```
> Update the repository:
```
$ helm repo update
	Hang tight while we grab the latest from your chart repositories...
	...Successfully got an update from the "openshift-helm-charts" chart repository
	Update Complete. Happy Helming!
```

> Install an example HashiCorp Vault:
```
$ helm install example-vault openshift-helm-charts/hashicorp-vault
	NAME: example-vault
	LAST DEPLOYED: Tue Jun 13 12:53:24 2023
	NAMESPACE: vault
	STATUS: deployed
	REVISION: 1
	NOTES:
	Thank you for installing HashiCorp Vault!
	Now that you have deployed Vault, you should look over the docs on using
	Vault with Kubernetes available here:
	https://www.vaultproject.io/docs/
	Your release is named example-vault. To learn more about the release, try:
	  $ helm status example-vault
	  $ helm get manifest example-vault
```

Con `helm status example-vault` se obtiene la misma salida anterior.

Lista de instalaciones de Helm.
```
> helm list
NAME            NAMESPACE       REVISION        UPDATED                                 STATUS          CHART           APP VERSION
example-vault   vault           1               2023-06-13 12:53:24.3780837 +0200 CEST  deployed        vault-0.24.0    1.13.1
```
Manifiestos K8s generados por la instalación.
```
> helm get manifest example-vault
	---
	# Source: vault/templates/injector-network-policy.yaml
	apiVersion: networking.k8s.io/v1
	kind: NetworkPolicy
	metadata:
	  name: example-vault-agent-injector
	(...)
```
