# Matrice Frontend ↔ Backend ↔ MySQL

> Clôture du 14 novembre 2026 : les chaînes nominales ci-dessous ont été vérifiées jusqu’à MySQL/GED. Les tests concurrents livraison/vente sont réussis ; le contexte multi-agences complet reste bloqué par la fixture 2FA.

| Interaction | Page/composant | Hook/service | HTTP | Permission/middleware | Tables/transaction | Cache/événement | Résultat |
|---|---|---|---|---|---|---|---|
| Lister ventes | SalesListPage | sales page query | GET `/sales` | agency business `sales.view` | sales, sale_items, customers, vehicles | query ventes | conforme |
| Créer vente | SaleWizardModal | `useCreateSale` | POST `/sales` | `sales.create` | sales, items, reservations, vehicles; transaction+locks | ventes/véhicules/clients/CRM | conforme |
| Confirmer vente | SaleDetailPage | status mutation | PATCH `/sales/:id/status` | `sales.confirm` | sales, vehicle, archive/audit | sale updated | conforme |
| Préparer/prêt | SaleDetailPage | status mutation | PATCH status | `sales.confirm` | sale + gate invoice/payment | ventes/livraisons | conforme |
| Créer devis | QuotationModal | `useCreateQuotation` | POST `/quotations` | `quotations.create` | quotations/items/opportunity/customer | quotations/leads/customers | conforme |
| Émettre devis | CrmPage | `useValidateQuotation` | POST `/quotations/:id/validate` | `quotations.validate` | quotation, snapshots, documents | quotations/leads | conforme |
| Devis→pro forma | CrmPage | create proforma | POST `/proformas` | `proformas.create` | proformas/items, lock quotation, unique source | proformas | conforme |
| Créer pro forma | ProformasPage | proforma mutation | POST `/proformas` | agency business create | proformas/items/customer/opportunity | proformas | conforme |
| Modifier pro forma | ProformasPage | update mutation | PATCH `/proformas/:id` | update | draft lock, items/totals | proformas | conforme |
| Émettre pro forma | ProformasPage | issue mutation | POST `/proformas/:id/issue` | issue | number/snapshots/documents | proformas/GED | conforme |
| Affecter visite | ShowroomPage | showroom action | PATCH showroom | `showroom.assign` | visits/users/audit | showroom notification | conforme |
| Démarrer/retour essai | ShowroomPage | drive mutations | PATCH drive | visitor.update | drives/vehicles/CRM, locks | showroom/vehicles/CRM | conforme |
| Créer facture | billing modal | billing action | POST `/invoices` | invoice.create | invoice/items/sale lock | invoices | conforme |
| Émettre facture | InvoiceDetailPage | billing action | PATCH status | invoice.issue | invoice snapshot + GED | invoice updated | conforme |
| Encaisser | InvoicePaymentForm | payment mutation | POST payments | payment.collect | payment/invoice/sale/treasury; transaction | billing/treasury | conforme |
| Planifier livraison | NewDeliveryModal | `useCreateDelivery` | POST `/deliveries` | schedule | deliveries/sale/vehicle/candidate locks | deliveries | conforme, heure erronée |
| Figer checklist | DeliveryDetailPage | status action | PATCH status | prepare | delivery + checklist instances | delivery detail/list | conforme |
| Cocher contrôle | DeliveryDetailPage | checklist mutation | PATCH checklist | checklist.manage | item instance + delivery lock | detail | conforme |
| Finaliser livraison | DeliveryDetailPage | `useSignDelivery` | POST `/deliveries/:id/sign` | signature.capture+complete | delivery/sale/vehicle/signature/warranty/PV transaction | deliveries/vehicles/sales | conforme |

## Contrats et invalidations

Les hooks invalidant les clés ventes, véhicules, clients, CRM, devis, pro forma, factures et livraisons couvrent les scénarios observés. Aucun succès fantôme n’a été constaté : chaque toast critique a été suivi d’un changement UI persistant. Le décalage horaire révèle cependant un contrat date locale/UTC incohérent.
