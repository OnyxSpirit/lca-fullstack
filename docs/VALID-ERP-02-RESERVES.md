# VALID-ERP-02 — Réserves

1. **Essais automobiles bloquants** : pas de durée/fin planifiée, pas de verrou véhicule/commercial, pas de contrôle de collision ni de route de modification. Aucune durée n'a été inventée.
2. **Rendez-vous en création seulement** : aucune API de modification d'horaire, durée, agence ou commercial. Les scénarios de modifications concurrentes et de réaffectation ne sont donc pas exécutables.
3. **Dérogation frontend** : permission, motif et audit existent côté API, mais aucun parcours UI ne les expose.
4. **Auteur Showroom** : les nouvelles activités de retour d'essai peuvent rester sans `created_by`; l'historique nul, lui, est intentionnel et correct.
5. **Contrat TypeScript prospect** : le frontend infère encore l'entreprise via la civilité/raison sociale plutôt qu'un discriminant explicite partagé. La compatibilité fonctionne, mais le contrat reste implicite.
6. **Permission SUPER_ADMIN** : 077 attribue automatiquement `crm.appointment.override_conflict` en GLOBAL à ce rôle. Il n'existe pas de passe-droit par nom au runtime, mais la décision de gouvernance doit être confirmée.
7. **Volumétrie Kanban** : la pagination et les agrégats serveur sont couverts, mais tous les jeux 0/1/50/51/200/201/500 n'ont pas été rejoués au navigateur durant cette session.
8. **Recette responsive** : les largeurs 1440/1024/768/375 n'ont pas pu être imposées par le pilote disponible. Aucun résultat n'est extrapolé.
9. **Suites globales** : elles restent rouges à 41 échecs backend et 26 frontend. Le décompte backend inclut deux nouveaux tests réussis. Les échecs résiduels sont documentés comme historiques/concurrentiels ou hors CRM, pas corrigés ici.
10. **Parité bundle** : la recette réelle a utilisé un build du workspace isolé (`955afa…5865`) ; les deux derniers changements de texte ont ensuite produit et validé le build final (`84772d…95cd`) par build/lint/tests, mais le parcours navigateur complet n'a pas été rejoué après ces seuls changements de libellé.

Ces réserves interdisent d'annoncer le CRM pleinement validé ou l'ERP apte à la production.
