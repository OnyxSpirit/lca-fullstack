# Non-régression

- Backend `npm run build` : réussi.
- Frontend `npm run build` : réussi (2546 modules transformés).
- Test documentaire ciblé : réussi via import TSX direct; le lancement Node `--test` isolé échoue au niveau du fichier dans ce sandbox sans diagnostic détaillé, alors que les deux cas exposent leur résultat avec l’invocation d’import.
- Aucune migration créée.
- Aucun workflow de vente, paiement, stock ou comptabilité modifié.
- Aucun test MySQL destructif exécuté.

Les campagnes VIN, Livraison et Comptabilité de la première mission ne sont pas rejouées dans ce lot; leurs résultats antérieurs ne sont pas présentés comme une nouvelle exécution.
