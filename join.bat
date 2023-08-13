@echo off

set MD=README.md 10-helm-go.md 11-vault-fail.md 11-vault.md 12-argocd.md 20-avp.md 21-avp-install.md 22-avp-vault-approle.md 23-avp-argocd-approle.md
set TITLE="Prueba de concepto de ArgoCD Vault Plugin (AVP)"

node --no-deprecation md2html.js --output avp.html --css avp.css --title %TITLE% %MD%

pause