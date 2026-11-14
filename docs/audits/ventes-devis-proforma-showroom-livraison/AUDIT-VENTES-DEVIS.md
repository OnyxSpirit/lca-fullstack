# Audit Ventes & Devis

## Cartographie

| UI | Composant | API | Permissions principales |
|---|---|---|---|
| `/sales` | `SalesListPage` | `GET /sales` | `sales.view` |
| `/sales/:id` | `SaleDetailPage` | `GET/PATCH /sales/:id`, `PATCH /sales/:id/status` | `sales.view`, `sales.update`, `sales.confirm`, `sales.cancel` |
| assistant vente | `SaleWizardModal` | `POST /sales`, pricing/warranty guards | `sales.create`, `sales.assign`, `sales.tax.override` |
| `/sales/quotations` | `QuotationsPage` | `GET /quotations` | `quotations.view` |
| `/crm` fiche prospect | `CrmPage`, `QuotationModal` | `/quotations*` | `quotations.create/update/validate/cancel/convert` |

## Ventes — résultats

- CONFORME navigateur : recherche exacte, partielle, insensible à la casse et état vide ; KPI recalculés.
- CONFORME navigateur : sélection client, véhicule disponible et commercial ; véhicules en transit et vendu absents.
- CONFORME navigateur : garde de remise. Une remise de 4 000 000 sous le prix minimum bloque l’étape ; 500 000 est acceptée.
- CONFORME navigateur : calcul HT/TVA/TTC et garantie `NOT_APPLICABLE` persistés.
- CONFORME navigateur : création `V-20261114-9381C06F`, véhicule réservé, détail accessible après rafraîchissement.
- CONFORME : confirmation sans facture acceptée et passage direct de réservation à `FINANCEMENT_VALIDE`.
- CONFORME : préparation bloquée tant que le solde n’est pas régularisé, puis déverrouillée après facture payée.
- CONFORME : `PREPARATION` puis `PRET_LIVRAISON` et navigation vers planification.
- CONFORME : annulation désactivée après encaissement et explication de régularisation financière.
- CONFORME MySQL : annulation non payée, double vente concurrente, courses annulation/paiement et annulation/facture, rollback et revente couverts par la suite dédiée.

## Confirmation de commande et confirmation de vente

Le code et l’interface actuels n’exposent plus deux confirmations successives. Pour une vente nouvellement créée, une seule action « Confirmer la vente » est disponible. Elle ne crée ni facture ni paiement et produit `FINANCEMENT_VALIDE`. La facture intervient ensuite ; la préparation reste soumise au gate financier.

Classement : CONFORME à la simplification actuellement documentée dans le projet, mais la terminologie du mandat et les anciennes documentations doivent être alignées. La question « les deux confirmations peuvent-elles s’enchaîner sans facture » est sans objet dans l’UI actuelle, car la première action séparée n’existe plus.

## Devis — résultats

- CONFORME navigateur : le devis se crée depuis une opportunité CRM ; la page Ventes/Devis indique justement cette origine.
- CONFORME : sélection d’un véhicule disponible, quantité, prix, remise, régime fiscal, mode HT/TTC, validité et notes.
- CONFORME : total calculé 52 316 000 FCFA pour 45 000 000 HT et remise 1 000 000.
- CONFORME : brouillon modifiable, émission `DEV-20261114-0EF7DB70`, snapshot/archivage disponible, conversion en vente déverrouillée.
- CONFORME : transformation en pro forma produit un brouillon relié sans paiement.
- CONFORME documentaire : PDF devis extrait ; identité, référence, validité, montants, concession et hash GED concordent.
- NON TESTÉE navigateur : annulation/refus, négociation, expiration et conversion effective du devis créé (une vente séparée a déjà couvert le wizard).
- DÉFECTUEUSE : avertissement de configuration incohérent, `ANO-DEV-001`.

## Tables principales

`sales`, `sale_items`, `reservations`, `quotations`, `quotation_items`, `vehicles`, `customers`, `leads`, `opportunities`, `invoices`, `payments`, `documents`, tables d’audit et de numérotation.

Les PDF bon de commande, facture et reçu ont également été extraits : références, client, VIN, remise, TVA, total et paiement concordent avec les lignes SQL et leurs hashes GED. Verdict final ventes : **CONFORME AVEC RÉSERVES** ; devis : **CONFORME AVEC RÉSERVES**, notamment `ANO-DEV-001` et les transitions non rejouées.
