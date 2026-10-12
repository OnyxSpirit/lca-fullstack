# Audit sécurité et RBAC

## Surface examinée

JWT/refresh/session, CORS, Helmet, rate limiting, RBAC dynamique, scopes OWN/AGENCY/CONCESSION/GLOBAL, délégation, Super Admin, fichiers, path traversal, événements Socket.IO, secrets attendus, exposition Nginx et images Docker.

## Constats

| ID | Risque sécurité/RBAC | Certitude |
|---|---|---|
| AUD-LCA-001 | habilitation arbitraire si donnée multi-rôle | confirmée |
| AUD-LCA-002 | déni fonctionnel des scopes larges | confirmée |
| AUD-LCA-003 | événements de l'ancien périmètre après mutation | confirmée |
| AUD-LCA-004 | annuaire et métadonnées RBAC sans droit dédié | confirmée |
| AUD-LCA-006 | blob facture franchissant une session frontend | confirmée |
| AUD-LCA-007 | transport clair si absence de TLS externe | risque potentiel |
| AUD-LCA-012 | permission GED/facture contradictoire | confirmée |
| AUD-LCA-018 | contenu avatar arbitraire servi publiquement | confirmée |
| AUD-LCA-020 | room artificielle `agency:null` | confirmée, impact conditionnel |
| AUD-LCA-023 | garde frontend notifications absent | confirmée, sans fuite API démontrée |
| AUD-LCA-024 | dérive d'images de base | risque potentiel |

## Défenses constatées

Algorithme JWT fixé, vérification de session active au handshake, refresh hashé/rotatif, invalidation à la désactivation, rate limit auth, CORS origine configurée, Helmet API, requêtes paramétrées, validation de signatures GED/véhicule et containment de chemin. Aucun secret n'a été lu ni reproduit.

## Durcissements non comptés comme anomalie autonome

Le Nginx SPA ne déclare pas CSP, `frame-ancestors` ni Permissions-Policy ; Helmet ne couvre que l'API. Ce point est une recommandation de défense en profondeur conditionnée par la politique du terminateur TLS. Le stockage des jetons dans localStorage accroît l'impact d'une XSS future, mais aucun sink HTML actif n'a été trouvé ; il n'est donc pas surclassé en vulnérabilité actuelle.

## Verdict

La sécurité de base est substantielle, mais les frontières d'autorisation dynamiques restent le principal risque. **AUD-LCA-001, 003, 004, 006 et le statut TLS d'AUD-LCA-007 doivent être levés avant livraison.**
