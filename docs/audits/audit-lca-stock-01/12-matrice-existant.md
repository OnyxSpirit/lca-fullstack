# Matrice de l'existant

| Fonctionnalité | Frontend | Backend | MySQL | Raccordement | Vérifiée | Observation |
|---|---|---|---|---|---|---|
| Catalogue modèles | oui | oui | oui | oui | code | global |
| Création modèle | oui | oui | oui | oui | code | centrale |
| Commande en flotte | oui | oui | oui | oui | HTTP/MySQL antérieur | 1..1000 |
| Génération fiches | indirect | oui | oui | oui | oui | immédiate |
| Véhicules sans VIN | stock | oui | oui | oui | oui | VIN NULL |
| Suivi quantités | oui | calculé | dérivé | oui | oui | statut-based |
| Réception partielle/totale | oui | oui | oui | oui | oui | mêmes IDs |
| Historique réceptions | non | écriture seule | oui | partiel | oui | aucun GET/UI |
| Reliquat | oui | oui | dérivé | oui | oui | unités ordered |
| Modification individuelle | stock | oui | oui | oui | code | indépendante |
| VIN ultérieur | stock | oui | oui | oui | code existant | non testé ici |
| Photos profil/unité | oui/stock | oui | oui | oui | code | galeries distinctes |
| Pagination commandes | oui | oui | n/a | oui | code | 10/20/50/100 |
| Recherche commandes | non | non | n/a | non | n/a | absente |
| RBAC agence | partiel | oui | oui | oui | test antérieur | manage/view écart |
| Idempotence | UUID client | oui | uniques | oui | code | réponse répétée appauvrie |
| Transaction/concurrence | n/a | oui | InnoDB/locks | oui | test antérieur | 201/409 |
| Lien commande dans stock | non | non exposé | oui | non | code | FK invisible |

