# ERP LCA — Audit complet du centre de notifications

**Date de l'audit :** 11 novembre 2026  
**Nature :** audit statique, technique et fonctionnel, non destructif  
**Périmètre observé :** arbre de travail courant du dépôt `lca-fullstack`  
**Légende :** **[Vérifié]** constat directement établi dans le code, le schéma ou les tests ; **[À confirmer]** comportement nécessitant une recette dynamique ou l'observation de données réelles.

> Aucune donnée MySQL n'a été interrogée ou modifiée, aucun test mutable n'a été exécuté et aucun fichier applicatif n'a été modifié. Le dépôt contenait déjà des changements non validés, notamment dans `backend-node/src/modules/notifications/notification.service.ts`, avant l'audit. Le présent rapport décrit donc l'implémentation de l'arbre de travail courant et non nécessairement celle d'un commit publié.

## 1. Synthèse exécutive

Le module est techniquement plus solide que son apparence actuelle : les notifications sont persistantes, paginées, filtrables côté serveur, protégées par quatre permissions distinctes, isolées par utilisateur et agence active, historisées avec auteur/agence figés, dédupliquées par clé métier lorsque le producteur en fournit une, puis signalées en temps réel via Socket.IO. **[Vérifié]**

L'interface reste toutefois incomplète et expose directement `eventType` dans un badge (`workshop.status_changed`, `delivery.status_changed`, `crm.lead_assigned`). Il n'existe aucune couche centrale de présentation/traduction des événements. Les titres et descriptions sont produits par le backend puis enregistrés comme texte définitif ; des valeurs métier anglaises interpolées (`appointment`, `test_drive`, `ready_for_delivery`, statuts Atelier, etc.) restent donc visibles dans les historiques concernés. **[Vérifié]**

Les écarts les plus importants sont :

- le frontend propose potentiellement les portées `Concession` et `Global`, mais l'API les refuse systématiquement ;
- la page ne possède pas d'état de chargement propre, pas de filtre « lues », pas d'archives, pas de restauration, pas de marquage « non lu », pas de suppression, pas de recherche et pas de détail ;
- le backend possède une suppression logique et un endpoint de compteur qui ne sont pas utilisés par le frontend ;
- l'archivage est strictement personnel, y compris depuis la vue Agence ;
- la navigation est partielle : certaines références ouvrent une liste plutôt qu'un objet, d'autres retombent sur Notifications, et l'existence/accessibilité de l'objet n'est vérifiée qu'après navigation ;
- les notifications collectives sont matérialisées par une ligne par destinataire ; la vue Agence regroupe les copies au moyen du préfixe de `event_key`, mais les producteurs dépourvus de clé ne sont pas regroupés ;
- `notifyPermissions` crée les notifications séquentiellement et hors de la transaction métier ; les erreurs sont journalisées puis absorbées, donc l'opération métier peut réussir sans notification.

La première passe recommandée est majoritairement frontend : dictionnaire central de présentation, suppression des codes techniques visibles, traduction des valeurs interpolées connues, harmonisation page/navbar, états de chargement/erreur/vides et retrait des portées non supportées. Elle ne nécessite ni migration ni changement de contrat API.

## 2. Cartographie frontend

| Fichier | Responsabilité | Données consommées | Interactions et dépendances |
|---|---|---|---|
| `frontend/src/modules/notifications/NotificationsPage.tsx` | Page principale, filtres, liste, pagination, actions | `NotificationListResponse`, permissions et scope effectif | portée, non-lues, catégorie, pagination, lecture au clic, archivage, tout lire ; dépend des hooks, stores, routes, composants UI |
| `frontend/src/modules/notifications/notificationFilters.ts` | Catégories, libellés de portée, calcul des portées visibles, clé de cache | scope `notifications.view`, filtres | expose à tort `concession/global` alors que l'API les refuse |
| `frontend/src/api/notificationHooks.ts` | Contrat HTTP, mutations, mapping navigation, formatage des dates | API `/notifications` | liste, lecture, archivage, tout lire ; invalide le cache global Notifications |
| `frontend/src/types/notifications.ts` | Types d'affichage et filtres | réponse API | inclut priorités, scopes, contexte historique ; pas d'archive dans le contrat de liste |
| `frontend/src/components/layout/Header.tsx` | Cloche, compteur, aperçu des cinq dernières notifications | même requête, page 1/taille 5 | clic : marque lue puis navigue ; lien vers le centre ; pas de filtre `unreadOnly` |
| `frontend/src/components/AppBootstrap.tsx` | Connexion temps réel, invalidation des caches, son | événement minimal `{id}` | `notifications:created` invalide Notifications + dashboard ; reconnexion invalide Notifications |
| `frontend/src/services/realtime.ts` | Cycle de connexion Socket.IO `/realtime` | JWT, contexte agence | reconnexion, remplacement de socket, `agency:refresh` avec timeout 5 s |
| `frontend/src/services/notificationSound.ts` | Signal sonore dédupliqué en mémoire | identifiant reçu | son après geste utilisateur ; conserve 500 identifiants |
| `frontend/src/navigation/routes.ts` | Mapping `referenceType` → route | type + identifiant métier | routes détaillées pour vente, livraison, OR, facture, pièce, véhicule, client ; listes pour d'autres |
| `frontend/src/stores/authStore.ts` | Agence active, permissions dynamiques | `/rbac/agency-context` | vide l'état client puis resynchronise Socket.IO au changement d'agence |
| `frontend/src/App.tsx` | Route `/notifications` et garde de module | `notifications.view` | lazy loading global du module |
| `frontend/src/components/layout/AppLayout.tsx` | Montage du bootstrap, header et contenu | session courante | garantit que temps réel et cloche existent dans toute l'application authentifiée |

