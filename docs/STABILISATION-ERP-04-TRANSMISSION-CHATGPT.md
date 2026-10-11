# STABILISATION-ERP-04 — Transmission ChatGPT

Verdict général : **PRÊT AVEC RÉSERVES**. Environnement `lca-recette`, frontend 4176, backend 3004, MySQL 33321, niveau 079. Les conteneurs historiques et le port 3001 n'ont pas été interrompus.

40 scénarios prévus, 38 exécutés, 36 validés, 1 non validé, 1 bloqué, 2 non exécutés. Sept véhicules REC04 : 4 VN, 3 VO en comptant le témoin concurrent ; six dossiers métier sur quatre agences, cinq véhicules disponibles. Six marques et sept modèles. Tous les VIN stockés font 17 caractères et sont uniques.

Photos : 4 fichiers, 3 principales ; PNG/WebP affichés réellement, signature corrompue refusée. GED : 1 PDF rattaché, aperçu 200 et affichage navigateur. Emplacements : 4 `PARC` dédiés dans `vehicle_locations`, aucune réutilisation du stock pièces.

Profils : Super Admin, Responsable commercial, Commercial, Réceptionniste, Responsable livraison, Direction. GLOBAL/CONCESSION/AGENCY validés. OWN est non applicable et révèle une configuration erronée du rôle Commercial. Inter-concessions bloqué.

Concurrence : même VIN 201/409 ; deux modifications distinctes 200/200. Performance : 85 appels, moyenne 34,83 ms, médiane 10,92, p95 159,89, max 368,65, 0 erreur 5xx après correction.

Deux anomalies backend corrigées : placeholder SQL manquant (500) et création sans photo refusée (400). Test ciblé 2/2. Fichiers applicatifs modifiés : routes véhicule et stockage image ; un test et deux scripts ajoutés. Aucun commit, push ou déploiement.

Véhicules recommandés pour Vente : STK-000001, STK-000003, STK-000004 et STK-000007, avec clients REC03 prêts. Aucune vente/facture/livraison créée.

