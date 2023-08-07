# Prueba de concepto de instalación de ArgoCD Vault Plugin (AVP)

## Resumen de ArgoCD Vault Plugin (AVP)

ArgoCD Vault Plugin (AVP) es un ejecutable de Linux que ArgoCD invoca antes 
de desplegar un manifiesto de un objeto en OpenShift 
para sustituir en el manifiesto unas marcas especiales 
por valores secretos almacenados en un sistema de gestión de secretos.

Típicamente este manifiesto a modificar será el de un `Secret` (también un `ConfigMap`) con este aspecto:

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

La anotación `avp.kubernetes.io/path:` indica que el manifiesto está sujeto a ser modificado por ArgoCD Vault Plugin (AVP)
con los valores que un sistema externo almacena en un path interno de ese sistema `"avp/data/test"`.

El sentido del path en ese sistema depende del sistema que se configure, y aplica por igual a todos los manifiestos que esa instancia de ArgoCD maneje con AVP.

En última instancia, en esta prueba de concepto se consigue que el código fuente de la aplicación no tenga almacenado ningún secreto.

El aspecto a mejorar, es que una vez desplegado es secreto este queda visible para los administradores de cluster y parar los administradores del namespace donde reside.
Ésto último se puede mejorar al coste de una mayor complicación.

## Objetivo de esta prueba piloto

La prueba piloto se divide en dos grandes áreas:

- Instalación de una infraestructura en OpenShift que facilite la prueba piloto en si.
- Las operaciones de configuración de la prueba piloto que permiten desplegar una aplicación con un Secret donde AVP pondrá el valor de un secreto externo en la marca prevista.

### Infraestructura

La infraestructura a instalar es:

- [Helm y Go](10-helm-go.md) como prerrequisitos para poder instalar ArgoCD.
- [Vault](11-vault.md) como sistema externo que gestionará los secretos.
- [ArgoCD](12-argocd.md) como Custom Resource Definition (CRD) lo que facilita la configuración respecto al Operador ofrecido por OpenShift, más estricto a la hora de hacer cambios.


### Configuración y prueba

La configuración más compleja es definir como el ArgoCD Vault Plugin (AVP) es capaz de presentarse
ante el sistema externo, demostrar su identidad (autenticación/authn) y a partir de estar lograr acceso para leer (autorización/authz) el valor que ha de escribir en la marca del manifiesto que ha de modificar antes de su despliegue.

Para authn y authz del AVP hay dos opciones consideradas en esta prueba, se optó por la primera.

- [Approle de Vault](30-approle.md), en que se usan "cuentas" definidas en Vault, los `role_id` y el equivalente de sus constraseñas, los `secret_id`.
- [Service account de Openshift](31-sa-rbac.md), en que se usan las cuentas de servicio de Openshift y la autorización RBAC (Orle Based Access Control) de OpenShift.

Una vez configurado authn y authz, el sistema externo puede interpretar el `path` 
(o valor dado en la anotación para que AVP actúe) y permitir que AVP consulte el secreto para hacer la sustitución en el manifiesto.

El último paso es [crear una aplicación en ArgoCD](40-app.md) y ver como efectivamente se hace la sustitución.

