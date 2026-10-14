# Audit LCA — fiche employé et activité utilisateurs

Date de l'audit : 14 octobre 2026. Environnement inspecté : sources locales et base MySQL 8.4 `lca_recette`, sans écriture métier ni modification du journal.

## 1. Correction RH-01

### Cause exacte

La source de référence existait déjà : `users.avatar_path`. La jointure de détail RH retournait déjà `u.avatar_path`, Express exposait `/uploads/avatars`, Nginx relayait `/uploads/`, et la génération PDF chargeait déjà le fichier avec confinement dans le répertoire des avatars. Le défaut se trouvait exclusivement dans `EmployeeRecordModal` : le type frontend omettait `avatar_path` et le composant ne rendait aucune photo.

### Correction

- ajout de `avatar_path: string | null` au contrat `Employee` ;
- rendu de la photo via `assetUrl`, sans deuxième stockage RH ;
- avatar `UserRound` neutre en l'absence de compte, de photo, ou après une erreur de chargement ;
- remise à zéro de l'état d'erreur lorsque le chemin change ;
- invalidation des requêtes TanStack Query `['hr']` après ajout/suppression d'un avatar personnel ou administré.

La dissociation employé/utilisateur et la génération du PDF n'ont pas été modifiées.

### Vérifications RH-01 à RH-08

| Cas | Résultat | Preuve |
|---|---|---|
| RH-01 compte avec photo | Conforme au niveau code | jointure `users`, résolution `assetUrl`, rendu `<img>` |
| RH-02 compte sans photo | Conforme | fallback neutre |
| RH-03 sans compte | Conforme | `avatar_path` nul, fallback neutre |
| RH-04 modification photo | Conforme | nouveau fichier à nom unique et invalidation du cache RH |
| RH-05 actualisation | Conforme | détail RH recharge la valeur canonique |
| RH-06 impression | Non régressé | impression consomme le PDF backend existant |
| RH-07 PDF | Conforme au niveau code et test PDF existant | chargement confiné, fallback si fichier absent |
| RH-08 permissions/photo | Conforme à l'architecture actuelle | la fiche reste protégée par `hr.employees.view`; `/uploads` est public comme les avatars existants |

Le build frontend de production et le build TypeScript backend réussissent. Le test contractuel ajouté couvre la jointure, le rendu, le fallback, le proxy et l'invalidation. La recette navigateur du nouveau bundle n'a pas pu être menée : le backend Docker est en boucle de redémarrage sur la migration 080.

## 2. Architecture du module Activité

- stockage autoritatif unique : `audit_logs` ;
- écriture moderne : `writeAudit`, avec contexte agence/concession et suppression récursive des clés sensibles ; plusieurs anciens producteurs écrivent encore directement dans la table ;
- lecture : `GET /activity`, `GET /activity/filters`, PDF filtré et PDF individuel ;
- contrôle d'accès serveur : `activity.view`, scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL` ;
- pagination serveur : maximum 100 lignes, tri stable `created_at DESC, id DESC` ;
- frontend : filtres dans l'URL, TanStack Query, tableau, modal de détail et impression PDF authentifiée.

Il n'existe ni second journal ni chargement intégral pour la page écran.

## 3. Inventaire réel des événements

La base inspectée contient 392 événements, 57 triplets distincts module/type/action, sept auteurs ayant effectivement produit des événements, aucun auteur orphelin et aucun JSON invalide.

Familles observées :

- `billing` : facture créée/mise à jour/émise/annulée, paiement, avoir, remboursement ;
- `deliveries` : création, checklist, snapshot, document reçu, changement de statut, finalisation, autorisation financière ;
- `documents` : upload et prévisualisation ;
- `hr` : employé, liaison/dissociation, salaire, stock interne, budget, dépense ;
- `sales` : vente créée, changement de statut, annulation ;
- `service` : kilométrage et garantie constructeur ;
- `settings` : agence, concession, constructeur/garant ;
- `treasury` : compte, mapping et activation de flux ;
- `users` : utilisateur, rôle, statut et changement d'agence ;
- `vehicles` : mise à jour véhicule.

Les noms sont hétérogènes : événements qualifiés (`sale.created`) et verbes génériques (`created`, `updated`, `preview`, `upload`, `update`) coexistent. Une table de libellés doit donc être basée sur la paire `entity_type + action`, avec fallback lisible, et non uniquement sur `action`.

## 4. ACT-01 — erreur serveur

### Résultats établis

