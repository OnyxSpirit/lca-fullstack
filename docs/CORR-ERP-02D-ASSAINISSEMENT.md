# CORR-ERP-02D — Assainissement des tests historiques

Les 67 échecs de fichiers de la référence (41 backend, 26 frontend) ont été examinés au niveau campagne. Le traitement détaillé a été concentré sur le CRM et les infrastructures directement affectées, conformément au périmètre de mission.

## Anomalies du logiciel

| Identifiant du test | Module | État initial | Catégorie | Cause racine | Règle métier actuelle | Action effectuée | État final | Justification |
|---|---|---|---|---|---|---|---|---|
| CORR-02D-A/B | Showroom | doublon concurrent possible | A | lecture hors transaction, absence de verrous ressource | un seul essai actif par véhicule/commercial | verrous, transaction et retry deadlock | passe MySQL 8.4 | règle explicite |
| CORR-02D-G | Showroom | annulation non sérialisée | A | update sans verrou des ressources | transition atomique | annulation transactionnelle | passe | préserve l'ordre transactionnel |
| CORR-02D-H | CRM | aucune collision croisée | A | domaines interrogés séparément | un commercial ne peut être aux deux activités simultanément | contrôle bidirectionnel de l'activité courante | passe au niveau disponible | aucun override étendu |
| VALID-ACTIVITY-AUTHOR | CRM | auteur de retour absent | A | INSERT omettait `created_by` | auteur et responsable sont distincts | auteur de session ajouté | passe | traçabilité actuelle |

## Anomalies des tests

| Identifiant du test | Module | État initial | Catégorie | Cause racine | Règle métier actuelle | Action effectuée | État final | Justification |
|---|---|---|---|---|---|---|---|---|
| crm-negotiation-regression | CRM frontend | échec | B | ancien hook non paginé et ancien logout | pagination serveur et échec auth définitif | assertions actualisées | passe | contrat courant démontré |
| crm-stabilization | CRM frontend | échec | B | anciens hooks/candidats et statut pending | membres CRM et création idempotente courants | assertions actualisées | passe | couverture conservée |
| crm-search.behavior | CRM frontend | échec | C | mock tableau incompatible avec réponse paginée | API paginée | fixture réparée | passe | aucune règle modifiée |
| crm-reassignment.behavior | CRM frontend | échec | C | mock tableau incompatible | API paginée | fixture réparée | passe | aucune règle modifiée |
| crm-negotiation-ui.behavior | CRM frontend | échec | C | mock tableau incompatible | API paginée | fixture réparée | passe | aucune règle modifiée |
| VALID-ERP-02D locking | CRM backend | attestait l'absence de protection | B | assertion devenue inverse de l'objectif | les verrous doivent exister | contrat positif substitué | passe | couvre la correction |
| BOOTSTRAP-10 | Base | plage figée à 071 | B | inventaire historique codé en dur | migrations additives continues après baseline | contrôle dynamique de continuité | passe isolé | ne masque aucun trou |

Synthèse : **4 tests/fichiers obsolètes actualisés** et **3 tests/fichiers techniquement défectueux réparés**. Aucun test n'a été supprimé, neutralisé ou marqué `skip`.

## Anomalies d'environnement

| Identifiant du test | Module | État initial | Catégorie | Cause racine | Règle métier actuelle | Action effectuée | État final | Justification |
|---|---|---|---|---|---|---|---|---|
| SUPERTEST-LISTEN-EPERM | Backend HTTP | échec dans sandbox | D | interdiction locale d'ouvrir un socket | exécuter l'API réelle sans changer le produit | relance isolée hors sandbox | 6/6 Showroom passent | problème d'environnement confirmé |
| MYSQL-ABSENT | Concurrence | intégration ignorée par défaut | D | aucune base de test fournie | MySQL 8.4 jetable sans volume | conteneur 8.4.11 temporaire | passe | aucune base persistante touchée |

Deux problèmes d'environnement ont été corrigés dans le dispositif de recette. Les échecs des autres modules restent classés pour leurs lots dédiés ; aucune logique hors périmètre n'a été modifiée pour les masquer.
