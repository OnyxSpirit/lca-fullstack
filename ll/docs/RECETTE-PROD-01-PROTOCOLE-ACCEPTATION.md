# RECETTE-PROD-01 — Protocole manuel d'acceptation

1. Démarrer une base MySQL 8.4 vierge et jetable, puis vérifier le niveau 076.
2. Créer concessions A/B, agences A1/A2/B1 et quatre rôles de scopes OWN/AGENCY/CONCESSION/GLOBAL, plus un rôle sans permission.
3. Pour chaque ressource financière, exécuter lecture, création/mutation et export avec identifiant dans le scope, A2, B1, sans permission et sans JWT.
4. Exiger 401 sans JWT, 403 sans permission, et 403 ou 404 non révélateur hors scope selon le contrat de la route.
5. Rejouer facture client/encaissement, budget/dépense/réservation/décaissement, rémunération/prime/paiement, facture fournisseur/avoir/paiement, reporting/export et banque/rapprochement.
6. Comparer après chaque mutation les tables métier, `treasury_movements`, réservations et `audit_logs`; aucune écriture orpheline n'est admise.
7. Exécuter les courses RH, fournisseur, sortie libre et rapprochement dix fois; chaque course doit avoir un unique effet financier.
8. Parcourir les écrans à 1440, 1280, 1024 et 768 px et compléter la matrice responsive.
9. Exécuter toute la checklist clavier avec lecteur d'écran sur au moins un navigateur Chromium et Firefox.
10. Exécuter typage, builds et suites globales sur la version Node cible; zéro échec non justifié est requis.
11. Exporter les CSV et vérifier encodage, formules neutralisées, filtres, portée et absence de données hors scope.
12. Faire signer l'acceptation métier de la limitation historique FIN-06 avant décision de production.

Critère final : aucune réserve P0/P1 bloquante ouverte, toutes les lignes PROD01 dynamiques réussies et suites globales vertes.

