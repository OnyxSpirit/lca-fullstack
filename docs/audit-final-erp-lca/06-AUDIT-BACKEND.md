# Audit backend

## Couverture

122 fichiers TypeScript et 7 186 lignes ont été examinés, dont 99 fichiers métier/6 401 lignes. Les 35 routeurs actifs et 497 endpoints ont été inventoriés : authentification, permission, scope, validation, états, pagination, erreurs, transactions, idempotence et fichiers. 227 tests backend ont été lus sans être exécutés.

## Constats référencés

| ID | Composant | Nature |
|---|---|---|
| AUD-LCA-001 | résolveur RBAC | rôle arbitraire sur donnée multi-rôle |
| AUD-LCA-002 | middleware agence | scope dynamique neutralisé |
| AUD-LCA-003 | Socket/utilisateurs | contexte non renouvelé |
| AUD-LCA-004 | annuaire | permission/DTO trop larges |
| AUD-LCA-005 | route CRM stage | transition concurrente non protégée |
| AUD-LCA-008 | PATCH CRM | invariants finaux non revalidés |
| AUD-LCA-009 | recherche GED | filtre d'accès après limite |
| AUD-LCA-010 | mutations GED | audit non atomique |
| AUD-LCA-011 | reporting budget | filtre concession incomplet |
| AUD-LCA-012 | politique GED facture | permission incohérente |
| AUD-LCA-013/014/019 | DB/upload/health | bornage des ressources |
| AUD-LCA-018 | avatars | contenu non vérifié |
| AUD-LCA-020/021 | Socket/login | cas limites d'isolation/atomicité |

## Contrôles positifs

JWT HS256 explicitement contraint, sessions persistées et rotation de refresh, révocation HTTP/Socket à la désactivation, secrets minimaux, limiteurs auth, requêtes paramétrées, transaction/retry deadlock, nombreux `FOR UPDATE`, GED privée avec containment/signatures/hash, staging atomique des images véhicule et gestion centralisée des erreurs.

## Limites

Sans appels réels, la conformité des codes HTTP et DTO n'a été vérifiée que par branches statiques. Les plans SQL, données atypiques et interblocages effectifs exigent une validation contrôlée ultérieure.

## Verdict

Le backend comporte un socle transactionnel conséquent. Les priorités restent la cohérence RBAC multi-agence, la course CRM et l'annuaire. Verdict : **non qualifiable pour livraison sans arbitrage/correction des P1 backend**.
