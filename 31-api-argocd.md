# ArgoCD API

Documentación de referencia:

- https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/

>You can find the Swagger docs by setting the path to /swagger-ui in your Argo CD UI. E.g. http://localhost:8080/swagger-ui.

Verificado en el servidor de la prueba de concepto:

-  https://myargocd-server-myargocd.apps.k8spro.nextret.net/swagger-ui


## Authorization

>You'll need to authorize your API using a bearer token. To get a token:

Detalles de esta llamada en 

- https://myargocd-server-myargocd.apps.k8spro.nextret.net/swagger-ui#operation/SessionService_Create

```
oc get secret myargocd-cluster -n myargocd -ojsonpath='{.data.admin\.password}' | base64 -d

export ARGOCD_PASSWORD=5JmxFBg23eAcizLHvO0fNYEbdRPjXTq8
export ARGOCD_SERVER=https://myargocd-server-myargocd.apps.k8spro.nextret.net

curl \
    --request POST --insecure \
    --data '{"username":"admin","password":"5JmxFBg23eAcizLHvO0fNYEbdRPjXTq8"}' \
	$ARGOCD_SERVER/api/v1/session 
		{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhcmdvY2QiLCJzdWIiOiJhZG1pbjpsb2dpbiIsImV4cCI6MTY5MzAzNjk5MSwibmJmIjoxNjkyOTUwNTkxLCJpYXQiOjE2OTI5NTA1OTEsImp0aSI6ImVhYmIxYjkwLTM3NzktNGRlZi1iNjZmLTM5NDZhZjRkZDdjNiJ9.NPgpHxmcbWXLAffQ-fePkBSPVtKvILeN6Chv5ogdNmI"}
```

El token según `jwt.io` es un JWT con `"iss": "argocd", "sub": "admin:login"` y algunos timestamps como información destacable.

## Acceso a información de ejemplo con el token autorizado

> Then pass using the HTTP Authorization header, prefixing with Bearer:

```
 curl \
	-H "Authorization: Bearer $ARGOCD_TOKEN" \
    --request GET --insecure \
	$ARGOCD_SERVER/api/v1/applications | jq '.'
```

La llamada anterior devuelve la información de las aplicaciones ya en formato legible con el `| jq '.'` final.
Con filtros más específicos podemos ver los nombres de las tres aplicacions disponibles.

```
| jq '.items[0].metadata.name'
"sample-secrets"

| jq '.items[1].metadata.name'
"sample-secrets-mynamespace"

| jq '.items[2].metadata.name'
"test-argo-cd"
```

Y en general se puede obtener todo tipo de información:

```
| jq '.items[1].spec'
{
  "source": {
    "repoURL": "https://github.com/werne2j/arogcd-vault-plugin-demo.git",
    "path": ".",
    "targetRevision": "HEAD",
    "plugin": {
      "name": "argocd-vault-plugin"
    }
  },
  "destination": {
    "server": "https://kubernetes.default.svc",
    "namespace": "mynamespace"
  },
  "project": "myargocdproject"
}
```



argocd app get <appName> --hard-refresh
https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
https://myargocd-server-myargocd.apps.k8spro.nextret.net/swagger-ui#operation/ApplicationService_Get
https://github.com/argoproj/argo-cd/issues/269
https://github.com/jessesuen/argo-cd/commit/8605e2e8d43e98651326b3bf9262d9d7b7eb75c4#diff-18d6bf6e8588f888e23c671094d44b6bba958c624dccb0f734f40cfe91b2f1f0
	if q.Refresh {
		_, err = argoutil.RefreshApp(appIf, *q.Name)
		if err != nil {
			return nil, err
		}
		a, err = argoutil.WaitForRefresh(appIf, *q.Name, nil)
		if err != nil {
			return nil, err
		}
	}
https://github.com/jessesuen/argo-cd/commit/8605e2e8d43e98651326b3bf9262d9d7b7eb75c4#diff-87b3b573e8c40af95af4dbda83f7dbc467219b02182415ff8e1f0ad73a82dc59
	
https://myargocd-server-myargocd.apps.k8spro.nextret.net/swagger-ui#operation/ApplicationService_Update