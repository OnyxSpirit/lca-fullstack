# Comparaison des architectures

| Critère | A — deux mécanismes | B — tout dans cachets | C — tout dans politiques |
|---|---|---|---|
| Sens métier | Fort : éligibilité + obligation | Mélange ressource/règle | Fort pour règles, mais catalogue à conserver |
| Plusieurs cachets/document | Naturel | Naturel mais ambigu | Naturel avec candidats éligibles |
| Multi-agences | Compatible | Formulaire cachet surchargé | Compatible si politique par agence |
| Historique | Aucun impact | Migration complexe | Faible impact |
| Générateurs existants | Compatible | Refactor important | Compatible avec extension progressive |
| Maintenabilité | Bonne avec UI clarifiée | Faible | Bonne, mais l’éligibilité reste nécessaire |

## Recommandation

Conserver le modèle conceptuel de l’option A, qui est déjà le modèle réel, tout en présenter l’option C comme point d’entrée UX principal : la fiche cachet conserve identité, propriétaire, partage et documents **autorisés** ; la politique configure les règles d’émission et le cachet par défaut. Supprimer l’un des deux modèles de données créerait soit une ambiguïté, soit une perte de contrôle sur les candidats.
