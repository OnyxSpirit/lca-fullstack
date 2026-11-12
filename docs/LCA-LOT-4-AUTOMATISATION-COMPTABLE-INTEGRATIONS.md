# ERP LCA — Lot 4 — Automatisation comptable et intégrations intermodules

## Résumé

Le Lot 4 met en place une automatisation comptable centralisée, durable et paramétrable. Les modules métier ne contiennent pas d’instructions SQL comptables dispersées : un collecteur identifie les faits confirmés, les inscrit dans une file MySQL idempotente, puis un processeur applique un schéma comptable actif et produit une pièce comptabilisée avec les invariants du Lot 3.

L’automatisation démarre à la date d’application de la migration 121. Les opérations historiques antérieures ne sont jamais reprises automatiquement. Une reprise historique devra faire l’objet d’une procédure explicite ultérieure.

## Architecture

```text
Tables métier confirmées
  → collecteur périodique
  → accounting_integration_events (source_key unique)
  → résolution du schéma par événement, agence et date
  → résolution des comptes fixes ou de la liaison Treasury
  → contrôle des montants, comptes, devise et période
  → transaction MySQL + verrouillage de la séquence
  → accounting_entries / accounting_entry_lines
  → tentative, audit et supervision
```

Le traitement de fond démarre avec le serveur, s’exécute toutes les vingt secondes et utilise MySQL comme garantie durable. Socket.IO n’est pas utilisé comme file de livraison.

## Cartographie effectivement raccordée

| Domaine | Événement réel | Source | État déclencheur | Couverture |
|---|---|---|---|---|
| Facturation clients, ventes, SAV et magasin | Facture émise | `invoices` | émise, partiellement réglée, réglée ou échue | Opérationnelle pour les nouvelles factures |
| Encaissements | Paiement confirmé | `payments` | confirmé | Opérationnelle, paiement partiel ou total indépendant |
| Clients | Avoir émis/appliqué | `credit_notes` | émis ou appliqué | Opérationnelle |
| Clients | Remboursement | `payment_refunds` | remboursement créé | Opérationnelle |
| Fournisseurs | Facture validée | `supplier_invoices` | validée | Opérationnelle |
| Fournisseurs | Avoir validé | `supplier_credit_notes` | validé | Opérationnelle |
| Budgets, RH et règlements fournisseurs | Décaissement effectif | `budget_expense_disbursements` avec mouvement Treasury comptabilisé | mouvement comptabilisé | Opérationnelle ; le budget ou l’engagement seul ne produit rien |
| Treasury | Mouvement manuel sans source déjà comptabilisée | `treasury_movements` | comptabilisé | Opérationnelle pour entrée/sortie avec schéma configuré |

Les factures SAV, ventes de pièces et services de livraison utilisent la table réelle `invoices` et bénéficient donc du raccordement facture sans endpoint artificiel.

## Domaines volontairement non déclarés comme raccordés

- Transferts internes Treasury : détectés comme mouvements liés et exclus du collecteur générique afin de ne créer ni produit ni charge. Leur écriture symétrique entre deux comptes financiers exige un schéma dynamique source/destination supplémentaire.
- Valorisation des stocks : aucune méthode de valorisation fiable et validée n’est présente ; aucune charge ou valeur fictive n’est produite.
- Constatation détaillée des rémunérations brutes, cotisations et retenues : les règles sociales validées ne sont pas disponibles. Seul le décaissement effectif issu du workflow budgétaire est raccordé.
- Engagements, budgets, rallonges et réservations de liquidité : absence volontaire d’écriture de comptabilité générale.
- Annulation directe d’une facture : aucune suppression d’écriture ; la correction passe par les événements réels d’avoir/remboursement. Une règle réglementaire d’annulation distincte reste à valider.

## Schémas comptables

Un schéma définit le domaine, le type d’événement, le journal, l’agence optionnelle, la date d’effet et ses lignes. Chaque ligne précise :

- le sens Débit ou Crédit ;
- le composant Total, Montant hors taxe, Taxe ou Montant de l’événement ;
- un compte fixe ou la liaison du compte Treasury ;
- le libellé comptable.

Les schémas peuvent comporter deux lignes ou davantage. Une facture peut donc utiliser Client au débit, Produit et Taxe au crédit, sans compte ni taux codé en dur. Les conflits de résolution, comptes inactifs/non imputables, liaisons Treasury absentes, périodes clôturées et écritures déséquilibrées provoquent un état « À régulariser ».

## Tables et migration

Migration additive : `121_accounting_automation.sql`.

- `accounting_automation_control` : date de démarrage anti-rétroactivité et activation globale.
- `accounting_schemes` : règles datées, agence et version.
- `accounting_scheme_lines` : ventilation multi-lignes.
- `accounting_integration_events` : file durable, état, source, erreur et pièce.
- `accounting_integration_attempts` : historique des tentatives et reprises.

L’unicité de `source_key` existe dans la file et dans `accounting_entries`. Elle protège simultanément le collecteur, les appels concurrents, les reprises et le rejeu après succès.

## API

- `GET /api/accounting/integrations`
- `POST /api/accounting/integrations/discover`
- `POST /api/accounting/integrations/:id/retry`
- `GET /api/accounting/schemes`
- `POST /api/accounting/schemes`
- `PATCH /api/accounting/schemes/:id/status`

## Interfaces

Chemin : **Comptabilité & Trésorerie → Comptabilité** (`/treasury/accounting`).