### 2.1 Présentation actuelle

**[Vérifié]** La page affiche : en-tête « Notifications », sous-titre technique « Alertes métier internes et persistantes », fil d'Ariane, bouton « Tout marquer comme lu », trois lignes de filtres, carte divisée en lignes, pagination précédente/suivante.

- Taille fixe : 5 éléments par page.
- Portées : Mes notifications, Agence, et potentiellement Concession/Global.
- Statut : Toutes ou Non lues ; aucun filtre explicite Lues.
- Catégories : huit `referenceType` seulement (CRM, Ventes, Showroom, Véhicules, Atelier, Livraisons, Facturation, Paiements).
- Ligne : icône Bell identique, titre, badge technique, message, auteur, agence, date, bouton Archiver.
- Non-lue : fond rouge très léger ; lue : blanc.
- Priorité : seule la couleur du badge change, mais son texte reste le code d'événement.
- Responsive : filtres flex-wrap et contenu principal responsive ; une ligne garde néanmoins une structure horizontale `flex` sans adaptation dédiée, propice à la compression du texte/bouton sur petit écran.
- Chargement : aucun squelette ni libellé local ; pendant le chargement, la carte et la pagination peuvent apparaître à zéro. Le fallback Suspense ne couvre que le chargement du bundle.
- Erreur : bloc rouge avec `query.error.message` brut.
- Vide : « Aucune notification. », sans distinction filtre/archives/agence.

Les éléments donnant une impression technique/inachevée sont le badge brut, le vocabulaire « persistantes », la répétition auteur/agence sur chaque ligne, l'icône unique, le très petit corps de métadonnées (10 px), les contrôles de pagination rudimentaires et l'absence de feedback de chargement.

### 2.2 Origine des identifiants et textes techniques

`eventType` est créé par chaque producteur backend, persisté dans `notifications.event_type`, renvoyé sans transformation par l'API, puis affiché directement dans le `Badge` de `NotificationsPage.tsx`. Il sert aussi de filtre API optionnel, d'index SQL et de clé sémantique technique. Le frontend ne l'utilise actuellement ni pour une action ni pour la navigation. Son remplacement **visuel** est donc compatible avec le contrat existant et avec l'historique. **[Vérifié]**

Il n'existe pas de dictionnaire de traduction des événements. `notificationCategories` traduit seulement huit `referenceType` pour les filtres. **[Vérifié]**

`subject` et `message` sont construits dans les modules backend, validés, puis persistés tels quels. Le frontend les restitue sans composition ni traduction. Ainsi, dans `crm.routes.ts`, l'étape est interpolée directement dans « est maintenant à l'étape `${stage}` » ; dans Ventes et Atelier, les statuts techniques sont également interpolés. `appointment` et `test_drive` sont des codes CRM/activité réels ; s'ils figurent dans une description historique, la couche actuelle ne peut pas les traduire sans présentation centralisée ou réécriture des données, cette dernière étant déconseillée. **[Vérifié]**

## 3. Cartographie backend et cycle de vie

