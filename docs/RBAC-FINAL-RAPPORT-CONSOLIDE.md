# Rapport consolidé — finalisation du RBAC multi-agences

> **Document intermédiaire désormais remplacé.** La stabilisation ultérieure a ramené la suite globale à zéro échec. Le verdict de clôture autoritatif se trouve dans `docs/RBAC-STABILISATION-RAPPORT-FINAL.md`.

Date de clôture technique : 10 novembre 2026  
Périmètre : backend ERP LCA, MySQL, Socket.IO, migrations, inventaire et tests backend. Frontend, commit, push et déploiement exclus conformément à la mission.

## Verdict exécutif

La migration fonctionnelle du RBAC multi-agences est **achevée sur les 662 endpoints actifs** : aucun endpoint ne reste classé « À auditer ». Le socle, les migrations MySQL et la campagne d’acceptation RBAC ciblée sont validés.

La validation du dépôt backend dans son ensemble reste toutefois **partielle** : la suite historique complète contient encore 309 échecs sur 2 126 tests. Les principaux blocs défaillants sont d’anciennes matrices qui exigent précisément les portées métier `CONCESSION/GLOBAL` supprimées par le contrat final, ainsi que des fixtures fondées sur les anciennes requêtes de session. Ces échecs ne justifient pas de rouvrir les accès interdits ; ils imposent de réaligner ou retirer ces contrats historiques. En conséquence :

- **succès de l’implémentation et de la recette d’acceptation RBAC : oui** ;
- **suite backend globale entièrement verte : non** ;
- **autorisation de déploiement sur la seule base de cette mission : non**, tant que la dette de tests historiques n’est pas arbitrée et résolue.

## Travail réalisé

### Autorité, session et agence active

- L’agence active est persistée dans la session et relue côté serveur ; le JWT ne constitue plus une autorité indépendante.
- Les rôles métier proviennent de `user_agencies` et `user_agency_roles` pour l’agence active.
- `user_roles` est limité aux rôles système ; le véritable `SUPER_ADMIN` doit être actif, système et disposer de la permission centrale demandée.
- Login, refresh, `/me`, 2FA et administration des utilisateurs reconstruisent l’autorité effective depuis la base.
- Les changements d’agence, de rôles ou d’affectations invalident le contexte en vol et les connexions temps réel concernées.
- Si le dernier rôle de l’agence active est retiré, seules les routes de consultation/bascule du contexte restent accessibles ; toutes les routes métier restent fermées. Cela évite de bloquer définitivement un utilisateur qui possède encore un rôle dans une autre agence.

### Autorisation métier

- Les portées métier finales sont `OWN` et `AGENCY` uniquement.
- `GLOBAL` et `CONCESSION` ne sont pas acceptées comme élargissements métier ; elles ne subsistent que dans les capacités centrales explicitement gouvernées.
- L’agence et le propriétaire d’une ressource sont dérivés côté serveur. Les paramètres fournis par le client ne peuvent pas élargir l’accès.
- Une ressource collective sans définition documentée de propriété refuse `OWN`.
- Les transferts inter-agences restent fermés lorsqu’aucune règle explicite d’autorisation de la destination n’existe.

### Transactions et concurrence

- Les écritures sensibles relisent la session, l’agence, les affectations, les rôles et les permissions dans la transaction.
- Les ressources et transitions critiques sont verrouillées avant mutation.
- Un changement concurrent de contexte ou d’autorisation provoque un rejet au lieu d’un commit avec une autorité périmée.
- Les événements Socket.IO sont émis après commit et dans les rooms de l’agence active seulement.

### Domaines migrés

La migration couvre l’authentification et la 2FA, les utilisateurs/rôles/agences, CRM, clients, showroom, devis, proformas, ventes, véhicules et catalogue, livraisons et documents, facturation/paiements/avoirs/retours, trésorerie et rapprochement, pièces et logistique, atelier/SAV/garanties, RH et prestataires, GED et marques documentaires, paramètres/référentiels, reporting, activité, dashboard, notifications et Socket.IO.

Les choix conservateurs sont maintenus pour les référentiels centraux et les transferts : aucun droit transversal n’a été inventé faute de gouvernance métier explicite.

## Inventaire exhaustif

Le générateur AST a été rejoué lors de la clôture :

| Classification | Nombre |
|---|---:|
| Migré | 644 |
| Fonction personnelle conservée | 8 |
| Hors scope métier | 7 |
| Socle validé | 3 |
| À auditer | 0 |
| **Total actif** | **662** |

Le nombre historique de 664 est réconcilié : 661 déclarations Express et `/api/health` sont actives ; deux anciennes routes GED en collision ont été supprimées (`PATCH /document-marks/stamps/:id/status` et `POST /document-marks/stamps/:id/version`). La matrice route par route est dans `docs/RBAC-FINAL-INVENTAIRE-ENDPOINTS.md`.

