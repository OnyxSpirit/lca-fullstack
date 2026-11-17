# Cartographie des fonctionnalités

Le balayage source des trois modules a relevé 454 occurrences candidates (boutons, champs, sélecteurs, tableaux, modales, exports et gestionnaires de clic). Ce nombre brut n’est pas un nombre de fonctionnalités : les composants partagés, rendus conditionnels et répétitions JSX y figurent plusieurs fois. Après regroupement par contrat métier, la recette suit 42 parcours fonctionnels atomiques.

| Domaine | Pages / surfaces | Contrats recensés | Preuve principale |
|---|---|---:|---|
| Rapports & Indicateurs | `/reports`, panneaux consolidés et fiscal | 10 | API + MySQL + CSV + UI |
| Documents & GED | `/documents`, visionneuse, dépôt, dossier métier | 10 | HTTP + stockage temporaire + MySQL + UI |
| RH & Administration | `/hr`, 10 onglets et fiches | 16 | API + MySQL + non-régression UI |
| Fiscalité transverse | onglet RH, synthèse Rapports, GED | 6 | UI + API + MySQL concurrent |
| **Total** | | **42** | |

Tous les contrats ont au moins une preuve automatisée et/ou navigateur. Parmi eux, 15 ont été rejoués directement sur MySQL 8.4 durant cette campagne et 9 ont fait l’objet d’une interaction navigateur authentifiée. Les autres sont couverts par la suite complète et les tests de contrats ; ils ne sont pas présentés comme des clics manuels.
