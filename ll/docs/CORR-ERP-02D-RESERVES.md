# CORR-ERP-02D — Réserves

## Réserves métier bloquantes pour une validation CRM sans restriction

1. Un essai ne possède que `started_at` et `returned_at`. Il n'existe ni début futur ni fin prévue ni durée. Le système sait donc protéger l'occupation active, pas planifier un intervalle futur.
2. Il n'existe aucune route de modification ou de réaffectation d'un essai. Les scénarios E et F ne peuvent pas être implémentés sans définir ce nouveau workflow.
3. L'adjacence demandée au scénario D est indéterminable sans borne de fin planifiée.
4. La collision croisée est exacte à l'instant de démarrage. Pour les rendez-vous futurs, un essai ouvert est traité prudemment comme indisponibilité jusqu'à son retour ; aucune durée fictive n'a été inventée.

Une décision produit devra préciser les champs de créneau, la durée par défaut ou obligatoire, les transitions de modification, la politique d'annulation et les droits de réaffectation.

## Réserves de recette

- La suite globale conserve des échecs historiques hors CRM et des fixtures backend anciennes. Ils ne sont ni supprimés ni maquillés.
- Le test endpoint CRM historique `crm-appointment-endpoint.test.ts` retourne 403 avant le code métier avec sa fixture d'autorisation actuelle ; les contrats plus récents d'appointment et les tests ciblés passent. Sa remise à niveau complète doit rester rattachée à l'assainissement RBAC/fixtures partagées.
- Les tests MySQL destructifs restent opt-in et doivent continuer à utiliser une base jetable.

## Verdict

La correction P1 des doubles essais actifs est démontrée. Le CRM est **validé avec réserves**, et non totalement validé, tant que le modèle de planification des essais n'a pas fait l'objet d'une décision métier et d'une implémentation dédiée. Aucun verdict de mise en production globale de l'ERP n'est formulé.
