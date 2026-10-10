# CORR-ERP-02C — Réserves

- La migration n’a volontairement pas été appliquée à une base persistante.
- Les anciennes activités ont `created_by = NULL` : l’interface doit les présenter comme « auteur non renseigné » et ne pas déduire l’auteur du responsable.
- Les anciens rendez-vous sans durée utilisent 30 minutes uniquement pour la détection de conflit ; ils ne sont pas modifiés.
- L’essai routier existant est une opération immédiate (`in_progress` puis `completed`/`cancelled`). Il n’existe pas de réservation future d’essai à laquelle appliquer une durée.
- La recette navigateur sur le port 3001 n’est pas lancée automatiquement afin de respecter l’instance déjà en service.