La requête globale exacte du code, exécutée en lecture seule sur MySQL, réussit. Les 392 lignes sont lisibles ; `old_values` et `new_values` sont des colonnes JSON valides ; il n'existe actuellement ni utilisateur supprimé référencé, ni action nulle. La requête filtrée et la requête globale partagent le même constructeur et la même transformation.

L'erreur serveur actuellement reproductible n'est pas une erreur de filtre : tous les backends Docker inspectés redémarrent, et les logs de `lca-recette-backend-1` montrent `MIGRATION_SCHEMA_DIVERGED: 080_document_mark_policies.sql étape 3` ainsi que des `ECONNREFUSED` MySQL. Le frontend ne peut donc pas obtenir `/api/activity`, quel que soit le filtre.

### Verdict sur le symptôme historique différentiel

La cause « tous les utilisateurs échoue, Super Administrateur réussit » n'est **pas reproductible ni attribuable avec certitude** dans l'état fourni. Les hypothèses JSON invalide, auteur supprimé, valeur NULL et erreur SQL ont été contrôlées et exclues sur la base actuelle. Aucun log d'une ancienne requête `/api/activity` en erreur n'est disponible. Il serait incorrect de présenter une supposition comme cause exacte ou de masquer le défaut par HTTP 200.

Après levée indépendante du blocage 080, la reproduction requise doit capturer, pour chaque combinaison, l'URL, le statut, le corps, le code MySQL et la stack : global, auteur super-admin, auteur standard, module, agence, dates, recherche et pages 1/2. Aucune correction ACT-01 ne doit être appliquée avant cette preuve.

## 5. Audit des filtres

Conformes au niveau code : valeurs vides omises, réinitialisation, pagination, bornes page/pageSize, validation stricte des identifiants et dates, recherche paramétrée, compteur issu du même prédicat que les lignes, tri déterministe.

Écarts :

1. aucun filtre concession n'existe dans l'API ni dans l'interface, malgré l'exigence fonctionnelle ;
2. aucun choix de tri : seul le tri chronologique descendant est disponible ;
3. la recherche déclenche une requête à chaque frappe, sans délai anti-rebond ;
4. 156 événements historiques n'ont ni `agency_id` ni `concession_id` : ils restent visibles en GLOBAL mais sont exclus des scopes AGENCY/CONCESSION, même si l'auteur est connu ;
5. le frontend montre le message technique fourni par l'API, sans état d'erreur contextualisé ni bouton de nouvelle tentative.

## 6. ACT-02 — présentation métier

Le défaut est confirmé. La modal affiche les snapshots JSON bruts et les clés techniques ; pour une création elle montre inutilement « Avant : null ». Les titres, ressources et modules restent codés (`sale.created`, `sale #5`, `sales`). Le PDF reprend également les codes techniques et ne contient pas de présentation métier des changements.

Correction recommandée : produire côté backend un modèle de présentation autorisé (`title`, `operationLabel`, `moduleLabel`, `sections`, `changes`) à partir d'un registre couvrant exclusivement les événements inventoriés. Pour une création, afficher les valeurs utiles ; pour une modification, comparer les clés présentes dans les snapshots ; pour une suppression, afficher seulement les données réellement conservées. Les identifiants peuvent rester comme référence secondaire. Un événement inconnu doit utiliser des libellés humanisés et une liste clé/valeur filtrée, jamais un dump JSON principal.

Les enrichissements client/véhicule/commercial doivent être faits côté backend, avec contrôle de permission et sans modifier le snapshot historique. Ils ne doivent jamais transformer l'écran en mécanisme N+1.

## 7. Audit RBAC

Le prédicat de scope est appliqué côté serveur aux listes, options, PDF filtré et PDF individuel. Modifier manuellement `userId` ou `agencyId` ne permet pas de sortir du périmètre, car ces filtres s'ajoutent au prédicat d'accès.

| Scope | Prédicat |
|---|---|
| OWN | `al.user_id = utilisateur connecté` |
| AGENCY | `al.agency_id = agence du jeton` |
| CONCESSION | `al.concession_id = concession de l'agence du jeton` |
| GLOBAL | tous les événements |

Écarts : le module n'offre pas de filtre concession ; les événements historiques sans contexte sont invisibles aux scopes territoriaux ; la permission unique `activity.view` donne accès aux snapshots financiers non classés sensibles. La gouvernance RBAC ne doit pas être changée, mais la projection des détails doit vérifier les permissions du domaine concerné.

## 8. PDF et impression