| Fichier | Rôle |
|---|---|
| `backend-node/src/modules/notifications/notification.routes.ts` | Liste, comptage, lecture, archivage, suppression logique, visibilité RBAC |
| `backend-node/src/modules/notifications/notification.service.ts` | Validation, sélection des destinataires, snapshots, persistance, déduplication, émission temps réel |
| `backend-node/src/realtime/socket.ts` | Authentification du namespace, rooms utilisateur/session/agence, resynchronisation |
| `backend-node/src/app.ts` | Montage du routeur sous `/api` |
| `backend-node/database/baseline/001_initial_schema.sql` | Schéma consolidé des tables et index |
| `backend-node/database/legacy-migrations/015_notifications_reliability.sql` | livraison, événement, priorité, clé idempotente |
| `backend-node/database/migrations/041_notifications_traceability_rbac.sql` | archive/suppression et permissions séparées |
| `backend-node/database/migrations/094_notification_historical_context.sql` | auteur/agence historiques immuables |
| `backend-node/database/seeds/001_system_seed.sql` | quatre permissions Notifications |

Il n'existe ni contrôleur ni repository séparé : le routeur contient les requêtes de consultation/mutation et le service contient la création. `notification_templates` existe dans le schéma mais n'est pas utilisé par le service inspecté. **[Vérifié]**

### 3.1 Cycle complet

1. Un module métier termine généralement sa transaction, émet son événement métier de rafraîchissement, puis appelle `createUserNotification` ou `notifyPermissions`.
2. Le service vérifie le contenu, la priorité, l'auteur, l'agence et l'éligibilité du destinataire actif possédant `notifications.view` dans l'agence.
3. `INSERT IGNORE` persiste une ligne par utilisateur. `event_key`, lorsqu'elle existe, assure l'idempotence par index unique ; pour un envoi collectif elle est suffixée `:user:<id>`.
4. Après insertion réussie, `notifications:created` avec `{id}` est émis uniquement aux sockets du destinataire dont l'agence active correspond, ou à toutes ses sockets si la notification n'a pas d'agence.
5. TanStack Query invalide la liste et le dashboard ; la page/navbar relisent l'API.
6. La consultation filtre toujours les archives et suppressions. La portée personnelle impose utilisateur + agence active (ou notification sans agence). La portée agence impose l'agence active.
7. Lecture : `read_at=COALESCE(read_at,NOW())`. Archivage/suppression : dates + auteur et trace d'audit.

### 3.2 Transactions, asynchronisme et doublons

- La persistance d'une notification n'est pas dans la transaction métier d'origine. Une panne après commit métier produit une opération sans notification ; l'inverse est limité car les appels sont post-transaction. **[Vérifié]**
- `notifyPermissions` insère séquentiellement, capture les erreurs par destinataire et continue. Le nombre créé n'est généralement pas exploité par l'appelant. **[Vérifié]**
- `event_key` protège les producteurs qui le fournissent. Plusieurs producteurs n'en fournissent pas (par exemple états Atelier/Livraison et certaines notifications Showroom), donc une répétition applicative peut produire des doublons. **[Vérifié]**
- La vue Agence groupe les copies collectives sur le préfixe précédant `:user:`. Sans `event_key`, chaque ligne reste distincte. **[Vérifié]**
- L'API calcule le groupe avec `SUBSTRING_INDEX`, puis `COUNT(DISTINCT ...)` et une fenêtre `ROW_NUMBER`; c'est cohérent mais coûteux à grand volume et sans index fonctionnel dédié. **[Vérifié]**

## 4. Schéma réel des données

| Information | Source réelle | Statut |
|---|---|---|
| Identifiant | `notifications.id` | Persisté |
| Type d'événement | `event_type` | Persisté |
| Catégorie | aucune colonne ; déduite de `reference_type` au frontend | Construite |
| Titre / description | `subject`, `message` | Persistés comme texte définitif |
| Priorité | enum `low/normal/high/urgent` | Persistée |
| Auteur | `actor_type`, `actor_user_id`, `actor_display_name_snapshot` | Persisté/snapshot |
| Destinataire | `user_id`, plus `recipient` pour canaux externes | Persisté |
| Agence | `operation_agency_id`, `operation_agency_name_snapshot` | Persisté/snapshot |
| Création | `created_at` | Persistée |
| Lecture | `read_at`; `isRead` calculé | Persisté + calculé API |
| Archivage | `archived_at`, `archived_by` | Persisté, non retourné dans la liste active |
| Suppression | `deleted_at`, `deleted_by` | Persisté, suppression logique |
| Objet métier | `reference_type`, `reference_id` | Persisté, nullable |
| URL | aucune | Absente ; `linkRoute` construit au frontend |
| Métadonnées libres | aucune colonne JSON | Absentes |
| Livraison | `channel`, `status`, `delivery_status`, planification/envoi/erreur | Persisté |
| Déduplication | `event_key` unique nullable | Persisté |
| Modèle | `template_id`; table `notification_templates` | Persisté mais non utilisé par le flux inspecté |
| Client | `customer_id` | Persisté mais non alimenté/retourné par le service inspecté |

