# Healthchecks

Le healthcheck backend appelle avec Node :

```text
http://127.0.0.1:3001/api/health
```

L’endpoint existe et renvoie normalement HTTP 200. Le port configuré est bien 3001 et le serveur écoute sans restriction d’adresse explicite. Les paramètres principaux sont : intervalle 15 s, délai 5 s, 10 tentatives, période initiale 20 s.

Ils sont cohérents pour une application déjà démarrée. Ici, le processus quitte avant le serveur ; l’historique de santé est vide entre les redémarrages. Augmenter les délais ou désactiver le healthcheck ne corrigerait rien.

La dépendance frontend `condition: service_healthy` explique directement son état `Created`. C’est un comportement Compose conforme, pas une panne nginx.

