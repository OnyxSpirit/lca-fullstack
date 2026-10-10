# AUDIT-ERP-02 — Audit RBAC et confidentialité

## Modèle observé

Les routes emploient `requirePermission`, les permissions dynamiques de la requête et des prédicats SQL. Aucun contrôle audité ne se fonde uniquement sur le nom d'un rôle.

| Scope | CRM | Clients | Évaluation |
|---|---|---|---|
| OWN | Affectataire, avec agence dérivée | `assigned_user_id = utilisateur` | Conforme dans les listes et mutations principales |
| AGENCY | Agence propriétaire/créatrice | `customer.agency_id` | Conforme |
| CONCESSION | Agences de même concession | Agences de même concession | Conforme |
| GLOBAL | Sans restriction, filtres facultatifs | Sans restriction, filtres facultatifs | Conforme |

L'affectation contrôle séparément `crm.prospect.assign`; les mutations contrôlent la permission fonctionnelle et l'accessibilité de la ligne. Les destinataires temps réel/notifications sont résolus selon permissions et périmètres.

## RBAC-01 — Timeline 360° partiellement non scopée

- Classification : **CONFIRMÉ — P1**
- Fichier : `backend-node/src/modules/customers/customer.routes.ts`
- Lignes : 142–144
- Fonction : `GET /customers/:id/360`

Les unions Livraison, Showroom et GED sont activées par `can(...)`, puis filtrent uniquement `customer_id`. Aucun prédicat OWN/AGENCY/CONCESSION/GLOBAL propre à ces modules n'est ajouté. Les autres sections appliquent bien un prédicat de scope et l'agence du client.

Reproduction de code : donner accès à une fiche client et la permission `delivery.view`, `showroom.view` ou `ged.view` avec scope restreint ; créer ou rattacher un événement hors périmètre au même client ; appeler `/api/customers/:id/360`. L'événement est éligible à l'union.

Impact : divulgation indirecte de statut, motif, nom de document, dates et identifiants. La faisabilité dépend des possibilités de rattachement inter-agence, mais le défaut de défense en profondeur est certain.

Correction minimale proposée : produire un `permissionScopePredicate` par module/alias et l'injecter dans chaque sous-requête ; ajouter des tests négatifs pour les quatre scopes.

## Autres observations

- Les suggestions d'affectation sont protégées par `crm.prospect.assign` et limitées aux candidats actifs/habilités : **CONFORME**.
- Les recherches passent par les mêmes prédicats que les listes : **CONFORME**.
- Les compteurs Kanban ne fuient pas au-delà du scope, mais sont incomplets au-delà de 200 : anomalie fonctionnelle, pas fuite.
- `leadById` sans scope est utilisé après une création ou mutation déjà autorisée ; aucun accès arbitraire n'est exposé dans ce flux : **CONFORME AVEC VIGILANCE**.
- La couverture réelle par tests n'autorise pas à conclure « aucune fuite RBAC » pour l'ensemble des modules.

## Tests nécessaires

- Matrice lecture/mutation/recherche/historique pour OWN, AGENCY, CONCESSION, GLOBAL.
- Réaffectation intra/inter-agence et perte immédiate d'accès de l'ancien propriétaire.
- Timeline 360° avec livraison, visite et document appartenant à un périmètre différent.
- Notifications et temps réel : destinataire autorisé et absence de destinataire hors scope.
