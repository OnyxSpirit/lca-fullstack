# REC-03 — Recette fonctionnelle transversale dans le navigateur

Date : 20 octobre 2026  
Environnement : Docker local `lca`, `http://127.0.0.1`  
Verdict : **VALIDÉ AVEC RÉSERVES**

## 1. Résumé exécutif

La recette a réellement utilisé le navigateur intégré Codex. Vingt-et-une routes applicatives ont été ouvertes et contrôlées. Quarante-six scénarios navigateur ont été exécutés et validés. Aucun P0, aucun P1 bloquant, aucune page blanche, aucune erreur JavaScript et aucun HTTP 5xx n'ont été observés pendant la fenêtre REC-03.

Un prospect fictif `REC03 NAVIGATION` a été créé par le formulaire officiel pour vérifier validation, succès, actualisation, compteurs et persistance. Aucune écriture financière, aucun paiement, aucune suppression et aucune donnée historique REC-02 n'ont été modifiés.

La réserve concerne le rejeu navigateur multi-profils : les profils REC-02 existent et restent actifs, mais leurs secrets éphémères n'ont volontairement pas été conservés. Les contrôles visuels de plusieurs profils n'ont donc pas été refaits par connexion navigateur pendant REC-03. Les preuves HTTP/RBAC de REC-02 et les suites de tests restent vertes, mais elles ne sont pas présentées comme des interactions navigateur REC-03.

## 2. Environnement utilisé

- frontend `lca-frontend-1` : healthy, port hôte 80 ;
- backend `lca-backend-1` : healthy ;
- MySQL `lca-mysql-1` : healthy, MySQL 8.4 ;
- base : `concession_erp` ;
- dernière migration : `101_provider_remuneration_finance.sql` ;
- branche et modifications locales préexistantes préservées ;
- aucun VPS, domaine distant ou service de production utilisé.

## 3. Comptes et profils

La session navigateur utilisée pour l'inventaire transversal est une session Super Administrateur officiellement authentifiée. Elle n'a pas servi à simuler un profil métier.

Les lectures MySQL confirment quatorze comptes actifs, dont les profils fictifs : Demandeur, Approbateur, Prestataires, Finance, Trésorier, Agence, Concession, Global, SansDroit ainsi que les profils territoriaux REC-02.2. Aucun secret, cookie ou jeton n'a été extrait.

## 4. Inventaire et matrice de couverture

| Module | Route | État | Données/actions observées |
|---|---|---|---|
| Tableau de bord | `/dashboard` | PASS | KPI, graphiques, alertes, raccourcis |
| Portail | `/modules` | PASS | cartes et liens des modules disponibles |
| CRM | `/crm` | PASS | Kanban, liste, recherche, filtres, création |
| Clients | `/customers` | PASS | liste, pagination, recherche, création, vue 360 |
| Véhicules | `/vehicles` | PASS | grille, tableau, KPI, filtres, état vide, détail |
| Ventes | `/sales` | PASS | propositions, devis, actions principales |
| Showroom | `/showroom` | PASS | réception et suivi des visiteurs |
| Livraisons | `/deliveries` | PASS | liste et états de livraison |
| SAV | `/service` | PASS | ordres de réparation et actions visibles |
| Atelier | `/workshop` | PASS | planning, charge, ponts, productivité |
| Pièces | `/parts` | PASS | stock et commandes fournisseurs |
| Facturation | `/billing` | PASS | factures, encaissements et règlements |
| Trésorerie | `/treasury` | PASS | comptes, soldes, onglets et formulaires manuels |
| Reporting | `/reports` | PASS | indicateurs commerciaux, atelier et finance |
| GED | `/documents` | PASS | liste, filtres, pagination et actions documentaires |
| RH | `/hr` | PASS | synthèse, Personnel, Prestataires, budgets |
| Notifications | `/notifications` | PASS | liste et pagination |
| Activité | `/activity` | PASS | filtres, pagination, détail et impression |
| Utilisateurs/RBAC | `/users` | PASS | utilisateurs, rôles et matrice visibles |
| Paramètres | `/settings` | PASS | identité, agences et référentiels |
| Centre 2FA | `/security/2fa` | PASS | centre unifié et sections accessibles |

Les routes de détail `/vehicles/3`, `/vehicles/999999999` et une route applicative inexistante ont également été contrôlées.

## 5. Navigation

- menu latéral cohérent avec le portail des modules ;
- titres et fils d'Ariane cohérents ;
- liens principaux opérationnels ;
- chargements transitoires CRM, Livraisons, RH et Activité résolus normalement ;
- fiche véhicule existante ouverte depuis sa carte ;
- véhicule absent : message `Véhicule introuvable` et bouton `Retour au stock` ;
- route inconnue : page `ERREUR 404 — Écran introuvable` et retour au tableau de bord ;
- aucun lien cassé ou blocage de retour observé.

## 6. Formulaires

### CRM

- ouverture et fermeture : PASS ;
- soumission vide : messages français sur prénom, nom et téléphone/e-mail ;
- saisie valide : création de `REC03 NAVIGATION` ;
- succès : toast explicite ;
- compteur : passage immédiat de 7 à 8 prospects ;
- colonne Nouveau : passage immédiat de 0 à 1 ;
- persistance après rechargement : PASS ;
- valeur MySQL : lead ID 8, statut `new`, priorité `high`.

### Clients

- formulaire ouvert correctement ;
- soumission vide : nom et moyen de contact requis ;
- annulation : modale fermée sans création.

### Trésorerie

- formulaire `Nouvelle entrée manuelle` ouvert ;
- compte, montant, catégorie, date et métadonnées présentés ;
- annulation sans comptabilisation : PASS ;
- aucune écriture financière créée.

