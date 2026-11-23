# Audit des générateurs PDF

| Document | Service | Politiques | Affectation cachet | Peut sortir sans marques | Blocage |
|---|---|---:|---:|---:|---:|
| Devis émis | `archiveQuotation` | Oui | Oui | Oui sans politique/ALLOW | Oui si BLOCK |
| Bon de commande confirmé | `archiveSaleOrder` | Oui | Oui | Oui sans politique/ALLOW | Oui si BLOCK |
| Facture émise | `archiveInvoice` | Oui | Oui | Oui sans politique/ALLOW | Oui si BLOCK |
| Reçu confirmé | `archivePayment` | Oui | Oui | Oui sans politique/ALLOW | Oui si BLOCK |
| PV livraison | `archiveDelivery`, route de signature | Non, workflow explicite | Oui | Oui, signature/cachet agent facultatifs | Contrôles du workflow, pas politique |
| Pro forma | `proforma.routes`, `renderProformaDocument` | Non | Non | Oui | Non |
| Retour véhicule / avoir | archive historique dédiée | Non | Non | Oui | Non lié aux marques |
| Documents SAV | générateurs atelier/commerciaux | Non démontré | Non démontré | Oui | Non démontré |
| Fiches prospect/client/showroom | `official-document.routes` | Non | Non | Oui | Non |
| Fiche employé | `employee-document.ts` | Non | Non | Oui | Non |
| Rapports comptables/financiers | services de rapports | Non | Non | Oui | Non |

Les quatre documents automatiques respectent l’agence du document et figent les versions dans `document_mark_snapshots`. Les PDF historiques sont relus depuis l’archive et ne sont pas recalculés.

La pro forma est absente de `documentMarkTypes`; son émission archive un rendu sans appel à `resolveDocumentMarks`.
