# Runtime et permissions d'artefacts

`.nvmrc`, `.node-version` et `engines.node=22.x` alignent le projet sur les Dockerfiles Node 22. Les dépendances et frameworks n'ont pas été mis à niveau.

Le frontend accepte `VITE_BUILD_OUT_DIR`; `build:qualification` écrit dans `.artifacts/qualification-dist`, exclu de Git. Le build Node 22 a réussi sans supprimer ni changer propriétaire/permissions de `frontend/dist`.

Le Compose de qualification montait auparavant ses volumes dans des chemins absents de l'image (`qualification-uploads`/`qualification-ged`), créés root. Il monte désormais `/app/uploads` et `/app/ged-storage`, précréés `node:node` dans l'image. Un test avec deux volumes neufs a créé les répertoires en UID 1000; un second backend a démarré sans EACCES, au niveau 137, puis répondu HTTP 200. Aucun `chmod 777`, chown récursif du projet ou changement du socket Docker n'a été réalisé.
