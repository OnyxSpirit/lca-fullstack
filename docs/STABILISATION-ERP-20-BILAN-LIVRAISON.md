# STABILISATION-ERP-20 — Bilan et qualification de livraison

Date : 12 octobre 2026  
Verdict : **PRÊT SOUS RÉSERVES**

## 1. Synthèse exécutive

L'ERP est apte à une livraison contrôlée sur le périmètre actuellement éprouvé : une concession, plusieurs agences, RBAC dynamique et environnements Docker préservés. Le blocage Pièces ERP18-PARTS-01 est clôturé par ERP-19. Aucun P0/P1 fonctionnel connu ne reste ouvert sur ce périmètre.

Le verdict n'est pas « PRÊT POUR LIVRAISON » sans réserve, car la preuve runtime inter-concessions manque, une fenêtre rare d'orphelin GED après crash brutal demeure, la dérive Compose de MySQL recette impose une discipline opérationnelle et le worktree n'est pas un artefact de release figé. Il n'est pas « NON PRÊT », car ces limites sont maîtrisables sans correction fonctionnelle urgente pour un lancement mono-concession.

## 2. Périmètre audité

- 19 campagnes consolidées : ERP-01 à ERP-19.
- 16 modules fonctionnels examinés dans la matrice ERP-20.
- Code frontend React/Vite/TypeScript, backend Node/Express/TypeScript, MySQL 8.4, Socket.IO, Nginx et Docker.
- Documents, tests ciblés et runtime local inspectés sans modification de données ni de conteneurs.

## 3. Fonctionnalités validées

Les preuves consolidées couvrent CRM et clients 360, stock VN/VO, vente et livraison, finance, SAV/Atelier, Pièces, Showroom, RH/administration, notifications, paramètres, GED, tableaux de bord et utilisateurs/RBAC. La matrice détaillée et ses limites sont dans `STABILISATION-ERP-20-CONSOLIDATION.md`.

ERP-19 reste cohérent avec l'ensemble : sa file **Pièces > Demandes Atelier** traite les réservations, consommations et libérations via des permissions spécialisées, sans exiger `service.order.update`. Ses preuves historiques sont API 20/20, frontend 14/14, navigateur réel et concurrence `[201,409]`.

## 4. Anomalies corrigées

Le registre ERP-20 demandé contient **13 anomalies historiques significatives, toutes corrigées et validées** : filtre CRM, VIN, emplacements, filtres VN/VO, ventes annulées, facturation, Showroom, GED véhicules, RBAC Atelier/Pièces, réservations, concurrence, idempotence et PDF.

Les trois échecs historiques du lot SAV/RBAC ont été démontrés obsolètes puis réalignés : message de verrouillage d'étape, reconnaissance de l'état terminal `ANNULE`, séparation temps/tarification et permissions de réservation Pièces. Il n'y a pas eu d'affaiblissement des gardes.

## 5. Anomalies ouvertes

- **0 anomalie fonctionnelle bloquante connue** dans le périmètre mono-concession éprouvé.
- **0 anomalie ouverte** parmi les 13 anomalies historiques explicitement demandées.
- **8 risques/réserves** suivis par ERP-20, dont deux conditionnels de livraison : périmètre multi-concession et figement de l'artefact. Ils ne sont pas comptés artificiellement comme des régressions.

## 6. Tests complémentaires réalisés

| Test | Résultat |
|---|---|
| Lot frontend SAV/RBAC/Pièces/ERP-19 | 33/33 |
| Backend : RBAC dynamique, rôles runtime, Pièces, workflow ERP-19 | 4/4 fichiers |
| Reprise GED isolée | 1/1 fichier ; erreurs rendu/insert, reprise et rejeu couverts |
| TypeScript frontend | réussi |
| Build frontend production | réussi ; 2 488 modules |
| Health HTTP historique et recette | `:3001/api/health` OK, `:3004/api/health` OK, `:4176` HTTP 200 |

Le test GED requiert le drapeau Node `--experimental-test-module-mocks`. Son lancement sans ce drapeau a échoué au chargement ; le lancement conforme est réussi.

## 7. Sécurité et RBAC

Les contrôles de navigation et d'action examinés reposent sur les permissions effectives et les scopes. Les opérations Pièces ERP-19 exigent `parts.reservation.view/create/consume/release`; le test prouve qu'elles ne dépendent ni de `service.order.update`, ni de `parts.stock.adjust`, ni d'un nom de rôle. Les occurrences `SUPER_ADMIN` restantes protègent le compte système et sa gouvernance ; elles ne constituent pas une autorisation métier.

Les tests backend `dynamic-rbac`, `rbac-dynamic-role-runtime`, `parts-dynamic-rbac` et `erp19-parts-workflow` réussissent. La réserve porte sur la preuve runtime entre deux concessions, pas sur une violation identifiée dans le code.

## 8. Intégrité des données et GED

