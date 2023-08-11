@echo off

type README.md > avp.md
type 10-helm-go.md >> avp.md
type 11-vault-fail.md >> avp.md
type 11-vault.md >> avp.md
type 12-argocd.md >> avp.md
type 20-avp.md >> avp.md
type 21-avp-install.md >> avp.md
type 22-avp-vault-approle.md >> avp.md
type 23-avp-argocd-approle.md >> avp.md

rem https://www.npmjs.com/package/markdown-to-html
markdown avp.md -s avp.css > avp.html

pause