# ERP-16 — Socket.IO

Preuves produites par `scripts/stabilisation-erp-16-realtime.mjs` :

- jeton invalide rejeté ;
- deux connexions simultanées authentifiées ;
- diffusion nominative sans fuite inter-utilisateurs ;
- diffusion Pièces bornée à l'agence ;
- déconnexion puis rattrapage de l'état persistant à la reconnexion ;
- absence de doublon après rejeu de lecture.

Sortie brute : `/tmp/stabilisation-erp-16-realtime.json`.

Statut : **VALIDÉ**.