Exemple représentatif anonymisé de `GET /api/notifications` :

```json
{
  "scope": "mine",
  "items": [{
    "id": "812",
    "subject": "Statut atelier mis à jour",
    "message": "OR-2026-0042: ready",
    "deliveryStatus": "sent",
    "eventType": "workshop.status_changed",
    "priority": "normal",
    "readAt": null,
    "referenceType": "repair_order",
    "referenceId": "42",
    "createdAt": "2026-11-11T09:30:00.000Z",
    "isRead": false,
    "isOwn": true,
    "actorType": "human",
    "actorUserId": "17",
    "actorDisplayNameSnapshot": "Utilisateur anonymisé",
    "operationAgencyId": "3",
    "operationAgencyNameSnapshot": "Agence anonymisée"
  }],
  "page": 1,
  "pageSize": 5,
  "total": 1,
  "unreadCount": 1
}
```

Cet exemple est reconstruit à partir du contrat et non extrait de la base. **[Vérifié quant au contrat ; données fictives]**

## 5. Inventaire des API

| Méthode et route | Permission | Fonctionnement / limite |
|---|---|---|
| `GET /api/notifications` | `notifications.view` | page 1+, taille 1–100 ; scope mine/agency ; filtres événement, référence, priorité, dates, non-lues ; exclut archives/suppressions |
| `GET /api/notifications/unread-count` | `notifications.view` | compteur personnel de l'agence active ; non utilisé par le frontend |
| `PATCH /api/notifications/read-all` | `notifications.update` | lit toutes les notifications personnelles visibles de l'agence active |
| `PATCH /api/notifications/:id/read` | `notifications.update` | propriétaire uniquement ; idempotent |
| `PATCH /api/notifications/:id/archive` | `notifications.archive` | propriétaire uniquement ; auditée |
| `DELETE /api/notifications/:id` | `notifications.delete` | suppression logique propriétaire ; auditée ; non exposée au frontend |

Aucune route pour non-lire, lister les archives, restaurer, rechercher ou exécuter une action métier. **[Vérifié]**

## 6. Inventaire des événements persistants réellement émis

Le « temps réel » de cette table signifie émission de `notifications:created` après persistance ; tous les flux ci-dessous l'utilisent. Les événements Socket.IO métier parallèles ne sont pas eux-mêmes des notifications persistantes.

| Module | Code événement | Titre/message représentatif | Destinataires / portée | Objet |
|---|---|---|---|---|
| CRM | `crm.lead_assigned` | Nouveau prospect, réattribution, étape, rendez-vous, activité ; le même code couvre toutes ces opérations | affecté + détenteurs de `crm.prospect.assign` dans l'agence, hors acteur/affecté | `lead` |
| Showroom | `showroom.visitor_assigned` | Visiteur affecté | utilisateur affecté | `showroom` |
| Showroom | `showroom.test-drive-planned`, `.started` | Essai planifié/démarré | conseiller explicitement ciblé dans certains flux CRM | `showroom` |
| Véhicules | `vehicles.created`, `.status-changed`, `.transferred` | sujet/message fournis par la route | `vehicles.view`, hors acteur | `vehicle` |
| Ventes | `sale.created` | Nouvelle vente | `sales.view`, hors acteur | `sale` |
| Ventes | `sale.cancelled`, `sale.ready_for_delivery` | « au statut cancelled/ready_for_delivery » | `sales.view` ou `delivery.view` | `sale` |
| Devis | `quotation.created` | Nouveau devis commercial | `quotations.view`, hors acteur | `lead` (pas le devis) |
| Livraisons | `delivery.status_changed` | Livraison à préparer, reportée, véhicule livré | permissions variables selon l'étape | `delivery` |
| Atelier | `workshop.status_changed` | nouvel OR, changement de statut, abandon, restitution | `service.order.view` | `repair_order` |
| Atelier/Pièces | `parts.internal_request.created` | demande interne après devis/complément accepté | vue/préparation demande pièces | `repair_order` |
| Pièces | `parts.internal_delivery.dispatched` | pièces remises au SAV | `service.parts.receive` | `repair_order` |
| Pièces | `parts.internal_delivery.received` | réception SAV confirmée | `parts.internal_request.view` | `repair_order` |
| Pièces | `parts.return.declared` | retour SAV à réceptionner | `parts.return.receive` | `repair_order` |
| Facturation | `payment.received` | paiement reçu | `billing.payment.view` | `payment` |
| Facturation | `invoice.paid` | facture soldée | `billing.payment.view` | `invoice` |
| RH | `employee_bonus.<statut>` | prime + statut en minuscules | utilisateur lié à l'employé | `employee_bonus` |
| RH | `hr.expense.cancelled` | dépense annulée | `hr.expense.view`, par agence concernée, hors acteur | `budget_expense` |
| Sécurité | `auth.2fa.enabled`, `.disabled`, `.recovery_used`, `.requirement_changed`, `.admin_reset`, `.role_policy_changed`, `.trusted_device_revoked` | messages de sécurité en français | utilisateur concerné | `user` |

