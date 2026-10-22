# Rapport de préparation des comptes de recettes

## 1. Environnement

- Projet Docker local : `lca`.
- Base : `concession_erp`.
- Services `backend`, `frontend` et `mysql` : actifs et `healthy`.
- Migration courante : **101** (`101_provider_remuneration_finance.sql`).
- Agence utilisée : **Agence Brazzaville**, identifiant 1, code `LCA-BZV`.
- Production et VPS : non consultés.

## 2. Audit préalable

Les trois adresses demandées et les trois codes de rôle n'existaient pas. Aucun compte ni rôle homonyme n'a donc été réutilisé. Les rôles historiques `COMMERCIAL_MET01` et `MET01_QUOTE_VALIDATOR` ont uniquement servi de référence en lecture pour préserver le workflow éprouvé.

Le code et le référentiel MySQL confirment que :

- les permissions sont dynamiques et persistées dans `role_permissions` ;
- le stock véhicule ne supporte pas le scope OWN : `vehicles.view` doit être AGENCY ou supérieur ;
- la conversion d'un devis exige `quotations.convert` et `sales.create` ;
- l'émission officielle d'un devis exige `quotations.validate` et l'archivage documentaire ;
- le validateur doit être distinct du commercial ;
- la route graphique `/sales`, qui porte aussi les devis, exige `sales.view`.

## 3. Comptes créés

Les trois comptes ont été créés avec les fonctions officielles de l'ERP. Leurs secrets initiaux sont aléatoires, distincts du compte administrateur, conservés uniquement le temps des contrôles de connexion et absents de ce rapport et du dépôt.

| Identité | E-mail fictif | Rôle | Agence | Permissions | Scopes | Connexion |
|---|---|---|---|---:|---|---|
| Commercial LCA Recette | commercial.recette@lca.test | COMMERCIAL_RECETTE | Brazzaville | 29 | OWN, AGENCY | Réussie |
| Financier LCA Recette | financier.recette@lca.test | FINANCIER_RECETTE | Brazzaville | 17 | AGENCY | Réussie |
| Validateur Commercial LCA Recette | validateur.commercial@lca.test | VALIDATEUR_COMMERCIAL_RECETTE | Brazzaville | 6 | AGENCY | Réussie |

Les trois comptes sont actifs et leurs dates `last_login_at` ont été renseignées par les connexions réelles.

## 4. Rôle COMMERCIAL_RECETTE

### Permissions OWN

`crm.activity.create`, `crm.activity.view`, `crm.appointment.create`, `crm.offer.prepare`, `crm.pipeline.advance`, `crm.prospect.lose`, `crm.prospect.update`, `crm.prospect.view`, `crm.test_drive.create`, `customers.history.view`, `customers.update`, `customers.view`, `notifications.update`, `notifications.view`, `quotations.convert`, `quotations.create`, `quotations.update`, `quotations.view`, `sales.create`, `sales.update`, `sales.view`, `showroom.status.update`, `showroom.visitor.update`.

### Permissions AGENCY

`dashboard.view`, `crm.prospect.create`, `customers.create`, `reporting.view`, `showroom.view`, `vehicles.view`.

### Autorisé

CRM et portefeuille propre, clients autorisés, rendez-vous et essais CRM, consultation du stock et des prix de l'agence, devis, préparation/conversion des ventes dans son périmètre, notifications et reporting commercial d'agence.

### Interdit

`quotations.validate`, facturation, encaissements, trésorerie, RH, utilisateurs, paramètres, création/modification technique/archivage/transfert/statut/images des véhicules, remises dérogatoires et annulations arbitraires.

## 5. Rôle FINANCIER_RECETTE

Toutes les permissions sont limitées au scope AGENCY :

`dashboard.view`, `billing.view`, `billing.invoice.view`, `billing.invoice.create`, `billing.invoice.update`, `billing.invoice.issue`, `billing.payment.view`, `billing.payment.collect`, `customers.view`, `sales.view`, `treasury.view`, `treasury.coverage.view`, `ged.view`, `ged.upload`, `reporting.view`, `notifications.view`, `notifications.update`.

### Autorisé

Consultation des dossiers nécessaires, préparation et émission des factures, encaissements, suivi des paiements et soldes, consultation limitée de la trésorerie/couverture, justificatifs GED et reporting financier d'agence.

### Interdit

CRM, administration du stock, RH, utilisateurs, rôles, paramètres, remboursements, annulation de factures, mouvements manuels de trésorerie, virements, rapprochements, gestion des comptes de trésorerie et approbations indépendantes.

## 6. Rôle VALIDATEUR_COMMERCIAL_RECETTE

Toutes les permissions sont limitées au scope AGENCY :

`dashboard.view`, `quotations.view`, `quotations.validate`, `sales.view`, `notifications.view`, `notifications.update`.

