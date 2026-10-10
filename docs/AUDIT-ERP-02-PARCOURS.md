# AUDIT-ERP-02 — Parcours fonctionnels

## 1. Prospect et persistance

Le frontend impose nom/prénom pour un particulier et téléphone ; le backend accepte nom ou société et téléphone **ou** e-mail. Cette divergence de contrat est probable pour les clients API et les reprises de données. Budget et véhicule recherché alimentent l'opportunité. La reprise est seulement une note libre. La création est transactionnelle lead + opportunité et commence à `new`.

L'état initial est constant (`INITIAL_LEAD_FORM`) et réinitialisé à la fermeture et après succès. Le défaut historique de budget conservé est classé **CONFORME**.

## 2. Pipeline

Étapes réelles : `new`, `contacted`, `qualified`, `appointment`, `test_drive`, `offer`, `negotiation`, `won`, `lost`.

- `new → contacted` : route dédiée et historique.
- `contacted → qualified` : contact, affectataire, projet et budget requis.
- `qualified → appointment` : rendez-vous futur et commercial affecté.
- `appointment → test_drive` : essai démarré avec véhicule disponible.
- `test_drive → offer` : retour d'essai puis création de devis.
- `offer → negotiation` : devis réel requis.
- `negotiation → won` : conversion en vente.
- `* → lost` : permission dédiée et motif obligatoire ; `won → lost` interdit.

La route générique ne définit cependant pas une matrice complète : une cible telle que `new` échappe aux gardes spécialisées. Le retour `won/lost → new` est donc accepté au niveau du code, avec incohérence d'intégrité possible.

## 3. Affectation

La liste des conseillers provient du serveur. L'affectation contrôle activité du compte, rôle actif, permission opérationnelle et scope. La réaffectation met à jour lead et opportunité, consigne une activité et notifie le destinataire. Les prospects hors périmètre sont masqués par un 404 après scope SQL.

## 4. Client 360° et synchronisation

Un client direct peut être créé sans opportunité ; cela est cohérent tant que le métier ne demande pas une opportunité artificielle. Lors d'un devis CRM, `ensureCustomer` :

1. réutilise le client déjà lié ;
2. cherche une identité non ambiguë par e-mail/téléphone dans l'agence ;
3. crée sinon le client ;
4. met à jour lead et opportunité dans la même transaction.

La fiche 360° expose conditionnellement opportunités, véhicules, ventes, devis, OR, factures, paiements et timeline. Elle ne fournit pas de sections dédiées rendez-vous/essais/documents ; ceux-ci apparaissent au mieux dans la timeline. Les contacts sont partie intégrante de la fiche.

## 5. Recherche, filtres et volumes

Client : code, prénom, nom, société, e-mail, téléphone ; CRM : prénom, nom, société, e-mail, téléphone, projet. La recherche CRM ne couvre pas l'identifiant. La sensibilité accents/casse dépend de la collation MySQL et n'a pas été démontrée en base jetable.

La liste CRM paginée calcule le total après filtres. La vue Kanban utilise en revanche `LIMIT 200` sans total global : les colonnes et budgets deviennent incomplets au-delà de 200 résultats. La liste Client est elle aussi limitée à 200 sans pagination exposée.

## 6. Rendez-vous, essais, activités

Le rendez-vous exige une date future et une affectation, crée une activité et une notification. Il n'existe pas de contrôle de collision de créneaux. L'essai filtre les véhicules disponibles et le retour est un verrou préalable au devis. Les activités sont limitées au prospect accessible. Leur auteur est enregistré dans `assigned_user_id`, ce qui rend la lecture historique ambiguë après réaffectation.

## 7. Frontend et UX

Les états chargement/vide/erreur et les restrictions d'actions sont présents. Le Kanban devient 1/2/4 colonnes selon la largeur, mais aucune recette réelle du bundle courant n'a été possible. Les cartes CRM (`CrmPage.tsx:230`) et des lignes Client/vente/OR (`CustomersListPage.tsx:163`, `CustomerDetailPage.tsx:261,295`) utilisent `onClick` sans sémantique clavier.

## 8. Tests ciblés

Backend : 12 fichiers exécutés, 11 fichiers réussis ; un fichier a 5/6 tests réussis et un échec d'infrastructure `EPERM` lors de l'ouverture Supertest (`TEST-DRIVE-08`).

Frontend : 20 fichiers exécutés, 18 réussis. `crm-negotiation-regression` : 4/5, une assertion textuelle obsolète. `crm-stabilization` : 5/7, deux assertions textuelles visant les anciens noms/appels remplacés par les filtres serveur et `useCrmTeamMembersQuery`. Aucun test n'a été corrigé.
