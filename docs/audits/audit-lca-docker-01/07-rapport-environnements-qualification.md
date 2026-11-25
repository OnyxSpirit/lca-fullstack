# Environnements de qualification

Les problèmes récurrents ont plusieurs causes distinctes :

- Docker : socket interdit par le bac à sable Codex ; l’escalade autorisée est nécessaire.
- Runtime : Node hôte 24, images Node 22, et anciennes exécutions sous Node 12 ; absence de runtime unique imposé hors conteneur.
- Droits : `frontend/dist/assets` appartient à un UID/GID remappé, ce qui provoque EACCES lors du nettoyage Vite sur l’hôte.
- IPC : les tests lancés par la CLI tsx peuvent recevoir EPERM dans le bac à sable ; le chargeur Node direct fonctionne mieux.
- Navigateur : Chromium est installé, mais l’automatisation navigateur et l’accès local interactif ne sont pas garantis par cette session.
- PDF : Poppler est présent dans l’image backend et `pdftoppm` est disponible dans le runtime outillé ; d’autres sessions peuvent ne pas charger les mêmes dépendances.
- Migrations : baseline incohérente avec 094, fichiers de migration mutés, volumes persistants à des niveaux différents.
- Dispersion : nombreux projets Compose, ports, volumes et conteneurs ponctuels sans manifeste central d’inventaire.

Le défaut structurel majeur est l’absence d’un pipeline de qualification unique, immuable et versionné qui crée une base isolée, applique les migrations via le runner officiel, exécute les tests et publie les preuves avec des UID cohérents.

