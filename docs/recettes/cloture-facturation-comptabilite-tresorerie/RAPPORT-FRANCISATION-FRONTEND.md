# Rapport de francisation frontend

Bundle Docker final reconstruit et contrôlé au navigateur sur Facturation, Trésorerie, Opérations, Rapprochement, Paramétrage et Comptabilité.

- `FACTURE_MANUELLE` n’est plus visible ; la ligne affiche « Facture manuelle » et « Manuelle ».
- Aucun enum technique à underscores ni statut anglais ciblé n’a été détecté sur les pages contrôlées.
- Les codes de comptes tels que `FIN_BZV_CAISSE` restent des références métier configurées, pas des libellés d’interface non traduits.
- Modales, erreurs, états vides, filtres, documents et exports portent des libellés français.
- Le bundle final utilise `/api` et la facture `FAC-LCAPNR-2026-000001` est affichée avec ses montants et son statut « Payée ».
- Responsive contrôlé en 375×812, 768×1024 et 1440×900 : navigation et actions restent accessibles.

Verdict : francisation complète sur le périmètre financier contrôlé.