### Événements déclarés/non persistants et domaines absents

- `AppBootstrap.tsx` écoute de nombreux événements métier (documents, utilisateurs, paramètres, trésorerie, planning, RH, facturation, etc.) qui invalident des vues mais ne créent pas automatiquement une notification persistante. **[Vérifié]**
- Aucun producteur persistant n'a été trouvé pour la comptabilité/trésorerie générale, les documents GED, les fournisseurs ou l'administration hors sécurité 2FA. **[Vérifié]**
- `notification_templates` constitue une capacité prévue mais non raccordée au flux de création observé. **[Vérifié]**
- Les codes dynamiques (`employee_bonus.<statut>`, statuts Ventes) ne forment pas une liste fermée centralisée. **[Vérifié]**

Une même opération peut créer plusieurs lignes : une par destinataire ; CRM peut créer une notification nominative et un lot agence, mais exclut l'affecté du lot. Un paiement soldant une facture crée deux événements distincts (`payment.received` et `invoice.paid`) pour les mêmes utilisateurs. **[Vérifié]**

## 7. Notifications personnelles et d'agence

### Mes notifications

Filtre SQL : `n.user_id = utilisateur` ET (`operation_agency_id IS NULL` OU agence active), canal notification, non archivée, non supprimée. Les notifications d'une autre agence restent invisibles jusqu'au changement de contexte. **[Vérifié]**

### Agence

Filtre SQL : `operation_agency_id = agence active`. Il affiche donc les copies destinées à tous les utilisateurs de cette agence, groupées si leur `event_key` collectif partage un préfixe. La ligne représentative peut appartenir à un autre utilisateur (`isOwn=false`). Lecture et archivage ne sont volontairement proposés que dans la portée personnelle. **[Vérifié]**

### Multi-agences et Super Administrateur

- Les destinataires sont déterminés via `user_agencies` actif + rôles d'agence + permission demandée ; aucun nom de rôle ni bypass Super Admin n'est codé dans le service.
- Un utilisateur multi-agences reçoit/voit la notification dans le contexte de son agence d'opération ; le changement d'agence vide l'état client, actualise permissions et rooms, puis relit les données.
- Les filtres de sécurité sont backend. Le test MySQL dédié vérifie refus inter-agences, changement de contexte et absence d'événement socket hors agence active.
- Un scope `GLOBAL` peut demander la vue `agency`, que le backend rabat strictement sur l'agence active. Il ne peut pas demander `global`.

**Incohérence vérifiée :** `notificationScopesFor` affiche `concession/global` aux scopes élevés alors que `notificationVisibility` renvoie 403 pour ces valeurs.

## 8. Audit RBAC

Les permissions sont séparées : `notifications.view`, `.update`, `.archive`, `.delete`. La route de page exige `view`; chaque action backend exige sa permission. Les mutations chargent obligatoirement `id + user_id`, autorisent la ressource dans le contexte d'agence et verrouillent la ligne. Une notification d'un tiers visible en vue Agence ne peut donc pas être modifiée. **[Vérifié]**

Point d'attention : l'éligibilité collective vérifie l'existence de la permission demandée, mais ne filtre pas le scope de cette permission. C'est cohérent avec les tests actuels et signifie qu'un détenteur `OWN` peut recevoir un signal collectif si le producteur vise son permission code. La notification ne confère aucun accès métier supplémentaire ; la garde de destination reste distincte. **[Vérifié]**

## 9. Audit Socket.IO

