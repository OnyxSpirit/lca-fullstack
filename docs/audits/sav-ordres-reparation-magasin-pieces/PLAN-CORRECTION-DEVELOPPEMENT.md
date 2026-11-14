# Plan de correction et développement

1. Corriger SAV-001 dans la couche d'autorisation commune, sans élargir le scope des rôles ordinaires.
2. Ajouter tests unitaires et MySQL pour Super Admin GLOBAL + agence active sur transit, journal et reporting.
3. Provisionner en recette les profils métier représentatifs, avec agences multiples et permissions OWN/AGENCY.
4. Ajouter pagination/filtres/tri/export au journal ; ajouter agence/export au reporting selon permissions existantes.
5. Créer un jeu de données jetable documenté couvrant véhicule externe, facture atelier, moyens de paiement, transit, reliquat et retour.
6. Exécuter les E2E A–I et le contrôle visuel PDF/GED.
7. Vérifier compteurs et supprimer uniquement les fixtures de campagne.

Ordre recommandé : 1–2 (P1), 3–5 (P1/P2), 6–7 (recette finale).

