# Correction RH — catégories du stock interne

- `hr.stock.manage: AGENCY` affiche et autorise la gestion des catégories.
- `OWN` et l’absence de permission restent refusés.
- La concession est toujours dérivée de l’agence active côté serveur.
- Un `concessionId` client incompatible est refusé.
- Création, modification, désactivation et réactivation conservent l’historique et l’intégrité des articles.
- Les catégories inactives ne sont pas utilisables pour un nouvel article.
- Le même modèle a été appliqué aux référentiels RH concessionnels (contrats, congés, primes et catégories budgétaires).

Preuve ciblée : test MySQL `hr-stock-governance-mysql.integration.test.ts` réussi.
