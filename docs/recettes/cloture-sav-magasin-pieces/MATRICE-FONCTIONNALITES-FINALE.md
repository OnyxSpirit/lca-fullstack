# Matrice fonctionnelle finale

| Fonction | Statut | Validation |
|---|---|---|
| OR : création, diagnostic, approbation, travaux, clôture | Conforme avec réserve | Automatisé + inspection ; navigateur bloqué 2FA |
| Véhicule extérieur associé à l’OR | Conforme avec réserve | Automatisé + inspection ; donnée réelle absente |
| Réservation/sortie/retour de pièces | Conforme avec réserve | Automatisé, invariants SQL inspectés |
| Approvisionnement magasin | Conforme avec réserve | Automatisé + inspection |
| Facturation et encaissement atelier | Conforme avec réserve | Automatisé + inspection ; E2E réel bloqué |
| Caisse de transit | Corrigée | Scope agence et workflows automatisés |
| Journal SAV | Corrigé | Trois sources, filtres, tris, pagination, CSV |
| Reporting SAV | Corrigé | Agence active, période, indicateurs, CSV |
| RBAC multi-agences | Corrigé | Super Admin historique borné à l’agence active |
| PDF/GED | Conforme avec réserve | Tests automatisés ; rendu réel non vérifié visuellement |

Légende : « automatisé » désigne un test réellement exécuté ; « inspection » une preuve statique. Les tests navigateur métier sont bloqués par 2FA. Aucun test de déploiement n’a été exécuté.
