# Audit RBAC et multi-agences

## Modèle observé

Les portées `OWN`, `AGENCY`, `CONCESSION` et `GLOBAL` sont traduites en prédicats SQL. Pour les mutations critiques, l’application reconstitue un contexte d’agence courant et revalide la permission dans la transaction, ce qui limite les changements de contexte entre lecture et écriture.

| Cas | Verdict |
|---|---|
| Prospect OWN non affecté / affecté | Conforme aux matrices testées |
| Réaffectation hors habilitation | 403 / candidat exclu |
| Client hors portée | 404 logique |
| Sous-sections Client 360 sans permission | Section absente / données non chargées |
| Véhicule hors agence | 404 logique |
| Données financières véhicule sans permission | Champs masqués et mutation refusée |
| Véhicule vendu/livré | Mutation refusée indépendamment du rôle |
| Contexte agence changé pendant mutation | `AGENCY_CONTEXT_CHANGED` ou refus |
| Transfert vers autre agence | Refus systématique faute d’autorisation destination |

## Risque résiduel

Le refus du transfert inter-agences est sûr mais incomplet. Une future implémentation devra exiger simultanément : droit source, droit destination explicite, validation de l’emplacement destination, verrou véhicule, mouvement atomique, journalisation et invalidation/notification des deux agences.

## Données de test

Aucune fixture persistante n’a été ajoutée à `lca_recette`. Les tests MySQL susceptibles de laisser des lignes ont été maintenus désactivés. Le seul test réel activé a créé puis supprimé son propre schéma.
