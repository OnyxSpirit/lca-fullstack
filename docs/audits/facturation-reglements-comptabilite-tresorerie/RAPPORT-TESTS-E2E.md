# Rapport E2E

| Scénario | État |
|---|---|
| A Facturation vente | PARTIEL automatisé ; liste/filtres/formulaire parcourus, absence de client |
| B Paiement partiel | PARTIEL automatisé ; Treasury non configuré |
| C Multi-modes | PARTIEL automatisé |
| D Facturation SAV | PARTIEL automatisé |
| E Entrée manuelle | NON TESTÉ réel |
| F Sortie de fonds | NON TESTÉ réel |
| G Transfert | NON TESTÉ réel |
| H RBAC multi-agences | PARTIEL : Super Admin authentifié, profils métier absents |
| I Reporting | PARTIEL : écran/filtres/exports parcourus sur état vide |
| J Rejeu/concurrence | RÉUSSI automatisé |

Navigateur : recette Docker isolée migrée jusqu’à 128, compte créé par le script officiel, enrôlement 2FA normal et connexion réussie. Les écrans `/billing`, `/treasury`, `/treasury/operations`, `/treasury/settings`, `/treasury/reconciliation` et les 10 onglets de `/treasury/accounting` ont été parcourus. L’état vide, les filtres et les formulaires sont vérifiés ; aucun scénario métier complet n’est déclaré réussi faute de référentiels et de configuration.
