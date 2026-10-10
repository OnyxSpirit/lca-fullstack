# CORR-ERP-02E — Réserves

| ID | Gravité | Impact | Statut / recommandation |
|---|---|---|---|
| E-R01 | P2 | Le démarrage automatique à l'heure du créneau n'est pas un job serveur ; l'utilisateur confirme le démarrage. | Comportement explicite et sûr ; décider ultérieurement si un ordonnanceur est souhaité. |
| E-R02 | P2 | Un essai actif historique sans horaire complet bloque prudemment véhicule et commercial. | Clôturer manuellement les anciens essais ambigus ; aucun horaire n'a été inventé. |
| E-R03 | P2 | La recette navigateur complète dépend de comptes/fixtures authentifiés disponibles dans une instance isolée. | Limite documentée dans TESTS ; ne pas assimiler le build à une recette E2E. |
| E-R04 | P2/P3 | Les suites globales conservent des échecs historiques d'autres lots. | Traiter par module ; ne pas les masquer dans CORR-ERP-02E. |

Aucune anomalie P0/P1 connue ne reste ouverte dans le moteur de collision des essais planifiés.
