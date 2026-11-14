# Audit Factures pro forma

## Implémentation réelle

La pro forma est distincte du devis (`proformas`, `proforma_items`) et de la facture définitive (`invoices`). Routes : liste/détail/PDF/création/modification/émission. Permissions : `proformas.view`, `create`, `update`, `issue`, `export`; surcharge fiscale via `sales.tax.override`.

## Recette navigateur

| Fonction | Résultat | Statut |
|---|---|---|
| Liste vide, recherche, filtre, pagination | contrôles visibles et cohérents | CONFORME |
| Création client existant | client et véhicule disponible proposés | CONFORME |
| Création prospect CRM | opportunité au stade offre proposée | CONFORME |
| Filtrage véhicule | transit et vendu exclus | CONFORME |
| Calcul | 10 000 000 HT, TVA 18,9 %, 11 890 000 TTC | CONFORME |
| Modification brouillon | notes modifiées et persistées | CONFORME |
| Émission | `PRO-20261114-000001`, état Émis | CONFORME |
| Depuis devis | brouillon #2 à 52 316 000 FCFA | CONFORME |
| PDF/GED | PDF réel extrait, hash GED vérifié | DÉFECTUEUSE (`ANO-DOC-002`) |
| Annulation/expiration | aucun contrôle, endpoint ou statut | À ARBITRER |

## Intégrité

- La création utilise `clientRequestId`; un conflit de clé est relu comme création idempotente.
- La transformation depuis devis verrouille le devis source, reprend client/opportunité/fiscalité/lignes et empêche le doublon par contrainte sur le devis source.
- Une pro forma émise possède numéro, snapshot d’identité et snapshot client ; son PDF officiel provient ensuite de l’archive historique.
- Aucune facture définitive ni aucun paiement n’est créé par émission ou transformation.
- Une pro forma émise n’est plus modifiable (`409`).

## Réserves

- PDF `PRO-20261114-000001` : référence, VIN, montants (10 000 000 HT, TVA 1 890 000, total 11 890 000) et identité concession concordent avec SQL/GED. L’identité client affiche `null` malgré un snapshot individuel complet : `ANO-DOC-002`.
- Historique utilisateur dédié absent ; seules dates/audits techniques disponibles : PARTIELLE.
- Annulation et expiration : `ANO-PRO-001`, décision métier requise.

Verdict final : **NON CONFORME PARTIELLE**. Les transactions et l’immutabilité fonctionnent, mais le document officiel client est incorrect et le cycle d’annulation/expiration reste absent.
