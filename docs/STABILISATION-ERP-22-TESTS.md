# STABILISATION-ERP-22 — Tests de Phase 1

Date : 12 octobre 2026  
Périmètre : installation fraîche issue de l'archive ERP-21, projet `lca-qualification`.

## Contrôles runtime

Un scénario HTTP/Socket.IO exécuté contre les ports isolés a réalisé 26 contrôles, tous réussis :

- frontend HTTP 200 et santé backend/MySQL ;
- refus d'une route protégée sans JWT et refus d'identifiants invalides ;
- connexion du Super Admin et lecture de son profil ;
- présence initiale du seul rôle système `SUPER_ADMIN` ;
- chargement du catalogue de permissions ;
- création dynamique du rôle `ERP22_CUSTOMER_READER` ;
- attribution de `customers.view` avec scope `AGENCY` ;
- création d'un utilisateur de qualification et affectation du rôle ;
- connexion et accès autorisé à `/customers` ;
- refus 403 sur `/users`, permission non attribuée ;
- connexion Socket.IO authentifiée ;
- refus Socket.IO avec JWT invalide ;
- rotation du refresh token et refus de l'ancien token ;
- déconnexion et révocation effective de la session ;
- désactivation de l'utilisateur et refus de sa nouvelle connexion ;
- refus de désactiver le dernier Super Admin.

L'expiration JWT n'a pas été attendue en temps réel. Sa configuration et les tests livrés de révocation/session ont été contrôlés ; la rotation et la révocation ont été exercées réellement.

## GED et uploads

Sept contrôles GED runtime sont réussis :

- dépôt multipart d'un PDF synthétique de 69 octets sans donnée réelle ;
- création des métadonnées SQL ;
- écriture physique dans le volume GED dédié ;
- consultation des métadonnées ;
- prévisualisation authentifiée avec MIME PDF ;
- refus 401 sans authentification ;
- second dépôt identique signalé par `duplicateWarning=true`.

Deux documents, deux empreintes SQL et deux objets physiques de 69 octets ont été constatés. Le dépôt manuel signale donc le doublon mais ne déduplique pas physiquement ; l'idempotence forte des documents métier générés est couverte par les tests ciblés, pas par ce parcours manuel.

## Suites ciblées de l'archive

### Frontend

Douze fichiers ciblés ont réussi, couvrant client API/session, bootstrap, commercial, Client 360, stock, livraison, SAV/OR, pièces, GED, notifications, RH et permissions dynamiques.

Résultat : **12 fichiers réussis, 0 échec**.

### Backend

Une première sélection de quatorze fichiers a produit : **10 réussis, 4 en échec**. Les quatre fichiers ont été relancés séparément hors des restrictions IPC du bac à sable. Leur résultat détaillé est de 34 assertions : **16 réussies, 18 en échec**.

| Suite | Réussies | Échecs | Constat principal |
|---|---:|---:|---|
| `commercial-final-workflow.test.ts` | 4 | 1 | assertion source attend un ancien texte/forme de garde métier |
| `customers360-endpoint.test.ts` | 0 | 7 | fixture désormais refusée 403 par le RBAC, alors que 200/404 sont attendus |
| `ged-final-security.test.ts` | 11 | 9 | assertions par expressions régulières non alignées avec les refactorings présents |
| `recette-critique-02.test.ts` | 1 | 1 | assertion source attend une ancienne forme de requête de prix minimum |

Les dix fichiers backend réussis couvrent notamment la révocation de session, le RBAC dynamique, la livraison, les pièces ERP-19, RH, notifications, trois recettes critiques, le SAV/OR et les KPI stock.

Ces échecs ne sont pas imputables à une dépendance réseau ou à l'isolation Docker. Ils sont reproductibles depuis l'archive. Les réussites runtime Client/RBAC et GED montrent que plusieurs échecs sont des tests structurels ou fixtures devenus obsolètes ; cela n'autorise toutefois pas à ignorer l'incohérence entre code et tests livrés.

## Audit des dépendances de production

`npm audit --omit=dev` a signalé :

- backend : 4 avis, dont 1 critique et 3 élevés ;
- frontend : 1 avis élevé.

Avis significatifs observés :

- `proxy-addr` inférieur à 2.0.8 : contournement de confiance IP via IPv4 mappée IPv6, criticité critique ;
- `engine.io` : déni de service par désaccord de révision protocolaire, criticité élevée ;
- chaîne `express-rate-limit` / `ip-address` : contournement de limitation et problèmes de frontière de confiance, criticité élevée ;
- `source-map-js` : blocage de boucle événementielle, criticité élevée côté dépendances frontend de production.

Les correctifs sont annoncés disponibles. Aucun `npm audit fix` n'a été exécuté : modifier le lockfile ou le code invaliderait la correspondance avec l'archive ERP-21 et imposerait une nouvelle qualification de l'export.

## Parcours non exécutés intégralement

La Phase 1 n'a pas rejoué les vingt campagnes antérieures ni créé une chaîne métier complète vente → facture → encaissement → livraison → OR. Ces domaines ont été sondés par les suites ciblées disponibles. Aucun paiement, SMS ou email réel n'a été déclenché. La restauration complète est explicitement hors périmètre et relève de la Phase 2.

## État final

- `lca-qualification-mysql-1` : healthy, 0 redémarrage ;
- `lca-qualification-backend-1` : healthy, 0 redémarrage ;
- `lca-qualification-frontend-1` : healthy, 0 redémarrage ;
- erreurs applicatives ou de migration dans les journaux : aucune ;
- environnements protégés `lca` et `lca-recette` : six conteneurs healthy, identifiants inchangés.