Les campagnes antérieures ont vérifié l'intégrité des stocks, les transitions transactionnelles, la concurrence, l'idempotence et les documents. ERP-20 n'a écrit dans aucune base historique.

Le scénario GED isolé prouve le nettoyage après échec de rendu ou d'insertion, la reprise et le rejeu sans doublon. Il ne prouve pas un crash brutal entre fichier physique et commit SQL. Cette fenêtre est non bloquante sous surveillance pour le lancement mono-concession, mais exige rapprochement et test destructif uniquement dans un environnement jetable.

## 9. Infrastructure

Au contrôle ERP-20, les six conteneurs `lca` et `lca-recette` sont **healthy**. Les projets, réseaux, volumes et ports restent séparés :

- historique : frontend `127.0.0.1:3001`, backend interne, MySQL `lca_mysql_data` ;
- recette : frontend `127.0.0.1:4176`, backend `127.0.0.1:3004`, MySQL `127.0.0.1:33321` et volume `lca_recette_mysql_data`.

Les labels confirment que backend et frontend recette proviennent uniquement de `docker-compose.recette.yml`. MySQL recette provient de la fusion `docker-compose.yml` + `docker-compose.recette.yml`, possède les montages d'initialisation supplémentaires et le réseau `lca-recette_private`. C'est une dette opérationnelle connue, pas une panne actuelle. Aucune commande `compose up/build/down/restart`, aucun redémarrage et aucun remplacement n'ont été exécutés.

Les sauvegardes documentées ERP-17/ERP-19 existent pour MySQL, GED/uploads et configuration. ERP-20 n'a pas effectué de restauration ; un restore drill isolé reste requis avant tout engagement formel de reprise.

## 10. Risques résiduels

Les principaux risques sont : preuve inter-concessions absente, fenêtre de crash GED, dérive Compose MySQL, restauration non rejouée, couverture navigateur non exhaustive et absence d'artefact de release figé. Leur gravité, probabilité et réduction figurent dans `STABILISATION-ERP-20-RISQUES.md`.

## 11. Limites de couverture

- Pas de seconde concession créée dans la recette historique.
- Pas de panne forcée ni suppression sur les volumes protégés.
- Pas de rejeu exhaustif des 19 campagnes.
- Pas de validation runtime attribuée aux deux fichiers de tests modifiés en ERP-20, puisqu'aucune reconstruction Docker n'était autorisée.
- Pas de test de restauration complet pendant cette mission.

## 12. Conditions de livraison

1. Livrer initialement en mono-concession ; sinon lever ERP20-R01 avant ouverture multi-concession.
2. Faire relire le diff, intégrer uniquement les changements attendus, créer un commit/tag de release autorisé et reconstruire via CI dans un environnement non protégé. Le présent audit n'autorise aucun commit ni déploiement.
3. Sauvegarder MySQL et les fichiers, vérifier les hash, puis réaliser ou planifier un restore drill isolé.
4. Ne pas recréer MySQL recette et ne pas utiliser de commande Compose globale tant que la dérive n'est pas corrigée par un plan validé.
5. Mettre en place la surveillance GED et planifier le test de crash/réconciliation.
6. Exécuter en préproduction un smoke-test authentifié des profils réels et des parcours financiers/stock/SAV critiques.
7. Conserver un plan de retour arrière portant sur l'artefact applicatif ; ne jamais remplacer les volumes MySQL/GED comme mécanisme de rollback applicatif.

## 13. Critères et verdict final

- **PRÊT POUR LIVRAISON** : aucun défaut bloquant ni réserve majeure, preuve adaptée au périmètre, artefact reproductible et reprise éprouvée.
- **PRÊT SOUS RÉSERVES** : aucun défaut bloquant dans le périmètre livré, mais des conditions explicites de périmètre, d'exploitation ou de couverture doivent être respectées.
- **NON PRÊT POUR LIVRAISON** : défaut P0/P1 ouvert, intégrité/sécurité non maîtrisée, ou condition indispensable impossible à satisfaire.

### Verdict : PRÊT SOUS RÉSERVES

Ce verdict vaut pour une livraison contrôlée **mono-concession** après figement d'un artefact reproductible et respect des conditions ci-dessus. Une ouverture multi-concession immédiate ou une publication directe du worktree courant n'est pas qualifiée.

## 14. État final de mission

- Campagnes consolidées : **19**.
- Modules examinés : **16**.
- Anomalies historiques significatives clôturées : **13/13**.
- Anomalies historiques significatives ouvertes : **0/13**.
- Anomalies bloquantes produit en mono-concession : **0**.
- Réserves/risques ERP-20 : **8**.
- Modifications : **2 fichiers de tests réalignés**, **3 rapports créés** ; aucun service applicatif modifié.
- Non-régression : tests ciblés, lint et build réussis ; `git diff --check` à contrôler en clôture.
- Git : modifications laissées non commitées pour revue ; aucun commit, push, reset, restore, stash ou clean.
- Docker : six conteneurs healthy ; aucun conteneur modifié, redémarré ou reconstruit par ERP-20.