- Namespace `/realtime`, transport frontend WebSocket uniquement, path `/socket.io`.
- JWT vérifié, session persistée courante exigée, contexte RBAC relu en base.
- Rooms privées `user:<id>`, `session:<id>`, `agency:<activeAgency>` ; rooms domaine agence pour trésorerie/RH si permission.
- Aucun socket ne rejoint `global` dans `agencyRealtimeRooms`, ce qui réduit le risque de fuite des anciens émetteurs « AndGlobals ».
- `notifications:created` est émis socket par socket après comparaison de l'agence active ; payload minimal `{id}`.
- Changement d'agence : API RBAC puis `agency:refresh`, resynchronisation des rooms.
- Reconnexion : Socket.IO reconnecte ; le handler `connect` invalide Notifications, trésorerie et RH.
- Compteurs : pas de push de valeur ; invalidation puis recalcul HTTP.
- Déduplication sonore : identifiant en mémoire, 500 entrées ; TanStack Query absorbe les invalidations répétées.

Risques : absence de stratégie frontend explicite sur `connect_error`, timeout de changement d'agence pouvant laisser l'API déjà changée mais l'UI en erreur, et aucune garantie de livraison du signal socket (compensée par la relance HTTP à la reconnexion). **[Vérifié pour le code ; impact à recetter]**

## 10. Audit des actions utilisateur

| Action | État réel | Route / permission | Limites |
|---|---|---|---|
| Marquer lue | Oui | PATCH `/:id/read`, `.update` | personnel, agence active |
| Marquer non lue | Non | aucune | nécessite backend |
| Tout marquer lu | Oui | PATCH `/read-all`, `.update` | personnel visible seulement |
| Archiver | Oui | PATCH `/:id/archive`, `.archive` | personnel ; disparition immédiate de la liste |
| Consulter archives | Non | aucune | archives exclues en dur |
| Restaurer | Non | aucune | nécessite backend |
| Supprimer | Backend seulement | DELETE `/:id`, `.delete` | non exposé UI ; suppression logique |
| Ouvrir objet | Partiel | navigation frontend | pas de prévalidation, plusieurs routes génériques |
| Action métier directe | Non | aucune | — |
| Détails | Non | aucune vue dédiée | métadonnées affichées en ligne seulement |

## 11. Audit de la navigation contextuelle

| Référence | Route frontend | Qualité / permission attendue |
|---|---|---|
| `sale` | `/sales/:id` | détail, `sales.view` |
| `delivery` | `/deliveries/:id` | détail, `delivery.view` |
| `repair_order` | `/service/repair-orders/:id` | détail, `service.order.view` |
| `invoice` | `/billing/:id` | détail facture, permission de module Billing |
| `part` | `/parts/:id` | détail, `parts.view` |
| `vehicle` | `/vehicles/:id` | détail, `vehicles.view` |
| `customer` | `/customers/:id` | détail, `customers.view` |
| `lead`, `showroom`, `payment`, `credit_note`, `document`, `purchase_order`, `reservation` | page liste/module | pas de focus garanti sur l'objet |
| `user`, `employee_bonus`, `budget_expense` et inconnu | `/notifications` | aucune navigation métier |

`canNavigateWithPermissions` empêche certaines navigations selon la permission de route, mais une route non mappée retombe sur Notifications et paraît techniquement « navigable ». Si l'objet a été supprimé, déplacé d'agence ou rendu inaccessible, le module cible gère son propre 403/404 ; la notification ne fournit aucun état de péremption. **[Vérifié]**

## 12. Priorités, statuts et catégories

- Priorité réelle : quatre niveaux persistés. Les règles ne sont pas centralisées : sécurité utilise high/urgent, transferts/flux pièces high, la majorité normal. `low` n'a pas été observé chez les producteurs inspectés.
- Lecture et archivage : états persistés.
- « Nécessite une action » : aucune propriété fiable. Certains titres/messages l'impliquent, mais aucune règle centrale ne permet un compteur robuste.
- Catégorie : déduite de `reference_type`, incomplète. Les types Auth/RH/Pièces avancés ne figurent pas dans les filtres.
- Information/Important/Critique : la priorité peut fournir une première hiérarchie, mais il faut documenter la convention métier avant de renommer `high/urgent` de façon normative.

## 13. Audit de la francisation

Surfaces techniques/anglaises vérifiées :

- tous les `eventType` dans le badge ;
- statuts interpolés Ventes (`cancelled`, `ready_for_delivery`) et Atelier (`ready`, etc.) ;
- étapes CRM interpolées (`appointment`, `test_drive`, `offer`, etc.) ;
- statuts de prime produits par `status.toLowerCase()` ;
- référence brute `#id` dans plusieurs messages ;
- erreurs API brutes affichées dans la page ;
- fallback `referenceType` ou « Système » dans le badge ;
- `actorType=unknown` traduit, mais le contexte historique reste formulé de manière technique.

