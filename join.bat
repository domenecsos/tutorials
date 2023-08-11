@echo off

node --no-deprecation md2html.js --output avp.html --css avp.css --title "AVP y SPM" README.md 10-helm-go.md 11-vault-fail.md 11-vault.md

pause