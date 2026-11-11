# ERP LCA — Rapport de finalisation des intégrations conditionnelles et du frontend

Date d'exécution : 10 novembre 2026  
Périmètre : `backend-node`, `frontend`, RBAC multi-agences, intégrations MySQL conditionnelles.

## Verdict exécutif

La mission est **réussie pour le frontend et la non-régression standard**, et **partiellement réussie pour l'activation exhaustive des intégrations conditionnelles**.

- Frontend : suite complète validée, **992 réussites, 0 échec, 0 ignoré** ; lint TypeScript et build Vite validés.
- Backend : lint et build TypeScript validés. La suite standard conserve son contrat de tests conditionnels ignorés. Deux assertions statiques devenues obsolètes après la correction Showroom ont été alignées et leurs tests ciblés sont validés.
- Intégrations conditionnelles : infrastructure MySQL 8.4 jetable créée et campagne réelle lancée sur les fichiers conditionnels, hors proxy WSS TLS. La campagne a révélé des fixtures anciennes et plusieurs défauts/concurrences réels. Elle ne permet donc pas de déclarer les 97 tests tous validés.
- Aucun déploiement, commit, push, volume Docker existant ou donnée de production n'a été modifié.

Une validation fonctionnelle humaine en environnement métier n'est pas revendiquée.

## Infrastructure de recette

Un conteneur MySQL 8.4 indépendant a été utilisé :

- nom : `lca-codex-integrations-20261110` ;
- stockage : `tmpfs`, sans volume persistant ;
- exposition : `127.0.0.1:33322` ;
- bases jetables dédiées, dont `lca_integrations_round2_test` ;
- bootstrap versionné validé jusqu'à la migration 116 ;
- répertoires GED/uploads sous `/tmp/lca-codex-integrations-20261110`.

Les volumes et bases préexistants n'ont pas été supprimés ni réinitialisés.

## Corrections réalisées

### RBAC et fixtures MySQL

- Les acteurs locaux créés par le helper commun sont maintenant affectés via `user_agencies` et `user_agency_roles`.
- Les sessions de recette persistent explicitement `active_agency_id`, conformément au contexte d'agence autoritaire.
- Un helper idempotent `assignMysqlAgencyRole` a été ajouté.
- Les anciennes fixtures qui passent par `issueMysqlAccessToken` sont matérialisées dans le modèle final avant émission du jeton. Cette adaptation est strictement limitée aux tests : le runtime de production ne retombe jamais sur `user_roles` pour un rôle métier local.
- Les permissions de dérogation de tarif atelier ont été alignées sur le contrat actuel.
- Les scénarios barèmes et SAV-OR-20 ont été rendus idempotents et alignés avec le calcul tarifaire serveur.

### Concurrence des essais routiers

Un défaut réel a été corrigé dans `showroom-test-drive.ts` :

- verrou transactionnel du véhicule et du commercial ;
- détection d'un chevauchement par intervalle semi-ouvert ;
- acceptation de deux créneaux adjacents ;
- conflit pour un même véhicule ou un même commercial sur un créneau concurrent ;
- absence de conflit pour des ressources indépendantes.

Le scénario MySQL `CORR-ERP-02E` passe après correction. Les contrats statiques correspondants ont été alignés.

### Écran SAV frontend

- Suppression du bloc de facturation prématuré.
- Ordre métier rétabli : contrôle qualité, récapitulatif final, facturation, remise/clôture.
- Ajout du récapitulatif financier responsive : sous-total HT, remises, TVA, total TTC, solde et devise.
- Facturation conservée en lecture seule avec génération automatique explicitée.
- Visibilité des montants d'encaissement alignée sur les permissions de lecture ou de collecte.
- Libellés de durée et de fiscalité clarifiés.
- Assertions frontend obsolètes mises à jour sans introduire de décision fondée sur un nom de rôle.

## Résultats de validation

