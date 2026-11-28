# Simplification frontale

Le parcours « Modèles sur commande » expose « Nouvelle commande » et retire l'éditeur technique. Champs visibles : marque, modèle, version facultative, quantité, photographie illustrative facultative. Marque et modèle utilisent un champ recherchable avec action explicite `+ Ajouter « … »`; une modification de marque réinitialise modèle et version.

Le lint TypeScript et le build Vite Node 22 passent. Le `dist` préexistant étant non modifiable, le build a été produit dans `.artifacts/correctif-lca-stock-01-final`. Les captures réelles figurent dans `preuves/recette-*.png`.

Clôture : validations natives 0, -1, 1,5, 1000 et 1001, trois formats photo, absence facultative et responsive 1440/1024/390 sont tous prouvés.
