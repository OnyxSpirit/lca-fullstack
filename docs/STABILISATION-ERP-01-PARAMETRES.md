# STABILISATION-ERP-01 — Paramètres, référentiels et documents

## Inventaire

| Domaine | Stockage/API | Permission | Consommateurs / preuve à préparer |
|---|---|---|---|
| Identité concession/agence | `settings`, concessions/agencies, routes settings | settings.view/update/manage | devis, bon, facture, livraison, reçus; snapshot avant/après modification |
| TVA/devise | settings effectifs par agence | settings.update, sales.tax.override | ventes, devis, factures, reporting; XAF et taux configuré |
| Durées RDV/essai | settings showroom | settings.update | CRM/Showroom; conflit et valeur par défaut |
| Constructeurs | brands/models/versions | settings.manufacturers.* | véhicules, garanties, filtres |
| Emplacements véhicules | locations/vehicle_locations | settings/vehicles permissions | stock, transferts, comptages |
| Baies/ressources atelier | workshop_bays, technicians, unavailability | workshop.bay/resources/technicians.* | planning/capacité |
| Tarifs atelier | workshop_labor_rates | settings/workshop manage | estimation et facture SAV; snapshot tarif |
| Services livraison | delivery_service_catalog | delivery.service.manage/view | préparation et facture éventuelle |
| Checklist livraison | categories/items/templates/instances | delivery.checklist.config.* | nouvelles livraisons; immutabilité des instances |
| Références GED | document_types/categories/sequences | settings.view/update, ged.* | upload, recherche, numérotation |
| Comptes/catégories finance | treasury_accounts/categories/mappings | treasury.account/category.manage | tous mouvements et exports |
| Types RH | contract/leave/bonus/budget categories | hr.*.type/category.manage | contrats, congés, primes, budgets |
| Logo | identité/settings, stockage public/privé selon usage | settings.update | tous PDF commerciaux déclarés |
| Signature utilisateur | user_signature_versions | signature.view/manage.self | PV livraison facultatif |
| Cachet | service_stamps/versions | stamp.view/manage/use | **seul contexte démontré : `DELIVERY_REPORT`** |

## Matrice documentaire

| Document | Déclencheur | Archive | Logo/identité | Signature/cachet |
|---|---|---|---|---|
| Devis | émission | GED immuable | oui, à vérifier visuellement | non démontré |
| Bon de commande | confirmation vente | GED immuable | oui | non démontré |
| Facture | émission | GED immuable | oui | non démontré |
| Reçu paiement | paiement confirmé | GED/route dédiée | identité à vérifier | non démontré |
| PV livraison | finalisation | GED immuable + snapshot | oui | facultatifs, réellement intégrés |
| Avoir | émission | archive métier | identité à vérifier | non démontré |
| PV retour | clôture retour | PDF | identité à vérifier | non démontré |
| OR/SAV | étapes propres | PDF/archives selon route | à vérifier | signature client distincte |

## Tests indispensables

Pour chaque paramètre : GET autorisé; mutation autorisée/refusée; validation format/taille; scope inter-agence; consommation réelle; snapshot avant changement; nouveau document après changement; ancien document inchangé; erreur exploitable si configuration absente. Pour le cachet : upload PNG/JPEG, refus SVG/magic byte, version active unique, désactivation, permission `stamp.use`, application seulement au PV livraison.