Stratégie recommandée : un module frontend central `notificationPresentation.ts` indexé par `eventType`, avec fallback par `referenceType`, fournissant libellé, catégorie, icône, tonalité et, de manière prudente, traduction de tokens connus dans les messages historiques. Les identifiants persistés restent inchangés. Pour les nouvelles notifications, les producteurs backend devraient progressivement produire du texte déjà francisé via helpers partagés, sans réécrire l'historique. **[Recommandation]**

## 14. Performance et limites techniques

- Pagination serveur bornée à 100 et ordre stable date/id : bon socle.
- Index utiles : utilisateur/lecture/date, événement, visibilité utilisateur, agence, auteur, archives/suppressions.
- Manque d'index couvrant directement la vue Agence avec canal/archives/date ; `idx_notifications_operation_agency` seul impose davantage de filtrage.
- `DATE(created_at)` sur filtres de dates empêche généralement un parcours optimal de l'index.
- Trois requêtes par liste (total, non-lu, items), avec `COUNT(DISTINCT expression)` et fenêtre sur un groupe calculé.
- Page frontend de 5 accroît le nombre de requêtes/paginations.
- Distribution collective N insertions séquentielles + requêtes d'éligibilité/snapshots ; acceptable à faible population, moins à grande agence.
- Aucun mécanisme de rétention/purge observé ; les suppressions sont logiques et les volumes croissent.
- `notification_templates` et canaux email/SMS ne sont pas orchestrés dans ce service.

À plusieurs milliers de lignes par utilisateur/agence, le système reste fonctionnel mais le groupement calculé et les comptes distincts méritent un `EXPLAIN ANALYZE` sur une copie de données avant tout changement d'index. **[À confirmer dynamiquement]**

## 15. Évaluation des améliorations envisagées

| Amélioration | Déjà disponible | Frontend seul | Backend nécessaire | Risque | Priorité |
|---|---:|---:|---:|---|---|
| Titre « Centre de notifications » + description | Non | Oui | Non | Faible | P0 |
| Compteur non lues | Oui | Oui | Non | Faible | P1 |
| Compteur du jour | Filtre date disponible | Oui, via requête dédiée | Non | Moyen (requête en plus) | P1 |
| Compteur nécessitant action | Non fiable | Non | Modèle/règles | Élevé | P2 différé |
| Lignes compactes, icônes, lues/non lues | Partiel | Oui | Non | Faible | P1 |
| Titres/descriptions françaises | Partiel | Oui pour historique connu | Helpers backend pour exhaustivité future | Moyen | P0 |
| Suppression badges techniques | Non | Oui | Non | Faible | P0 |
| Agence/date/actions lisibles | Partiel | Oui | Non | Faible | P1 |
| Mes notifications / Agence | Oui | Oui | Non | Faible | P0 (cohérence) |
| Concession / Global | Frontend seulement | Non | Oui | Élevé RBAC | P2 ou retrait P0 |
| Toutes / Non lues / Lues | deux sur trois | Lues possible via extension de filtre client non paginée : déconseillé | filtre serveur `readStatus` | Faible | P2 |
| Archivées | Persistance seulement | Non | liste + restauration | Moyen | P2 |
| Catégories complètes | Partiel | Oui | Non | Faible | P1 |
| Recherche titre/message/référence | Non | Non à volume paginé | Oui + index éventuel | Moyen | P2 |
| Ouvrir élément métier | Partiel | Oui pour routes existantes | parfois endpoint/route détail | Moyen | P2 |
| Marquer lue / tout lire / archiver | Oui | Oui | Non | Faible | acquis |
| Marquer non lue | Non | Non | Oui | Faible | P2 |
| Détails | Non | Oui avec données actuelles | Non | Faible | P1 |
| Information/Important/Critique | Priorité brute | Oui si convention validée | Non | Moyen sémantique | P1 après validation |

## 16. Première passe réaliste

### P0 — corrections indispensables

1. Créer une couche de présentation frontend centralisée couvrant tous les `eventType/referenceType` recensés, avec fallback « Notification système » non technique.
2. Retirer l'affichage brut du code événement ; conserver le code uniquement pour diagnostic non visible ou télémétrie.
3. Traduire les tokens historiques connus (`appointment`, `test_drive`, statuts Ventes/Atelier) sans modifier la base.
4. Retirer `Concession` et `Global` des scopes proposés tant que l'API ne les supporte pas ; garder Mes notifications/Agence selon RBAC.
5. Harmoniser page et dropdown navbar sur les mêmes libellés, icônes et couleurs.
6. Ajouter état de chargement, message d'erreur métier et états vides contextualisés.

### P1 — présentation

