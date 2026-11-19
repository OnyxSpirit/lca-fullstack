# Audit des tests

Les tests ciblés `agency-rbac-context`, `rbac-core-alignment` et `rbac-persisted-authority` réussissent après modernisation des attentes obsolètes `CONCESSION` et `GLOBAL`. Les matrices `app`, documents de livraison, véhicules, Showroom et pagination Showroom ont également été alignées sur le contrat strict `OWN`/`AGENCY`.

Résultats constatés le 18 novembre 2026 :

- TypeScript frontend et backend : réussis ;
- lint frontend et backend : réussi ;
- build Vite : réussi, 2 551 modules ;
- suite frontend exhaustive : 1 060/1 060 réussis, 0 échec, 0 ignoré (717 premiers cas puis 343 cas restants après isolement d'une fuite de processus du runner) ;
- matrice Showroom : 105/105 réussis ;
- pagination Showroom : 12/12 réussis ;
- suite backend exhaustive séquentielle finale : 2 067 réussis, 0 échec, 104 gardés, soit 2 171 tests déclarés en 345,2 secondes.

Les 104 tests gardés de la commande standard sont des scénarios d'intégration MySQL/WSS protégés par une garde d'environnement. Ils ne sont pas artificiellement déclarés réussis dans ce total : ils ont été rejoués explicitement contre les services isolés décrits ci-dessous.

## Reprise de la campagne des tests gardés

Inventaire exhaustif : 104 occurrences `skip` dans 77 fichiers. Un runner éphémère est attaché au seul réseau privé `lca-codex-qualification_qualification_private` et utilise un schéma frère dédié, `lca_codex_qualification_test`, bootstrapé jusqu'à la migration 132. La base applicative de qualification et les environnements historiques ne sont pas utilisés par ces tests.

Premières exécutions réelles réussies : contexte RBAC agence, Socket.IO agence active, avoirs/remboursements, annulation comptable, budget-trésorerie, concurrence des créneaux CRM, clôture CRM/stock, contacts CRM, Administration centrale bornée à la concession active, comptabilité Lot 3, fiscalité, GED, FIN-01 à FIN-07, FIN-09, atelier dynamique et plusieurs concurrences Livraison.

Anomalies reproduites : fixtures RH et documents utilisant encore les scopes interdits, garde de nom de base trop spécifique, acteur système de mauvaise concession et fuite de handle après échec du Lot 13. Les corrections ciblées Administration/CRM/Comptabilité ont d'abord totalisé 4 tests réussis, 0 échec, 0 ignoré, avant l'exécution de tous les autres lots gardés.

Deuxième lot corrigé : quatre recettes RH MySQL (cibles budgétaires, catégories, rallonges et intersection employés/salaires) réussissent sans scénario ignoré. La politique fonctionnelle a ensuite été mise à jour : le demandeur disposant de `hr.budget.fund.approve` peut décider sa propre demande. La recette a été modernisée et rejouée ; approbation et rejet par le même acteur réussissent, tandis que les décisions concurrentes restent sérialisées avec un seul mouvement financier.

Troisième lot corrigé : la recette Documents Lot 13 réussit ses 11 scénarios MySQL sans échec ni ignore (validation d'images, immutabilité des archives, idempotence, marques inactives, IDOR, scopes, concurrence et reprise GED). Le lot migrations/reprises a exécuté 13 tests : 12 réussites et une attente obsolète du niveau 124, alors que le schéma courant est au niveau 132. Après remplacement de cette constante par la découverte de l'inventaire réel, le runner ciblé réussit 3/3 scénarios, y compris les installations fraîches, reprises après coupure simulée, contrôle de checksum, conservation des données et concurrence MySQL 8.4.

La suite des lots gardés a été exécutée réellement sur MySQL 8.4 : RH reporting et stock, PR02 à PR06, reporting transversal, OPS, préproduction, restitution véhicule, SAV, trésorerie, comptabilité, identité client, essais routiers, livraisons, marques B321 et barèmes atelier. Les anciennes fixtures de login ont été alignées sur la politique 2FA en utilisant des sessions fortes persistées ; les contrats utilisateurs utilisent désormais `agencyAssignments`, et les paiements indiquent leur compte de trésorerie. Le provisioning possède son propre schéma jetable afin de ne jamais supprimer ou détourner un administrateur existant.

La recette WSS a été menée avec une vraie terminaison TLS : certificat serveur signé par une CA temporaire, validation `rejectUnauthorized`, proxy Nginx, backend et schéma de test cohérents. Connexion et reconnexion réussissent ; jeton invalide et session révoquée sont refusés. Les conteneurs WSS éphémères ont ensuite été supprimés. Les sept groupes ciblés 2FA/step-up/appareils de confiance/gouvernance/centre de sécurité réussissent également sans ignore.

La validation frontend finale a aussi détecté puis corrigé la disparition de la gestion des ponts dans Paramètres. La section `BaysSettings` est de nouveau chargée dynamiquement et visible selon `workshop.resources.view/manage`. Deux attentes de rendez-vous dépendantes du fuseau de la machine ont été rendues déterministes sur le fuseau métier Africa/Brazzaville. Les 13 tests ciblés réussissent, puis l'ensemble des 1 060 tests frontend réussit sans ignore.

## Mission de conformité multi-étapes

L'audit exhaustif des formulations, comparaisons d'identité, routes, helpers, tests, migrations et interfaces a confirmé trois restrictions actives : rallonges budgétaires, rémunérations salariés et rémunérations prestataires. Elles ont été retirées sans modifier les permissions ni les scopes. Les contrats ciblés réussissent 9/9 et les trois recettes MySQL RH/FIN impactées réussissent 3/3, sans ignore. Les tests couvrent l'acteur cumulant les permissions, l'absence de permission, l'inter-agence, la double décision et la concurrence.

Résultats globaux après correction : backend 2 171 tests déclarés, 2 067 réussis, 0 échec, 104 gardés ; frontend 1 060/1 060 réussis, 0 échec, 0 ignoré. Les 104 gardés restent couverts par la campagne MySQL/WSS explicite et les trois recettes modifiées ont été rejouées réellement.

## Clôture des paginations — 19 novembre 2026

- Backend complet : 2 174 tests déclarés, 2 070 réussis, 0 échec, 104 gardés (383,1 s).
- Frontend complet : 1 062/1 062 réussis, 0 échec, 0 ignoré (179,1 s).
- QGP ciblé : backend 3 assertions et frontend 2 assertions réussies ; TypeScript des deux applications réussi.
- MySQL ciblé réel : Fiscalité, FIN-02, FIN-04 et RH-FIX-04 réussis sans ignore. Une attente fiscale historique en tableau a été mise à jour vers le contrat paginé puis rejouée verte.
- Build Docker de production : backend TypeScript et Vite réussis ; trois services `lca-codex-qualification` sains.
# Complément pagination globale

Les contrats automatisés `qgp-server-pagination.test.ts` couvrent désormais les tailles standard, les frontières de total, les achats directs, la fiscalité, les ventes directes, le transit SAV et la consommation des pages serveur par les écrans concernés. La matrice détaillée est disponible dans `14-matrice-pagination-globale.md`.