| Contrôle | Résultat | Statut |
|---|---:|---|
| Frontend, suite complète | 992/992 | Validé |
| Frontend, tests SAV/RBAC ciblés | 30/30 | Validé |
| Frontend, `npm run lint` | succès | Validé |
| Frontend, `npm run build` | succès, 2525 modules | Validé |
| Backend, `npm run lint` | succès | Validé |
| Backend, `npm run build` | succès | Validé |
| Showroom concurrence MySQL | 1/1 | Validé |
| Barèmes dynamiques MySQL | 1/1 | Validé |
| SAV-OR-20 MySQL | 1/1 | Validé |
| Contrats Showroom ciblés | 3/3 | Validé |
| Campagne conditionnelle globale | échecs résiduels | Non validé intégralement |
| Proxy WSS TLS | non exécuté, pile TLS absente | Non validé |

## Résultats réels de la campagne conditionnelle

La campagne a bien supprimé le masque produit par les `skip`. Elle a mis en évidence les familles suivantes :

1. **Fixtures RBAC antérieures au modèle final** : plusieurs fichiers insèrent encore directement des rôles métier dans `user_roles`, ou créent manuellement un refresh token sans `active_agency_id`. Symptômes observés : `Rôle actif introuvable`, `ROLE_INACTIVE_OR_MISSING` et contexte de session indéfini.
2. **Scopes historiques incompatibles** : certains scénarios attendent encore qu'un scope métier `CONCESSION` ou `GLOBAL` soit accepté, alors que le contrat final impose `OWN` ou `AGENCY` pour les opérations métier.
3. **Données globales non isolées** : certains tests comptent toutes les lignes d'une table et se polluent lorsqu'ils sont exécutés en campagne sur une base partagée. Ils doivent filtrer leurs données par identifiant de fixture ou disposer chacun de leur schéma.
4. **Concurrences financières à réexaminer** : les scénarios de retour véhicule ont révélé des écarts de montants, un remboursement concurrent accepté à tort et des attentes de verrou expirées.
5. **Showroom intégrité** : des scénarios utilisent des requêtes simulées qui ne fournissent pas le nouveau contexte RBAC agence et aboutissent à des erreurs 500.
6. **Documents/cachets** : les scénarios emploient encore une portée historique rejetée par le contrat final.
7. **WSS** : le scénario requiert une terminaison TLS/Nginx Socket.IO réelle (`LCA_WSS_URL`) qui n'était pas présente dans l'infrastructure MySQL isolée.

Ces résultats sont des échecs de validation réels ; ils ne sont ni masqués ni présentés comme des succès.

## Modules frontend audités

Les gardes, queries conditionnelles, mutations et caches contextualisés ont été couverts par la suite sur les domaines suivants : authentification/session/2FA, navigation, dashboard, CRM, showroom, clients, véhicules/stock, ventes, devis, facturation, paiements, livraisons, SAV/atelier, pièces, GED, activité/audit, utilisateurs/RBAC, paramètres, RH, prestataires, reporting et trésorerie.

Les tests confirment notamment :

- absence de fallback frontend basé sur un nom de rôle ;
- cache isolé par utilisateur et agence active ;
- purge/reconstruction lors d'un changement d'agence ;
- permissions distinctes pour lecture, création, modification et opérations sensibles ;
- 401/refresh single-flight sans transformer un 403 métier en déconnexion ;
- invalidations realtime ciblées.

## Conclusion

Le frontend et les changements applicatifs livrés sont validés par compilation, build et tests. La campagne conditionnelle a rempli son objectif d'audit en révélant la dette cachée, et a permis de corriger un vrai défaut de concurrence Showroom ainsi que le socle commun des fixtures RBAC.

En revanche, la phrase « les 97 intégrations conditionnelles passent toutes » serait factuellement fausse à cette date. La fermeture complète exige encore la migration des fixtures directes restantes, l'isolation des tests financiers, la correction/validation des courses retour véhicule et la mise en place d'une pile WSS TLS jetable.
