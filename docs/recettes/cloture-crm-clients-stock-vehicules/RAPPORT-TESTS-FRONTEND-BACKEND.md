# Rapport de tests frontend/backend

| Contrôle | Résultat |
|---|---|
| `backend-node npm run build` | Succès |
| `frontend npm run build` | Succès, 2547 modules |
| Image Docker backend | Construite |
| Image Docker frontend | Construite |
| Backend recette | Sain |
| Frontend recette | Démarré sur 4176 |
| Recette authentifiée | Succès avec un rôle métier non privilégié |
| Tests statiques ciblés | 7/7, 0 échec |
| Intégration MySQL dédiée | 2/2, schéma jetable supprimé |

Les hooks et contrats ont été alignés pour les nouveaux filtres, contacts, archives et transitions de transfert. Les erreurs API de la modale contact sont désormais visibles et les champs facultatifs vides sont normalisés avant envoi.
