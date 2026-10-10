# Documents commerciaux et fiscalité

La V1 réutilise `billing.default_vat_rate`, la devise de la concession, `getEffectiveBusinessSettings()` et `getBusinessIdentity()`. Le backend calcule tous les montants avec `tax-calculation.ts`, à deux décimales et sans `FLOAT`.

`tax_mode` distingue `TAXABLE` et `TAX_EXEMPT`. `price_input_mode` distingue `HT` et `TTC`. En HT, la taxe est calculée sur le montant après remise. En TTC, le HT est extrait par `TTC / (1 + taux/100)`. Sans TVA, la taxe vaut zéro. La permission dynamique `sales.tax.override` protège toute dérogation au défaut taxable, HT et au taux effectif.

Le devis conserve le régime, le mode, le taux, la devise et ses totaux. La vente copie ces valeurs lors de la conversion. La facture véhicule reprend le snapshot de la vente. Le changement ultérieur des paramètres ne recalcule pas les transactions historiques.

L’identité est figée à l’émission du devis et de la facture dans `document_identity_snapshot`. Elle contient l’identité concession, l’agence émettrice, la devise et une copie Base64 du logo alors configuré. Un ancien PDF reste donc stable après changement d’adresse ou de logo. Le logo documentaire PNG/JPEG est stocké dans la concession, contrôlé par signature binaire et limité à 2 Mo. Il ne modifie pas le logo de l’interface.

`commercial-document.ts` fournit le renderer PDFKit commun aux devis et factures : A4, en-tête, client, références, tableau paginé, totaux adaptés au régime fiscal, emplacements de signature/cachet et pied de page numéroté.

La baseline fraîche consolidée est au niveau logique 040 et contient directement ces colonnes. Une installation historique n’exécute jamais la baseline : elle reçoit uniquement les migrations additives absentes selon son historique.
