# 14 — Readiness production

## Favorable

- RBAC dynamique, agence active, 2FA et sessions ont une architecture cohérente et des tests ciblés verts.
- Aucun lien rôle-permission orphelin.
- Les quatre routes se chargent en recette authentifiée.
- Aucun débordement global sur desktop/tablette, ni sur trois des quatre routes mobiles.
- Journalisation présente et acteurs renseignés.

## Bloquants ou réserves

- Corriger AGAT-001 avant validation mobile.
- Rejouer les quatre intégrations MySQL/Socket dans une base jetable au nom conforme.
- Ajouter une fixture notification destinée au compte de recette et valider arrivée temps réel, lecture, archivage et suppression logique en UI.
- Décider si AGAT-002 est acceptable pour la production ; la sécurité n'est pas affectée, mais l'utilité d'audit l'est.
- Documenter explicitement les 22 lignes historiques sans territoire.

Conclusion : **pas de go production global à ce stade**.

