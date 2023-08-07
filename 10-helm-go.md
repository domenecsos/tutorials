# Helm y Go 

Helm y Go son prerrequisitos para poder instalar ArgoCD.

ArgoCD se instalará como Custom Resource Definition (CRD) lo que facilita la configuración respecto al Operador ofrecido por OpenShift, más estricto a la hora de hacer cambios.

## Go

El siguiente documento "Installing Helm" indica los prerrequisitos y los pasos necesarios desde la propia consola OpenShift de la línea de comandos (CLI).

[https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/installing-helm.html](https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/installing-helm.html)

>Prerequisites: You have installed Go, version 1.13 or higher.

En nuestro escritorio de preferencia, en este ejemplo Windows,
instalamos la versión 1.20.5 Go `go1.20.5.windows-amd64.msi` desde [https://go.dev/doc/install](https://go.dev/doc/install)

Validamos la accesibilidad de Go:
```
go version
	
	go version go1.20.5 windows/amd64
```

Hemos instalado Go 1.20.5 > 1.13.

## Helm

### Instalar Helm desde páginas de Red Hat

El mismo documento "Installing Helm" indica los prerrequisitos y los pasos necesarios desde la propia consola OpenShift de la línea de comandos (CLI).

[https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/installing-helm.html](https://docs.openshift.com/container-platform/4.10/applications/working_with_helm_charts/installing-helm.html)

>You can also find the URL to the latest binaries from the OpenShift Container Platform web console by clicking the ? icon in the upper-right corner and selecting Command Line Tools.

- [https://console-openshift-console.apps.k8spro.nextret.net/command-line-tools](https://console-openshift-console.apps.k8spro.nextret.net/command-line-tools)
- [https://mirror.openshift.com/pub/openshift-v4/clients/helm/latest](https://mirror.openshift.com/pub/openshift-v4/clients/helm/latest)

### Instalación alternativa desde páginas de Helm

En el momento de hacer la prueba no funciona `http://developers.redhat.com/` raíz de las decargas propuetas.
Tomamos de forma genérica la página de instalación de Helm propiamente dicha [https://helm.sh/docs/intro/install/](https://helm.sh/docs/intro/install/) que sugiere usar la instalación comunitaria usando Chocolatey...

Dado que se disponía de **Chocolatey**,se hizo la instalación con esta herramienta y como administrador local.
```
choco install kubernetes-helm
	
	Chocolatey v1.3.0
	Installing the following packages:
	kubernetes-helm
	By installing, you accept licenses for the packages.
	Progress: Downloading kubernetes-helm 3.11.3... 100%

	kubernetes-helm v3.11.3 [Approved]
	kubernetes-helm package files install completed. Performing other installation steps.
	The package kubernetes-helm wants to run 'chocolateyInstall.ps1'.
	Note: If you don't run this script, the installation will fail.
	Note: To confirm automatically next time, use '-y' or consider:
	choco feature enable -n allowGlobalConfirmation
	Do you want to run the script?([Y]es/[A]ll - yes to all/[N]o/[P]rint): Y

	Downloading kubernetes-helm 64 bit
	  from 'https://get.helm.sh/helm-v3.11.3-windows-amd64.zip'
	Progress: 100% - Completed download of C:\Users\Admin\AppData\Local\Temp\chocolatey\kubernetes-helm\3.11.3\helm-v3.11.3-windows-amd64.zip (14.91 MB).
	Download of helm-v3.11.3-windows-amd64.zip (14.91 MB) completed.
	Hashes match.
	Extracting C:\Users\Admin\AppData\Local\Temp\chocolatey\kubernetes-helm\3.11.3\helm-v3.11.3-windows-amd64.zip to C:\ProgramData\chocolatey\lib\kubernetes-helm\tools...
	C:\ProgramData\chocolatey\lib\kubernetes-helm\tools
	 ShimGen has successfully created a shim for helm.exe
	 The install of kubernetes-helm was successful.
	  Software installed to 'C:\ProgramData\chocolatey\lib\kubernetes-helm\tools'

	Chocolatey installed 1/1 packages.
	 See the log for details (C:\ProgramData\chocolatey\logs\chocolatey.log).

	Did you know the proceeds of Pro (and some proceeds from other
	 licensed editions) go into bettering the community infrastructure?
	 Your support ensures an active community, keeps Chocolatey tip-top,
	 plus it nets you some awesome features!
	 https://chocolatey.org/compare
```
Verificando
```
helm version

	version.BuildInfo {
		Version:"v3.11.3", 
		GitCommit:"323249351482b3bbfc9f5004f65d400aa70f9ae7", 
		GitTreeState:"clean", 
		GoVersion:"go1.20.3"
	}
```

Parece que Helm instaló su propio Go 1.20.3 (casi tan al dia como el 1.20.5 anterior, que ahora parece innecesario). La versión 3.11.3 es algo más actual que la 3.11.1 del mirror de Red Hat.
