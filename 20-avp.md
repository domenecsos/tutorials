# ArgoCD Vault Plugin (AVP)

Esta página contiene documentación y presentación de ArgoCD Vault Plugin (AVP).

Para el proceso de instalación y configuración de AVP en una prueba de concepto, consultar:

- [Instalación de ArgoCD Vault Plugin (AVP)](21-avp-install.md).
- [Autenticación y autorización por approle en Vault](22-avp-vault-approle.md).
- [Despliegue de aplicaciones en ArgoCD con Vault approle](23-avp-argocd-approle.md).

## Documentación de AVP

Como documentación de referencia, la página de proyecto y la de readthedocs.io. 
- [https://github.com/argoproj-labs/argocd-vault-plugin](https://github.com/argoproj-labs/argocd-vault-plugin)
- [https://argocd-vault-plugin.readthedocs.io/](https://argocd-vault-plugin.readthedocs.io/)

Un par de páginas de utilidad: los backends compatibles para almacenar secretos, y una lista de releases para estar al día de las disponibles.
- [https://argocd-vault-plugin.readthedocs.io/en/stable/backends/](https://argocd-vault-plugin.readthedocs.io/en/stable/backends/)
- [https://github.com/argoproj-labs/argocd-vault-plugin/releases](https://github.com/argoproj-labs/argocd-vault-plugin/releases)

Esta guía propone un par de variantes que se pueden usar algún día: Crear una imagen de ArgoCD con el plugin instalado, y configurar la autenticación en Vault usando el service account que ejecuta en Kubernetes.
- [https://cloud.redhat.com/blog/how-to-use-hashicorp-vault-and-argo-cd-for-gitops-on-openshift](https://cloud.redhat.com/blog/how-to-use-hashicorp-vault-and-argo-cd-for-gitops-on-openshift)

## Presentación de AVP

El resto de esta página contiene la parte descriptiva del artículo.
 [https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05](https://itnext.io/argocd-secret-management-with-argocd-vault-plugin-539f104aff05).

>GitOps has quickly become one of the hotter topics within the realm of DevOps. GitOps was introduced by Weaveworks in 2017 and has been trending upward ever since. I will not go into why to use GitOps in this article but you can read more about it here. One of the questions that always comes up when discussing GitOps is Secret Management. Every single talk, presentation or demo involving GitOps always has someone bringing up the question, “How do you handle secrets with GitOps?”, and that is a very good question.
>
>As our team was evaluating moving to GitOps, we landed on using ArgoCD as our GitOps solution. ArgoCD provided a stable tool that could handle deploying hundreds of microservices across many different Kubernetes Clusters in a fast and reliable way.
>
>Once we chose our GitOps tool, it was time to figure out what to do about the Secrets problem. At the same time, we were starting to migrate our Secrets to HashiCorp Vault, so we knew we would need something that could bridge the gap between ArgoCD and Vault. We looked around at some existing tools and one of the issues we found were that the potential solutions to this problem had a very high barrier to entry. Whether that was having to manually encrypt secrets or deploying Operators to do some of the work, none of these solutions fit well with what my team was trying to do.
>
>So, we decided to build our own tool called argocd-vault-plugin.
>
>What is the argocd-vault-plugin?
>
>The argocd-vault-plugin is a custom ArgoCD plugin for retrieving secrets from HashiCorp Vault and injecting them into Kubernetes YAML files. Within ArgoCD, there is a way to integrate custom plugins if you need something outside of the supported tools that are built-in and we wanted to take advantage of this pattern. One of the ideas behind this plugin was to write it in a way that did not require an Operator or Custom Resource. This allows us to be able to parameterize any Kubernetes resources, even Custom Resources, not just Secrets.
>
>The plugin works by first retrieving values from Vault based on a path that can be specified as an Environment Variable or an Annotation inside of the YAML file and then injects the values into a templated out yaml, that uses <> as the template markers. For example:
```
kind: Secret
apiVersion: v1
metadata:
  name: example-secret
  annotations:
    avp.kubernetes.io/path: "path/to/secret"
type: Opaque
stringData:
  password: <password-vault-key>
```
>In the yaml above, you see that we have a normal Kubernetes Secret definition. However, something is not quite normal. Under data, we have a secret named password but the value is <password-vault-key> this is where the plugin will inject a value if it finds the password-vault-key key in Vault.
>
>So when the plugin runs, it will take the avp.kubernetes.io/pathannotation from the yaml and use that to look for the secrets we want to inject into this Kubernetes Secret. So we take the avp.kubernetes.io/path annotation and combine it with the value inside the <> symbols. So the final path in this scenario would be path/to/secret with the Vault key password-vault-key. So when the plugin finishes running, we would have yaml that looks like this:

```
kind: Secret
apiVersion: v1
metadata:
  name: example-secret
  annotations:
    avp.kubernetes.io/path: "path/to/secret"
type: Opaque
stringData:
  password: some-password # From the key password-vault-key in Vault
```
>You can view all the supported backends and authentication types here, [https://argocd-vault-plugin.readthedocs.io/en/stable/backends/](https://argocd-vault-plugin.readthedocs.io/en/stable/backends/).