### Prestataires

- formulaire `Nouveau prestataire` ouvert depuis Personnel ;
- type, agence, identité, contact, nature de services et photo visibles ;
- fermeture sans création : PASS.

## 7. Listes, recherches et filtres

- CRM : compteurs cohérents avec les huit cartes et la pagination 1/1 ;
- Véhicules : recherche `Toyota` réduit réellement la liste à Toyota ;
- Véhicules : recherche absente affiche `0 véhicule trouvé` et un état vide explicite ;
- Véhicules : réinitialisation restaure les deux véhicules ;
- Trésorerie : quatre comptes, soldes visibles, pagination 1/1 ;
- GED : vingt documents, pagination 1/2, filtres catégorie/type/rattachement/statut/date ;
- Activité : recherche sans résultat affiche un état vide et pagination 1/1 ;
- RH Personnel : salariés et prestataires réunis, catégories et pagination visibles ;
- les totaux paginés ne sont pas confondus avec les lignes de la page.

## 8. Actions et cohérence UI/API/MySQL

- création CRM réalisée par l'UI, visible immédiatement puis après rechargement ;
- compteur Dashboard des prospects actifs passé de 3 à 4 après création ;
- MySQL confirme la même identité, le même statut et la même priorité ;
- les comptes Treasury affichent des soldes dérivés cohérents avec quatre comptes accessibles ;
- les données REC-02.4 GED et Prestataires restent visibles ;
- aucun historique REC-02 n'a disparu ;
- aucun paiement, clôture, suppression ou action irréversible exécuté.

## 9. RBAC visuel

La session Super Administrateur présente tous les modules et actions attendus. Les gardes de routes dynamiques ont été confirmées par le code courant et la non-régression complète. Les preuves REC-02 couvrent déjà OWN, AGENCY, CONCESSION, GLOBAL et SansDroit.

Réserve : aucune nouvelle connexion navigateur multi-profils n'a été réalisée pendant REC-03, car les secrets éphémères REC-02 n'étaient pas persistés et leur rotation aurait artificiellement modifié les comptes. Cette partie reste à rejouer si une preuve visuelle REC-03 propre à chaque rôle est exigée.

## 10. Responsive et UX

Dimensions réellement inspectées :

- bureau par défaut ;
- largeur réduite 768 × 900 ;
- mobile 390 × 844.

Résultats :

- menu latéral remplacé par `Ouvrir le menu` ;
- KPI Dashboard empilés et lisibles ;
- actions principales toujours accessibles ;
- cartes Treasury empilées sur mobile ;
- comptes et soldes lisibles ;
- onglets denses défilables horizontalement via le composant partagé `overflow-x-auto` ;
- aucune superposition, modale coupée ou action définitivement inaccessible observée.

## 11. Gestion des erreurs et journaux

- aucune erreur console JavaScript capturée ;
- aucun HTTP 5xx pendant la fenêtre REC-03 ;
- les HTTP 404 provoqués volontairement sont rendus proprement ;
- les 499 observés correspondent aux requêtes annulées par la navigation rapide automatisée ;
- les 401 de bootstrap précèdent la reprise de session et ne persistent pas ;
- deux anciens 502 Socket.IO datent de la reconstruction backend REC-02, avant REC-03, et ne se reproduisent pas pendant cette campagne ;
- aucun détail interne sensible exposé dans l'interface.

## 12. Anomalies et corrections

Aucune anomalie P0, P1 ou P2 reproductible n'a été identifiée. Aucun fichier applicatif n'a donc été modifié et aucun test correctif n'a été ajouté.

Observation `REC03-OBS-01` : la preuve RBAC navigateur multi-profils reste partielle. Il s'agit d'une limite de couverture et non d'un défaut applicatif démontré.

## 13. Captures

Deux captures réelles ont été affichées pendant la campagne : Dashboard mobile 390 × 844 et Trésorerie aux largeurs 768 puis 390. L'outil navigateur a fourni les images en mémoire mais pas un chemin d'export durable ; aucune capture fictive n'a été créée dans le dépôt.

## 14. Non-régression

- frontend : **959 PASS, 0 FAIL, 0 SKIP**, 109 237,866 ms ;
- backend : **1 925 PASS, 0 FAIL, 91 SKIP**, 2 016 tests, 177 647,981 ms ;
- lint frontend : PASS ;
- build frontend : PASS, 2 516 modules ;
- lint backend : PASS ;
- build backend : PASS ;
- `git diff --check` : exécuté à la clôture.

Les nombres sont identiques à REC-02. Aucun test n'a été supprimé, masqué ou ajouté pendant REC-03.

## 15. Résultats chiffrés

- pages/routes examinées : **21 principales + 3 contrôles de détail/erreur** ;
- scénarios navigateur exécutés : **46** ;
- scénarios navigateur validés : **46** ;
- scénarios navigateur échoués : **0** ;
- contrôles multi-profils navigateur non rejoués : **4 familles** ;
- anomalies P0/P1/P2 ouvertes : **0**.

## 16. Risques résiduels et verdict

Les parcours transversaux critiques de navigation, affichage, formulaires représentatifs, listes, filtres, persistance, détails, erreurs et responsive sont opérationnels. La non-régression est intégralement verte et aucun défaut bloquant n'est ouvert.

Le verdict est **VALIDÉ AVEC RÉSERVES**, uniquement en raison de la couverture navigateur multi-profils non rejouée et de l'absence d'export durable des captures. Cette réserve n'annule pas les preuves techniques et RBAC de REC-02.

Aucun commit, push, déploiement, accès VPS, migration, suppression de volume, réinitialisation MySQL ou changement de branche n'a été effectué. MET-01 n'a pas été démarré.
