# Matrice frontend / API / MySQL

Légende : **V** = testé et validé ; **C** = testé, corrigé puis revalidé. `MYSQL` = exécution réelle MySQL 8.4 ; `UI` = interaction navigateur authentifiée ; `NR` = suite complète ou contrat automatisé.

| ID | Module / interaction | API / persistance | Permission | Preuve | État |
|---|---|---|---|---|---|
| REP-01 | période début/fin | `GET /reports/*`; agrégats bornés | reporting + source | MYSQL/NR | V |
| REP-02 | granularité jour/semaine/mois | séries SQL datées | `reporting.view` | MYSQL/NR | V |
| REP-03 | agence / consolidation | prédicats agence/concession/global | sources | MYSQL/UI | V |
| REP-04 | sections indépendantes | endpoints par domaine | matrice cumulée | MYSQL/NR | V |
| REP-05 | facturation nette / encaissements | invoices, avoirs, paiements | `billing.*.view` | MYSQL | V |
| REP-06 | ventes/marges/annulations | sales, items, financing | ventes + finance | MYSQL | V |
| REP-07 | stock courant | vehicles, part_stocks | stock | MYSQL | V |
| REP-08 | atelier | temps et productivité | productivité | MYSQL/NR | V |
| REP-09 | export CSV français | `GET /reports/export` | export + source | MYSQL/NR | V |
| REP-10 | synthèse fiscale | obligations fiscales | fiscalité lecture | MYSQL/UI | V |
| GED-01 | recherche et filtres | `GET /documents` | GED + métier | MYSQL/NR | V |
| GED-02 | pagination | page/pageSize | `ged.view` | MYSQL/NR | V |
| GED-03 | dépôt PDF | `POST /documents`; fichier + ligne | `ged.upload` | MYSQL/NR | V |
| GED-04 | rattachement métier | résolution entité/agence | droits cumulés | MYSQL/NR | V |
| GED-05 | nouvelle version | version + empreinte | `ged.upload` | MYSQL | V |
| GED-06 | aperçu sécurisé | flux API non public | lecture cumulée | NR/UI | V |
| GED-07 | téléchargement | flux authentifié | lecture cumulée | NR/UI | V |
| GED-08 | archivage | statut + audit | `ged.archive` | MYSQL | V |
| GED-09 | restauration | statut + audit | `ged.archive` | MYSQL | V |
| GED-10 | autre agence refusée | prédicats cumulés | scopes | MYSQL | V |
| RH-01 | personnel : liste/filtres/fiche | employee_profiles | employés lecture | NR/UI | V |
| RH-02 | personnel : créer/modifier | profils + audit | employés gestion | NR | V |
| RH-03 | liaison compte ERP | transaction link/unlink | compte dédiée | NR | V |
| RH-04 | congés : workflow | employee_leaves + audit | congés | NR | V |
| RH-05 | primes : workflow | employee_bonuses | primes | NR | V |
| RH-06 | salaires : historique | salary_history | salaire | MYSQL/NR | V |
| RH-07 | rémunérations | snapshots et statuts | rémunération | NR | V |
| RH-08 | prestataires/contrats | profils, contrats, GED | prestataire | NR | V |
| RH-09 | stocks internes | mouvements verrouillés | stock RH | NR | V |
| RH-10 | budgets : workflow | budgets + historique | budget | MYSQL/NR | V |
| RH-11 | dépenses : workflow | expenses + audit | dépense | NR | V |
| RH-12 | décaissement relié | Treasury + dépense | double droit | NR | V |
| RH-13 | rallonges | demandes + historique | fonds | MYSQL/NR | V |
| RH-14 | reporting RH | effectifs, paie, budget, stock | reporting + sources | MYSQL/UI | V |
| RH-15 | scopes dynamiques | prédicats par section | scopes | MYSQL | V |
| RH-16 | même acteur autorisé | auteur historisé | approbation | MYSQL/NR | V |
| FIS-01 | configurer une nature | types fiscaux | catalogue | UI/NR | C |
| FIS-02 | conserver formulaire en erreur | aucune fermeture après refus | action | NR | C |
| FIS-03 | obligation : workflow | obligations + événements | droits séparés | MYSQL | V |
| FIS-04 | règle non vérifiée refusée | règles historisées | catalogue | MYSQL | V |
| FIS-05 | paiement positif/concurrent | paiements verrouillés | paiement | MYSQL/NR | C |
| FIS-06 | anti-double-clic | mutation unique / boutons bloqués | action | UI/NR | C |

## Décompte

- Contrats inventoriés et pourvus d’une preuve : **42/42**.
- Validés sans correction : **38** ; corrigés puis revalidés : **4**.
- Bloqués : **0** ; non testés au niveau des contrats : **0**.

Ce décompte porte sur les contrats métier dédupliqués et distingue explicitement le niveau de preuve ; il ne transforme pas les 454 occurrences JSX en 454 validations manuelles.
