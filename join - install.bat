@echo off

set MD=install.md
set TITLE="Resumen de la instalaci¢n de ArgoCD Vault Plugin (AVP) en cl£ster piloto Openshift"

node --no-deprecation md2html.js --output install.html --css avp.css --title %TITLE% %MD%

pause