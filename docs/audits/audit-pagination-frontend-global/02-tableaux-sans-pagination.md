# Tableaux et listes sans pagination

## Synthèse

La matrice recense 54 surfaces sans pagination. Vingt-six autres surfaces sont exemptées parce qu'elles sont structurellement bornées (lignes d'un document, checklist, petits référentiels ou agrégats). Parmi les listes non paginées, 44 anomalies sont majeures, 22 modérées et 9 mineures en incluant les paginations partielles.

## Priorité majeure — collections croissantes

| IDs | Surface | Fichier frontend | Endpoint/contrat | Risque |
|---|---|---|---|---|
| PAG-009, 010, 012 | Paiements, remboursements, règlements | `billing/InvoiceDetailPage.tsx`, `InvoicePaymentComponents.tsx` | `/invoices/:id/payments`, `/refunds` | historique financier chargé entier |
| PAG-013, 014 | Sélecteurs clients/ventes | `billing/NewInvoiceModal.tsx` | hooks legacy `/customers`, `/sales` | modal lente, téléchargement intégral |
| PAG-016–023 | Neuf colonnes Kanban | `crm/CrmPage.tsx` | `/leads?page=1&pageSize=...` | données au-delà de la première page inaccessibles |
| PAG-024 | Activités prospect | `crm/CrmPage.tsx` | `/leads/:id/activities` | journal continu |
| PAG-040 | Candidats livraison | `deliveries/NewDeliveryModal.tsx` | `/deliveries/candidates` | liste croissante |
| PAG-047 | GED d'une entité | hooks `documentHooks.ts` | `/documents/entity/:type/:id` | dossier complet chargé |
| PAG-052–054 | Congés, primes, documents salarié | sections RH | endpoints `/hr/employees/:id/*` | historique de carrière |
| PAG-060, 063 | Mouvements stock interne/fonds | `HrAdministrationPage.tsx` | collections complètes | journaux croissants |
| PAG-066–069, 071 | Prestataires et fiscalité | panneaux RH | contrats/historiques/paiements/obligations | données financières et légales |
| PAG-075, 077, 079 | Achats directs, ventes comptoir, file Pièces | panneaux `parts` | tableaux complets | activité opérationnelle continue |
| PAG-082 | Factures fournisseur | `SupplierInvoicesPanel.tsx` | hook typé `any[]` | contrat ambigu, métadonnées perdues |
| PAG-085, 086 | Rapports garantie/finance | `ReportsPage.tsx`, `FinancialReportPanel.tsx` | rapports complets | rendu lourd et export confondu avec affichage |
| PAG-097, 100, 102 | OR client externe, historique OR, transferts caisse | modules SAV | détail/collections complètes | historique métier/financier |
| PAG-108 | Sélecteurs Showroom | `ShowroomPage.tsx` | véhicules/candidats legacy | catalogue complet |
| PAG-111, 112, 114 | Historiques véhicule et transferts | `VehicleDetailPage.tsx`, panneaux transfert | ressources 360 complètes | plusieurs historiques cumulés |
| PAG-115–117 | Écritures, comptes, journaux comptables | hooks comptables | `pageSize=50/100` | suite inaccessible malgré limite |
| PAG-122 | Contrôles/clôtures/modèles/profils comptables | `AccountingAdvancedPanels.tsx` | tableaux complets | historiques institutionnels |
| PAG-127–129 | Rapprochement bancaire | `BankReconciliationPanel.tsx` et groupes | endpoints non paginés | forte volumétrie bancaire |
| PAG-138 | Fournisseurs Paramètres | `OperationalResourcesSettings.tsx` | `/suppliers?search=` | référentiel potentiellement important |

## Priorité modérée ou mineure

Sont concernés : avoirs de facture, devis d'opportunité, recherche d'entités GED, contrats salarié, rémunérations client-paginées, budgets, historique d'approbation, commandes d'une pièce, performance vendeurs, paiements d'une vente, listes internes d'un OR, essais d'une visite, historiques véhicule, catalogue commercial, comptes/trésorerie client-paginés, rôles/permissions, agences et emplacements de paramètres.

## Exemptions justifiées

- Lignes d'une facture, vente ou retour ; checklist et documents remis d'une livraison.
- Contacts Client 360 et documents du client, sous réserve d'un seuil de surveillance.
- Référentiels à faible cardinalité : catégories Pièces, types RH, barèmes Atelier, politiques 2FA, cachets/types documentaires.
- Agrégats : comparaison agences, origines Atelier, activité par module.
- Planning borné par une plage de dates et ressources d'une agence.

Une exemption n'est pas une garantie permanente : ajouter une alerte ou un test de volumétrie si le métier permet une croissance non bornée.
