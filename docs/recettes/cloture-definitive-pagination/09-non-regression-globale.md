# Non-régression globale

| Contrôle | Résultat |
|---|---|
| Frontend complet | **1 060/1 060**, 0 échec, 0 ignoré |
| Backend standard complet | **2 113/2 217**, 0 échec, 104 conditionnels ignorés |
| Build frontend Vite | Réussi |
| Build backend TypeScript | Réussi |
| Baseline + migrations MySQL isolées | Niveau 132, 0 avertissement |
| Tests MySQL conditionnels | Exécutés, avec échecs consignés |
| Recette navigateur publique | Réussie |
| Recette navigateur authentifiée | Bloquée par 2FA/compte E2E |

Les deux références globales sont strictement conservées. Le verdict global reste négatif à cause des réserves MySQL conditionnelles, volumétriques et E2E.

