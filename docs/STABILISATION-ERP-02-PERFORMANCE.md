# STABILISATION-ERP-02 — Performance et stabilité

Mesures faites le 11 octobre 2026 sur Docker local, base neuve contenant 16 utilisateurs, 16 rôles, 252 permissions actives et 402 attributions métier.

- Campagne API : 114 appels réels enregistrés par `performance.now()` ; moyenne 329,22 ms ; maximum 3 515,96 ms. Le maximum correspond aux opérations d'authentification avec hachage de mot de passe, pas aux listes simples.
- Premier healthcheck externe : 175,93 ms ; première page frontend : 8,19 ms.
- Concurrence rôle : 176,36 et 212,11 ms.
- Concurrence utilisateur : 58,17 et 32,51 ms.
- Deux protections du dernier administrateur : 8,23 et 9,52 ms, toutes deux 409.
- Ressources au repos (`docker stats --no-stream`) : frontend 4,664 MiB, backend 55,75 MiB, MySQL 521,5 MiB ; CPU 0 %, 0 %, 0,56 %.

Les pages navigateur ont chargé sans erreur console détectée, mais aucun test de charge, profilage SQL continu ni mesure Web Vitals n'a été réalisé. Ces chiffres caractérisent la petite volumétrie de recette, pas une capacité de production.

