# Lot 12B — Reporting étendu et indicateurs consolidés

## Contre-audit de l'existant

| KPI existant | Page / endpoint | Source SQL | Définition et date | Scope / exclusions | Verdict |
|---|---|---|---|---|---|
| Facturation brute / nette | Reporting / `overview`, `finance`, `revenue` | `invoices`, `credit_notes` | TTC émis par `issue_date`; net = factures - avoirs valides | intersection Reporting + Billing; brouillons/annulées exclus | Correct |
| Encaissements nets | Reporting / `overview`, `finance` | `payments`, `payment_refunds` | paiements confirmés à `payment_date`, moins remboursements à leur date | scope de la facture | Correct |
| Créances | Reporting / `overview`, `finance` | `invoices.balance_due` | solde courant des factures émises | brouillons/payées/annulées exclus | Correct |
| Marge véhicules | Reporting / `overview`, `sales` | `sales`, instantanés de coût véhicule | prix final moins coût historique; repli coût courant signalé | Reporting + Sales + Financials; ventes annulées exclues | Correct, provenance visible |
| Ventes | Reporting / `sales`, `salespeople` | `sales` | vente enregistrée par `sold_at` | scope commercial; annulations ventilées/exclues des montants | Correct |
| Stock et ancienneté | Reporting / `vehicles` | `vehicles` | statuts stock; ancienneté depuis `entry_date` | vendus exclus; date métier fiable | Correct |
| Atelier | Reporting / `workshop` | `repair_orders`, `interventions`, Billing | OR par création; heures planifiées/réelles/facturées; finances Billing séparées | Reporting + Atelier + Billing | Correct; libellé « productivité » documenté par formule |
| Garanties | Reporting / `warranties` | garanties OR et créances constructeur | valeur réelle, part constructeur/client et solde | scope OR + Billing | Correct |
| Pièces | Reporting / `parts` | stocks, commandes et mouvements pièces | stock courant; consommation atelier par date de mouvement | Reporting + Parts | Correct |
| Comparaison agences | Reporting / `agencies` | Billing | montants nets et créances par agence | CONCESSION/GLOBAL uniquement | Correct |
| Dashboard CRM | Dashboard / `dashboard/overview` | `leads` | état opérationnel courant | propriétaire canonique = affecté sinon créateur | Correct, non dupliqué dans les KPI financiers |
| Reporting RH historique | RH / `hr/reporting` | employés, salaires, budgets, stock interne | agrégats RH spécialisés | permissions RH sectionnelles | Correct; conservé comme vue métier détaillée |

## Matrice authoritative Lot 12B

| Indicateur | Source authoritative | Formule | Date / statuts | Scope | Unité / remarque |
|---|---|---|---|---|---|
| Prospects créés | `leads` | `COUNT(*)` de la cohorte | `created_at` dans période | propriétaire CRM; OWN admis | nombre |
| Conversion de cohorte | `leads` | statut courant `converted` / prospects créés dans période | `created_at`; statut courant explicitement signalé | idem | %; ce n'est pas ventes/prospects |
| Essais | `showroom_test_drives` | total et statuts completed/cancelled | `created_at` | conseiller/agence/concession/global | nombre |
| Ventes et montant | `sales` | total; somme `final_price` hors cancelled | `sold_at` | commercial/agence/concession/global | nombre / XAF; source vente, jamais prospect gagné |
| Retours post-livraison | `post_delivery_vehicle_returns` | total, clôturés, crédits, remboursements, restock | `requested_at` | demandeur/agence/concession/global | nombre / XAF; ne retire pas la vente historique |
| Flux Treasury économiques | `treasury_movements` | IN/OUT POSTED sans `transfer_id` | `value_date` | agence/concession/global; OWN refusé | XAF; transferts exclus |
| Variation Treasury | `treasury_movements` | tous IN moins tous OUT | `value_date`, POSTED | idem | XAF; solde dérivé, aucun champ mutable |
| Transferts | `treasury_movements` | somme de la face OUT avec `transfer_id` | `value_date` | idem | XAF; une seule face pour éviter le double comptage |
| Budget alloué | `budgets`, `budget_fund_movements` | initial + allocations additionnelles | budgets couvrant la période, hors cancelled | agence/concession/global; OWN refusé | XAF |
| Budget consommé | `budget_expenses` | dépenses datées dans période | `expense_date` | idem | XAF; distinct du décaissement |
| Budget décaissé | `budget_expense_disbursements`, Treasury | décaissements dont mouvement POSTED non contrepassé | `value_date` | idem | XAF |
| Effectif actif | `employee_profiles` | profils `active` | état au moment de la lecture | agence/concession/global; OWN refusé | personnes; Users n'est pas la source RH |
| Masse salariale courante | `salary_history` | dernier salaire effectif au plus tard à `to`, employés actifs | date d'effet <= fin période | idem | XAF; aucune paie simulée |
| Contrats applicables | `employee_contracts` | ACTIVE et période contractuelle couvrant `to` | dates début/fin dérivées | idem | nombre |
| Congés | `employee_leaves` | PENDING; APPROVED chevauchant la période | plage start/end | idem | nombre; aucun solde de congé inventé |
| Primes approuvées | `employee_bonuses` | count/somme APPROVED | `reference_date` | idem | nombre/XAF; approuvé ne signifie pas payé |
| Activité ERP | `audit_logs` | événements, utilisateurs et modules distincts | `created_at` | utilisateur/agence/concession/global | volumes uniquement; aucun ranking |

## Architecture et performance

- Les endpoints `/reports/consolidated/*` sont indépendants : une permission absente ou une erreur d'un domaine ne bloque pas les autres panneaux.
- Chaque endpoint intersecte `reporting.view` avec toutes ses permissions sources. `OWN` est admis seulement lorsqu'un propriétaire métier existe.
- Aucune table de reporting, aucun cache Redis, ETL ou score métier n'est créé. Le schéma reste au niveau 68.
- Les requêtes s'appuient sur les index de période/scope existants des Lots 2–12A. Les plans MySQL sont vérifiés dans la recette, sans migration spéculative.