- « Intégrations comptables » : recherche, filtre, agence, statut, tentatives, erreur, pièce liée et relance.
- « Schémas comptables » : consultation, création multi-lignes, journal, comptes, date d’effet, activation et désactivation.

Les statuts techniques ne sont jamais affichés directement : En attente, Traitement en cours, Comptabilisé, Échec, À régulariser et Ignoré selon la règle métier.

## Permissions

- `accounting.scheme.view`
- `accounting.scheme.manage`
- `accounting.integration.view`
- `accounting.integration.error.view`
- `accounting.integration.retry`
- `accounting.integration.export`

Elles sont ajoutées au catalogue dynamique. Le backend applique les scopes agence, concession et global aux événements ; l’interface masque les actions non autorisées.

## Erreurs, reprises et audit

Une erreur permanente de paramétrage devient « À régulariser ». Une erreur technique devient « Échec ». Chaque tentative conserve son numéro, son message, son acteur et la pièce éventuelle. La relance verrouille l’événement ; si une pièce existe déjà, elle est retrouvée par `source_key` et aucune seconde pièce n’est créée.

La confirmation métier n’est jamais annulée parce que la comptabilisation échoue : l’obligation durable reste visible dans la file. Une comptabilisation réussie écrit également un événement dans `audit_logs`.

## Tests et résultats MySQL

Base jetable finale : MySQL 8.4, `lca_lot4_final_20261112`.

- Migrations 001 à 121 sur base vierge : réussies.
- Présence vérifiée des migrations 119, 120 et 121.
- Quatre tables Lot 4 vérifiées.
- Build backend : réussi.
- Build frontend : réussi, 2 542 modules transformés.
- Tests unitaires Lot 4 : 4/4 réussis.
- Tests frontend Lot 4 : 2/2 réussis.
- Test MySQL réel de concurrence : réussi en environ 0,45 s pour la phase métier du test.
- Deux traitements simultanés du même événement : une seule écriture et un seul numéro définitif.
- Rejeu après succès : résultat existant retourné, sans doublon.

Les tests intermodules sont fondés sur les véritables tables et statuts présents. La recette automatisée couvre intégralement le processeur et son contrat MySQL ; elle ne simule pas de faux endpoints métier. Une recette bout en bout par chaque interface métier reste nécessaire avec des données fonctionnelles configurées.

## Performance

Les index couvrent la file `(status, next_attempt_at, id)`, le scope `(agency, date, status, id)`, la résolution des schémas et toutes les clés d’idempotence. Le lot de traitement est limité à vingt événements par passage, ce qui borne la transaction et la charge. Le test concurrent MySQL est inférieur à une seconde hors création des fixtures.

Aucune base de volumétrie représentative LCA n’a été fournie. Aucun p95 de production n’est donc inventé. Le dashboard conserve l’architecture parallèle du Lot 1 ; une mesure sur données de recette volumineuses reste requise.

## Réserves du Lot 3

- SYSCOHADA : aucune nomenclature détaillée réutilisable et autorisée n’a été trouvée dans le projet. Les comptes ne sont pas inventés ; les schémas attendent des subdivisions validées.
- Dépendances : Express 5.2.1 utilise `body-parser` 2.3.0 et `qs` 6.16.0 ; ExcelJS 4.4.0 utilise `uuid` 8.3.2. Les avis npm restent ouverts faute de version corrective compatible publiée dans les arbres utilisés. L’usage vulnérable de `uuid` avec tampon fourni n’est pas exercé par les exports. Aucune rétrogradation majeure d’ExcelJS ni mise à jour aveugle n’a été appliquée.
- Tests globaux : les suites ciblées et MySQL sont vertes. La suite HTTP globale reste à rejouer dans une CI autorisant l’écoute locale ; le bac à sable courant provoque `listen EPERM 0.0.0.0` dans Supertest.

## Procédure de recette

### Schémas comptables

- Permission : `accounting.scheme.manage`.
- Prérequis : comptes imputables validés, journal actif, exercice et période ouverts.
- Étapes : ouvrir Comptabilité → Schémas comptables, créer les lignes Débit/Crédit, sélectionner les composants et enregistrer.
- Attendu : schéma actif visible ; une ligne incomplète ou un compte invalide est refusé.

### Facture et encaissement

- Permissions métier habituelles et `accounting.integration.view` pour la supervision.
- Créer puis émettre une facture postérieure au démarrage de la migration 121.
- Attendu : événement « Facture client émise », puis pièce comptabilisée si un schéma couvre la date et l’agence.
- Enregistrer deux paiements partiels.
- Attendu : deux événements et deux pièces d’encaissement distinctes, jamais le solde restant.

### Erreur et reprise

- Permission : `accounting.integration.retry` ; `accounting.integration.error.view` pour voir le détail.
- Désactiver sur une base de recette un compte utilisé, puis produire un événement.
- Attendu : « À régulariser », erreur explicite, opération métier conservée.
- Corriger le schéma ou le compte et cliquer « Relancer ».
- Attendu : une seule pièce, même après plusieurs clics concurrents.

### Fournisseurs et décaissements

- Valider une facture fournisseur : une dette est comptabilisée selon le schéma, sans mouvement de trésorerie fictif.
- Effectuer un règlement via le décaissement budgétaire/Treasury réel : un événement de décaissement distinct apparaît.
- Créer seulement un budget ou une réservation : aucun événement comptable ne doit apparaître.

## Limites

Pas de grand livre réglementaire, balance générale, clôture avancée, intégration Sage, rapprochement intelligent ou OCR. Ces fonctions restent réservées aux Lots 5 et 6. Aucun commit, push ou déploiement n’a été effectué.