`sales.view` est strictement nécessaire pour ouvrir l'écran `/sales` qui héberge la liste des devis. Le rôle ne possède ni `sales.create`, ni `sales.update`, ni `sales.confirm`, ni permission financière.

### Autorisé

Consultation des dossiers/devis de l'agence et émission officielle indépendante des devis.

### Interdit

Création ou modification des devis, création/modification/confirmation des ventes, CRM, stock, facturation, trésorerie, GED en écriture, RH, utilisateurs, rôles et paramètres.

## 7. Contrôles navigateur

### Commercial

- Connexion réelle : PASS.
- CRM, Clients, Stock, Ventes/Devis et Reporting : accessibles.
- Facturation, Trésorerie, RH, Utilisateurs et Paramètres : écran « Permission insuffisante ».
- Aucun menu financier, RH ou administratif sensible n'est exposé.

### Financier

- Connexion réelle : PASS.
- Facturation, Trésorerie, Clients, Ventes en lecture, GED et Reporting : accessibles.
- CRM, Stock, RH, Utilisateurs et Paramètres : refusés.

### Validateur

- Connexion réelle : PASS.
- Première vérification : `/sales` refusé malgré `quotations.view` et `quotations.validate`.
- Correction de configuration : ajout de `sales.view` en scope AGENCY uniquement.
- Nouvelle vérification : écran Ventes/Devis accessible.
- Facturation, Trésorerie, CRM, Stock, RH, Utilisateurs et Paramètres : refusés.

## 8. Contrôles RBAC et HTTP

Les routes graphiques refusées affichent « Permission insuffisante » et indiquent qu'aucun appel métier n'a été lancé. Les tests backend ciblés valident que les endpoints CRM, Clients, Ventes, Facturation, Véhicules et Utilisateurs appliquent les permissions dynamiques et produisent des refus 403 en l'absence de permission.

Limitation : le navigateur intégré bloque la navigation directe vers `/api/users`; une capture HTTP live multi-profils avec statut brut n'a donc pas été conservée. Les preuves combinent les connexions réelles, les gardes de route, les tests backend et les permissions persistées MySQL.

## 9. Vérification MySQL

- Trois utilisateurs créés, actifs, agence 1.
- Un seul rôle affecté à chaque compte.
- Aucun scope CONCESSION ou GLOBAL.
- Commercial : 29 permissions.
- Financier : 17 permissions.
- Validateur : 6 permissions.
- Aucun droit `users.*`, `roles.*`, `settings.*` ou `hr.*` sur ces rôles.
- Le Commercial n'a ni `quotations.validate` ni permission `billing.*`.
- Le Financier et le Validateur n'ont aucune permission de création/modification du stock.
- Le Validateur n'a aucune permission financière.

## 10. Vérification du stock et des opérations métier

- Véhicules `MET-STOCK-2026` : **20**.
- VIN distincts : **20**.
- Millésime 2025 : **20/20**.
- Statut `available` : **20/20**.
- Aucun véhicule recréé, modifié, réservé ou vendu.
- Compteurs inchangés pendant cette mission : ventes 5, factures 4, paiements 5.

## 11. Tests de non-régression

### Backend

- 7 fichiers ciblés PASS : Utilisateurs/RBAC, CRM, Clients, Ventes, Facturation, Véhicules, authentification renforcée.
- `quotations-dynamic-rbac.test.ts` : 7 cas PASS, 1 cas FAIL.
- Le FAIL est une assertion textuelle obsolète qui attend `Seul un devis brouillon peut être émis`, tandis que le code accepte désormais le workflow validé `brouillon ou en négociation`. Ce test n'a pas été modifié dans cette mission.

### Frontend

- 8 fichiers ciblés.
- **44 tests PASS, 0 FAIL**.
- Couverture : édition RBAC, CRM, Clients, Devis, Ventes, Facturation, Véhicules et 2FA.

### Dépôt

Aucun code applicatif n'a été modifié. Aucun commit, push, déploiement, changement de branche ou opération Git destructive n'a été effectué.

## 12. Anomalies et réserves

1. Le test backend Devis contient une assertion de message devenue obsolète par rapport au workflow fonctionnel actuel.
2. La preuve HTTP live brute multi-profils n'a pas pu être capturée dans le navigateur intégré ; les refus sont néanmoins couverts par les tests backend et les gardes réelles de l'interface.
3. Les mots de passe initiaux n'étant volontairement pas persistés, leur réutilisation future devra passer par la rotation officielle si la session éphémère n'est plus disponible.

## 13. Verdict

**VALIDÉ AVEC RÉSERVES**.

Les trois comptes sont opérationnels, les rôles respectent la séparation des responsabilités, aucun scope excessif n'a été attribué, les connexions réelles ont réussi et les restrictions principales sont confirmées. Les 20 véhicules demeurent disponibles et aucune opération commerciale ou financière nouvelle n'a été lancée. Les deux réserves techniques sont non bloquantes pour la préparation des comptes mais doivent rester visibles avant la campagne métier.