Points conformes : PDF généré côté serveur, authentifié, même prédicat RBAC, limite explicite de 1 000 événements, pagination A4 testée, identité commerciale et filtres imprimés.

Écarts : codes techniques non traduits, aucune synthèse avant/après métier, agence filtrée imprimée sous forme d'identifiant, agent du rapport obtenu depuis les lignes (nom absent si résultat vide), et PDF individuel soumis à la limite de présentation technique actuelle.

## 9. Performance

La page est paginée et ne présente pas de N+1. Les index disponibles couvrent date, utilisateur/date, agence/date, concession/date, module/date.

`EXPLAIN` de la requête globale sur 392 lignes choisit néanmoins un scan complet de `audit_logs`, une table temporaire et un filesort, notamment à cause des jointures inutilisées (`actor_concession`) et du plan global. C'est acceptable à ce volume, pas une preuve de tenue à grande échelle. La recherche avec quatre `LIKE '%...%'` et la catégorie calculée par expression régulière ne sont pas indexables. Le PDF charge jusqu'à 1 000 snapshots en mémoire.

Avant tout index ou migration, mesurer avec un jeu volumineux et `EXPLAIN ANALYZE`. Corrections de code à évaluer d'abord : retirer les jointures inutilisées, anti-rebond frontend, projection minimale pour le tableau, puis endpoint de détail autorisé séparé.

## 10. Intégrité et sécurité

- aucune ligne n'a été modifiée ou supprimée pendant l'audit ;
- aucun JSON invalide ; tailles maximales observées : 1 219 octets avant, 2 709 octets après ;
- huit groupes ont une signature identique à la seconde. Ce signal ne prouve pas une duplication : les événements de checklist peuvent être légitimement répétés. Il faut des identifiants d'opération/idempotence avant toute conclusion ;
- les clés ressemblant à mot de passe, token, secret, autorisation, cookie, credential ou hash sont retirées en écriture moderne et à la lecture ;
- certains producteurs historiques contournent `writeAudit`, mais la sanitation de lecture limite l'exposition par nom de clé ;
- `employee`, contrats, congés, primes et documents sont masqués côté backend ;
- anomalie haute : les entités salaire/rémunération, budget/dépense et trésorerie ne sont pas toutes classées sensibles et leurs snapshots peuvent être retournés à tout détenteur de `activity.view` ;
- anomalie moyenne : `ipAddress` est retournée par l'API bien qu'elle ne soit pas utilisée dans l'interface ;
- la clé étrangère auteur en `ON DELETE SET NULL` préserve l'événement mais ferait perdre l'identité affichable si un utilisateur était supprimé physiquement.

## 11. Priorités et recommandations

### P0 — avant nouvelle recette

1. Lever le blocage migration 080 dans sa mission dédiée, sans contourner le migrateur.
2. Rejouer ACT-01 avec corrélation requête/log et conserver l'erreur exacte.

### P1 — sécurité et usage métier

1. Construire côté backend la projection métier ACT-02 et l'utiliser aussi dans les PDF.
2. Étendre la politique de détail sensible aux domaines financiers/RH selon les permissions existantes.
3. Ne plus retourner l'adresse IP dans la liste ; réserver les données techniques à un endpoint explicitement autorisé si le besoin existe.
4. Ajouter le filtre concession sans modifier les scopes.

### P2 — robustesse et performance

1. Centraliser progressivement les nouveaux producteurs sur `writeAudit`, sans réécrire l'historique.
2. Ajouter l'anti-rebond de recherche et retirer les jointures inutiles après mesure.
3. Définir une politique de contexte pour les futurs événements afin d'éviter de nouveaux `agency_id/concession_id` nuls.
4. Ajouter des tests API réels par scope, paramètres forgés, événements orphelins et snapshots sensibles.

## 12. Tests et limites

Exécutés : build Vite production, build TypeScript backend, tests `activity-lot12a`, `final-corrections-lot1`, requêtes MySQL de lecture (structure, intégrité JSON, auteurs, inventaire, doublons, tailles), `EXPLAIN`, inspection des logs Docker, contrôle SHA-256 de l'archive.

Limites : aucune reconstruction ni modification Docker n'a été effectuée. La recette navigateur/API dynamique est bloquée par la migration 080. L'archive officielle est inchangée et son SHA-256 reste `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

Risques de régression principaux pour une future correction ACT-02 : fuite de données par enrichissement, divergence entre écran et PDF, libellé erroné d'un événement générique, requêtes N+1 et altération involontaire du journal. Ils imposent une projection backend testée, sans mutation des snapshots.
