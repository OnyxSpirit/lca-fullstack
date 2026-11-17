# 09 — Rapport sécurité

Preuves réussies : deux scopes persistés, rejet SQL de `GLOBAL`, isolation agence, faux Super Administrateur, retrait de permission, changement d’agence, contexte périmé 409, session révoquée 401, ressources hors périmètre 403/404 et salles Socket.IO limitées à l’agence active.

La 2FA est restée obligatoire pour le Super Administrateur. Le filtrage des détails d’audit couvre les secrets d’authentification usuels et les facteurs OTP.