## Validations réellement exécutées

### Contrôles de compilation et de dépôt

| Contrôle | Résultat final |
|---|---|
| `npm run lint` (`tsc --noEmit`) | **Réussi** |
| `npm run build` | **Réussi** |
| `git diff --check` | **Réussi** |
| Génération de l’inventaire | **Réussie : 662 endpoints, 0 à auditer** |

### Recette d’acceptation ciblée

Une exécution groupée de 22 fichiers de tests RBAC a donné 21 succès et un échec d’environnement : Supertest ne pouvait pas ouvrir un port éphémère dans le bac à sable. Le fichier concerné a ensuite été rejoué hors de cette restriction et ses **6 scénarios sur 6 ont réussi**. Les fichiers d’acceptation couvrent notamment : contexte d’agence, révocation de session, autorité persistée, rôles dynamiques, administration centrale, forte authentification/2FA, CRM, clients, devis, véhicules, facturation, pièces, trésorerie, livraisons et documents.

### Recette MySQL isolée

Une base dédiée `contenaire_test` a été créée dans le conteneur MySQL de recette. Le bootstrap complet a appliqué le baseline et les migrations jusqu’à `116_crm_lead_agency_provenance.sql`.

| Scénario réel MySQL/HTTP/Socket.IO | Résultat |
|---|---|
| PH2A : contexte, isolation, invalidation, vrai/faux Super Admin | **1/1 réussi** |
| Administration centrale et habilitations locales | **1/1 réussi** |
| Temps réel : agence active, rooms, révocation | **2/2 réussis** |
| CRM : isolation et revalidation des écritures | **1/1 réussi** |
| Notifications HTTP, MySQL et Socket.IO | **1/1 réussi** |

Le premier passage PH2A a révélé qu’un utilisateur perdant son dernier rôle actif ne pouvait plus atteindre la route de bascule d’agence. Le middleware a été corrigé avec une exception strictement limitée aux routes de récupération du contexte, puis le scénario complet a été rejoué avec succès.

### Suite historique complète

Résultat observé du dernier lancement global :

| Mesure | Nombre |
|---|---:|
| Tests découverts | 2 126 |
| Succès | 1 720 |
| Échecs | 309 |
| Ignorés | 97 |

La majorité des échecs identifiés provient de matrices Showroom/Véhicules et de contrats statiques anciens qui attendent encore `CONCESSION/GLOBAL`, `requirePermission`, l’ancien contexte JWT ou les anciennes formes de requêtes. Plusieurs fixtures ont été migrées pendant la mission, mais toute la suite historique n’a pas été réécrite. Ce résultat est conservé explicitement : il serait incorrect d’annoncer « tous les tests sont verts ».

## Niveau de succès par objectif

| Objectif | État | Appréciation |
|---|---|---|
| Fondations session/agence active | Validé | MySQL et tests ciblés verts |
| Autorité locale et Super Admin système | Validé | Faux Super Admin refusé, administration réelle testée |
| Isolation OWN/AGENCY | Validé sur la recette RBAC | Tests négatifs et scénarios multi-agences verts |
| Fraîcheur transactionnelle | Validé sur les flux couverts | Changement de contexte/autorité rejeté |
| Socket.IO et notifications | Validé | Rooms, changement d’agence et révocation testés |
| Inventaire des endpoints | Validé | 662/662 classés, 0 à auditer |
| Compilation et qualité statique | Validé | lint, build et diff-check verts |
| Compatibilité de toute la suite historique | Non validé | 309 tests restent à réaligner ou corriger |

## Réserves et actions restantes

1. Réécrire ou supprimer, après décision produit, les matrices historiques qui exigent des accès `GLOBAL/CONCESSION` désormais interdits.
2. Migrer les fixtures restantes vers la session persistée et les affectations locales.
3. Rejouer ensuite les 2 126 tests et exiger zéro échec avant une décision de déploiement générale.
4. Formaliser la gouvernance des référentiels centraux et l’autorité de destination des transferts avant d’ouvrir de nouvelles capacités.

## Contraintes respectées

- Aucun changement frontend.
- Aucun commit, push ou déploiement.
- Aucune suppression de modification utilisateur non liée.
- Aucun élargissement implicite des droits, aucun contournement Super Admin, aucun transfert inter-agences inventé.

## Conclusion

La mission de migration RBAC est techniquement réalisée et sa recette de sécurité dédiée est concluante. Son succès est substantiel mais pas absolu : **le nouveau contrat RBAC est validé ; le dépôt backend complet ne peut pas être déclaré intégralement vert tant que les 309 échecs historiques ne sont pas résolus ou formellement retirés du périmètre d’acceptation**.
