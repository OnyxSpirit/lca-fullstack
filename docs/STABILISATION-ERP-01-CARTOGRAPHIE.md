# STABILISATION-ERP-01 — Cartographie exhaustive

Date : 11 octobre 2026. État de chaque capacité : **IMPLÉMENTÉE / À EXÉCUTER**, sauf mention contraire. Une présence dans le code n’est pas une validation fonctionnelle.

## Vue d’ensemble

- 24 modules backend : activity, auth, billing, core, crm, customers, dashboard, deliveries, document-marks, documents, hr, notifications, parts, quotations, rbac, reports, sales, settings, showroom, treasury, users, vehicle-returns, vehicles, workshop.
- 23 répertoires fonctionnels frontend, 29 routes React dont 25 protégées ou imbriquées.
- 490 déclarations de routes API, 151 tables/structures SQL recensées, 255 permissions métier actives/historiques à vérifier sur installation fraîche.
- 120 capacités cartographiées ci-dessous; chaque identifiant correspond au scénario homonyme `REC-*` dans la matrice.

## Capacités par module

| Module | Pages / composants | Capacités identifiées |
|---|---|---|
| Authentification | Login, bootstrap session | ERP-AUTH-001 connexion; ERP-AUTH-002 refresh mono-vol; ERP-AUTH-003 déconnexion/révocation; ERP-AUTH-004 `/me`; ERP-AUTH-005 expiration et isolation de session. |
| Dashboard | Dashboard, recherche globale, portail modules | ERP-DASH-001 KPI; ERP-DASH-002 navigation par permissions; ERP-DASH-003 recherche globale; ERP-DASH-004 actions rapides; ERP-DASH-005 invalidation temps réel. |
| CRM | CRM, NewLead, rendez-vous, activités | ERP-CRM-001 créer/modifier prospect; ERP-CRM-002 affecter commercial; ERP-CRM-003 pipeline; ERP-CRM-004 activités/suivis; ERP-CRM-005 rendez-vous et conflits. |
| Showroom | Showroom, modal essai | ERP-SHOW-001 réception visite; ERP-SHOW-002 détection doublon; ERP-SHOW-003 affectation/statut; ERP-SHOW-004 essai planifié/immédiat; ERP-SHOW-005 retour, reprogrammation, annulation. |
| Clients 360 | liste et fiche client | ERP-CUST-001 créer/modifier; ERP-CUST-002 contacts; ERP-CUST-003 doublons; ERP-CUST-004 timeline 360; ERP-CUST-005 affectation/périmètre. |
| Devis | modal devis, PDF métier | ERP-QUOT-001 créer depuis opportunité; ERP-QUOT-002 remise/fiscalité; ERP-QUOT-003 modifier brouillon; ERP-QUOT-004 émettre/archiver PDF; ERP-QUOT-005 annuler/rejeter/convertir. |
| Véhicules | liste, détail, création, édition, transfert | ERP-VEH-001 stock VN/VO et filtres; ERP-VEH-002 création/édition; ERP-VEH-003 images; ERP-VEH-004 statuts/transferts/emplacements; ERP-VEH-005 coûts, garantie et historique 360. |
| Ventes | liste, assistant, détail | ERP-SALE-001 création atomique; ERP-SALE-002 conditions/remise/TVA; ERP-SALE-003 confirmation; ERP-SALE-004 garde financière; ERP-SALE-005 annulation/remise en stock. |
| Facturation | factures, détail, nouvelle facture | ERP-BILL-001 facture client/SAV; ERP-BILL-002 émission et PDF; ERP-BILL-003 encaissement/reçu; ERP-BILL-004 avoir/remboursement; ERP-BILL-005 export comptable. |
| Livraison | planning, détail, checklist, services | ERP-DEL-001 candidats/planning; ERP-DEL-002 checklist configurable; ERP-DEL-003 services/documents; ERP-DEL-004 signature/finalisation; ERP-DEL-005 autorisation de solde et annulation. |
| Retours véhicule | fiche retour | ERP-RET-001 ouvrir/recevoir; ERP-RET-002 inspection; ERP-RET-003 déductions; ERP-RET-004 résolution financière; ERP-RET-005 décision stock/clôture/PDF. |
| SAV | tableau SAV, création OR, détail | ERP-SAV-001 rendez-vous/réception; ERP-SAV-002 créer/mettre à jour OR; ERP-SAV-003 diagnostic/devis/accord; ERP-SAV-004 contrôle/restitution; ERP-SAV-005 abandon/annulation/facturation. |
| Atelier | planning atelier | ERP-WKS-001 planning/baies; ERP-WKS-002 techniciens/indisponibilités; ERP-WKS-003 interventions; ERP-WKS-004 sessions/temps; ERP-WKS-005 véhicules et clients extérieurs. |
| Garanties | cartes garantie SAV | ERP-WAR-001 contrat véhicule; ERP-WAR-002 éligibilité; ERP-WAR-003 décision OR; ERP-WAR-004 allocations; ERP-WAR-005 sinistre/paiement constructeur. |
| Pièces | magasin, détail, emplacements | ERP-PART-001 catalogue/fournisseurs; ERP-PART-002 stocks/mouvements/transferts; ERP-PART-003 inventaire/ajustement/retour; ERP-PART-004 réservation/consommation OR; ERP-PART-005 commande/réception fournisseur. |
| Finance fournisseur | panneau factures fournisseur | ERP-SUP-001 dette/facture; ERP-SUP-002 soumission/validation/rejet; ERP-SUP-003 avoir fournisseur; ERP-SUP-004 paiement; ERP-SUP-005 historique et rapprochement commande-réception. |
| Trésorerie | comptes, journal, opérations manuelles | ERP-TRE-001 comptes/catégories; ERP-TRE-002 encaissement/décaissement; ERP-TRE-003 transfert/contrepassation; ERP-TRE-004 réservations de liquidité; ERP-TRE-005 clôture/readiness/journal. |
| Rapprochement bancaire | panneau rapprochement | ERP-BANK-001 import/aperçu CSV; ERP-BANK-002 validation/rejet; ERP-BANK-003 propositions; ERP-BANK-004 rapprochement/dérapprochement; ERP-BANK-005 annulation/historique/export. |
| RH | administration, employés, contrats, congés, primes | ERP-HR-001 employé/compte; ERP-HR-002 contrat; ERP-HR-003 salaire/rémunération; ERP-HR-004 congé; ERP-HR-005 prime et reporting. |
| Budgets & stock interne | onglets RH/finance | ERP-BUD-001 catégories/enveloppes; ERP-BUD-002 soumission/approbation; ERP-BUD-003 dépense/engagement; ERP-BUD-004 décaissement; ERP-BUD-005 stock interne/mouvements/seuils. |
| GED | GED, aperçu, dépôt | ERP-GED-001 références/types; ERP-GED-002 upload privé; ERP-GED-003 versionnement; ERP-GED-004 aperçu/téléchargement; ERP-GED-005 archivage/restauration/rattachement. |
| Marques documentaires | paramètres cachets/signatures | ERP-MARK-001 signature utilisateur; ERP-MARK-002 cachet institutionnel; ERP-MARK-003 version/activation; ERP-MARK-004 snapshot documentaire; ERP-MARK-005 application au PV livraison. |
| Notifications & activité | notifications, activité | ERP-OBS-001 lister/lire; ERP-OBS-002 archiver/supprimer; ERP-OBS-003 ciblage temps réel; ERP-OBS-004 journal d’activité filtré; ERP-OBS-005 audit ancienne/nouvelle valeur. |
| Reporting | rapports opérationnels/financiers | ERP-REP-001 consolidé; ERP-REP-002 commercial/stock; ERP-REP-003 atelier/origine; ERP-REP-004 RH/finance; ERP-REP-005 exports CSV et filtres. |
| Administration & paramètres | utilisateurs, rôles, Settings | ERP-ADM-001 utilisateurs; ERP-ADM-002 rôles dynamiques; ERP-ADM-003 permissions/scopes; ERP-ADM-004 concession/agence/identité; ERP-ADM-005 paramètres métier et référentiels. |

## Dépendances et risques communs

Toutes les mutations dépendent de l’authentification, du catalogue RBAC et du scope. Les principaux pivots sont `agency_id`, le propriétaire métier, les statuts, les snapshots financiers/documentaires et les mouvements append-only. Les risques dominants sont les tests globaux rouges, les assertions textuelles fragiles, les dépendances implicites de fixtures, les parcours UI non exécutés multi-rôles et les 490 routes trop nombreuses pour une seule campagne.

## Couverture existante

217 fichiers de test backend, dont 61 artefacts explicitement MySQL/intégration, et 151 fichiers frontend. AUDIT-ERP-03 établit 178/217 fichiers backend réussis et 755/786 tests frontend réussis. Cela prouve une couverture importante mais non une validation générale; les 120 scénarios restent `À EXÉCUTER` dans cette mission préparatoire.
