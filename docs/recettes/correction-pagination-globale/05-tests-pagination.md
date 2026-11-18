# Tests de pagination

Résultats observés :

- `npm run lint` frontend : réussi.
- `npm run build` frontend : réussi, 2 551 modules transformés.
- Test statique `pagination-global-foundation.test.ts` : couvre tailles standard, navigation complète, accessibilité, réutilisation client et PAG-082.
- Tests CRM et RH adaptés aux valeurs standard.
- Test backend FIN05 étendu pour le contrat paginé des factures fournisseur.

Le script global frontend lance toute la suite même lorsqu'une liste de fichiers est fournie. Des tests historiques fondés sur la mise en forme exacte de sources CRM échouent après formatage, alors que la compilation et le build réussissent. Ils sont consignés comme dette de tests statiques, pas masqués comme succès.
