# STABILISATION-ERP-02 — Réserves

1. Isolation inter-concessions bloquée : absence de workflow officiel de création d'une seconde concession.
2. Scopes OWN/AGENCY/CONCESSION validés au niveau identité, permissions effectives, agence et refus d'administration, mais pas encore sur le CRUD de toutes les ressources métier.
3. Concurrence : transactions cohérentes, mais stratégie « dernière écriture gagnante » sans version/ETag.
4. Pas de test d'expiration temporelle complète du JWT ni de campagne Socket.IO ciblée.
5. Les 120 scénarios cartographiés ne sont pas couverts par cette initialisation ; la campagne prépare leur exécution progressive.
6. Les mesures de performance concernent une petite base locale, sans charge représentative.
7. Les secrets de recette restent uniquement dans le fichier local ignoré `.env.recette`; leur rotation est recommandée avant partage de la machine.

Aucune réserve critique ne compromet l'utilisation de l'environnement isolé pour la prochaine campagne CRM. Le verdict reste **PRÊT AVEC RÉSERVES**.