1. En-tête « Centre de notifications », sous-titre métier, compteurs non-lues et du jour (requête filtrée, à mesurer).
2. Lignes compactes mais accessibles : icône par catégorie, titre, message, agence/date, menu d'actions ; taille de texte minimale lisible.
3. Catégories étendues : Sécurité, RH, Pièces, Devis, Documents/autre.
4. Pagination commune `ClientPagination` ou composant serveur équivalent, page 10/20 plutôt que 5.
5. Détail local (popover/dialog) affichant auteur, agence, date, priorité et référence, sans nouvelle API.
6. Convention documentée : normal=information, high=important, urgent=critique ; ne pas exposer `low` avant usage réel.

### P2 — évolutions fonctionnelles

1. Ajouter filtre serveur lu/non lu/tous.
2. Ajouter liste d'archives et restauration, avec audit et mêmes gardes propriétaire/agence.
3. Ajouter marquage non lu si validé métier.
4. Ajouter recherche serveur sécurisée et indexée après mesure.
5. Compléter les routes détail (prospect, paiement, avoir, utilisateur, prime/dépense) et distinguer clairement destination indisponible.
6. Décider explicitement si Concession/Global sont souhaités ; ne les implémenter qu'avec prédicats backend, tests inter-agences et sémantique de groupement.
7. Centraliser les producteurs backend et leurs libellés ; ajouter `event_key` stable aux flux qui en sont dépourvus.

## 17. Risques de régression

- changer les codes persistés casserait filtres, historique et déduplication : ne pas le faire ;
- traduire naïvement par remplacement de sous-chaînes peut altérer un texte libre : cibler des tokens/événements précis ;
- une navigation automatique peut exposer un 403/404 ou changer d'agence implicitement : ne jamais changer le contexte sans consentement ;
- rendre les actions disponibles en vue Agence contournerait le modèle propriétaire actuel ;
- ajouter archives/recherche sans prédicats identiques à `notificationVisibility` créerait un risque inter-agences ;
- modifier la clé de groupement peut changer compteurs et pagination ;
- multiplier les compteurs en en-tête augmente les requêtes ; préférer un endpoint résumé si la mesure l'exige ;
- rendre la création transactionnelle avec le métier sans outbox peut allonger/verrouiller les transactions ; traiter séparément.

## 18. Estimation du périmètre

**Première passe P0/P1 :** environ 5 à 8 fichiers frontend modifiés, 1 nouveau module de présentation, tests unitaires de mapping et tests de composants ciblés. Aucun schéma ni migration. Charge indicative : 3 à 5 jours de développement/recette selon le niveau de finition responsive et accessibilité. **[Estimation]**

**P2 archives/recherche/navigation :** 4 à 8 fichiers backend/frontend supplémentaires, tests MySQL RBAC et éventuellement un index après mesure. Charge indicative : 5 à 10 jours, hors décisions métier sur scopes globaux et priorités. **[Estimation]**

## 19. Fichiers susceptibles d'être concernés

### Première passe frontend

- `frontend/src/modules/notifications/NotificationsPage.tsx`
- `frontend/src/modules/notifications/notificationFilters.ts`
- `frontend/src/modules/notifications/notificationPresentation.ts` (nouveau proposé)
- `frontend/src/api/notificationHooks.ts`
- `frontend/src/types/notifications.ts`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/navigation/routes.ts`
- tests frontend Notifications à créer/compléter

### Évolutions backend éventuelles P2

- `backend-node/src/modules/notifications/notification.routes.ts`
- `backend-node/src/modules/notifications/notification.service.ts`
- producteurs listés dans CRM, Showroom, Véhicules, Ventes, Devis, Livraisons, Atelier, Pièces, Facturation, RH et Auth
- `backend-node/test/notifications-agency-rbac-mysql.integration.test.ts`
- `backend-node/test/notifications-dynamic-reliability.test.ts`
- migration d'index uniquement si justifiée par `EXPLAIN ANALYZE` ; aucune nouvelle colonne n'est nécessaire pour P0/P1.

## 20. Conclusion

Le socle de sécurité, persistance et temps réel est exploitable sans refonte. La priorité n'est pas une nouvelle architecture mais une couche de présentation française, exhaustive et centralisée, accompagnée de la suppression des scopes non supportés et d'états UI professionnels. Les fonctions d'archives, recherche, non-lu et navigation exhaustive doivent rester une seconde étape, car elles exigent des contrats backend et une nouvelle recette RBAC. Le module peut donc gagner fortement en qualité perçue avec une première passe frontend sans migration, sans toucher aux notifications historiques et sans fragiliser Socket.IO.
