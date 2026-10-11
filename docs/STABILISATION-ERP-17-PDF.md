# ERP-17 — PDF

Revue des PNG ERP16 :
1. OR7 page1, plafond : «100 /000 km». Cause : espace fine insécable U+202F de toLocaleString incompatible avec Helvetica standard. Correction ciblée du format plafond en espace ordinaire.
2. Facture14 page1 : quantité1.00 présente, alignement annoncé par ERP16 non reproduit. En revanche les lignes affichent20000/35000 sous Total TTC, alors que TVA3780/6615 et total65395.
SELECT invoice_items confirme line_total HT pour les lignes liées à repair_order_item_id ; les lignes Billing véhicule stockent déjà TTC.
Correction exclusivement de projection PDF : ajouter tax_amount aux lignes Atelier identifiées par repair_order_item_id ; autres lignes intactes, données et calculs métier inchangés.

Preuves : test erp17-pdf.test.ts ; PDF simulés /tmp/erp17-pdf/facture-simulee.pdf et or-simule.pdf. Inspection des3 pages : TTC23780+41615=65395 ; plafond100000 lisible ; A4, références et zones signatures préservées.
Archives historiques inchangées : GET des factures émises sert la GED immuable. Aucune régénération des archives REC02–16.
Décision nécessaire : traitement officiel des archives anciennes dont les colonnes TTC sont inexactes.

Phase 2 : le détail navigateur de la facture9 sur l'image active affiche encore20 000 FCFA dans la colonne Total pour un résumé TTC de23 780 FCFA. Cette preuve confirme le défaut déployé et la nécessité de la projection corrigée. L'image active étant antérieure au correctif et tout déploiement étant interdit, le PDF corrigé post-déploiement reste NON EXÉCUTÉ dans le navigateur.
