# STABILISATION-ERP-22 — Bilan Phase 1

## Verdict

**INSTALLATION NON QUALIFIÉE**

L'installation depuis l'archive est techniquement reproductible : intégrité conforme, extraction sûre, dépendances installables, lint et builds réussis, images Docker construites, base MySQL 8.4 initialisée jusqu'à la migration 79 et trois services stables. Les parcours runtime essentiels Auth/JWT, RBAC dynamique, GED et Socket.IO passent.

La candidate ne satisfait néanmoins pas les critères globaux de qualification de Phase 1 pour deux motifs bloquants :

1. les dépendances de production comportent une vulnérabilité critique et quatre vulnérabilités élevées au total ;
2. quatre suites backend fournies dans l'export échouent de manière reproductible, soit 18 assertions en échec lors de la relance détaillée.

Le bon fonctionnement observé ne permet pas de neutraliser un risque critique connu ni de déclarer conformes des tests livrés non alignés avec le code.

## Qualification par objet

| Objet | Décision | Motif |
|---|---|---|
| Reproductibilité de l'installation | Démontrée | archive conforme, builds et installation fraîche réussis |
| Installation ERP-22 Phase 1 | Non qualifiée | vulnérabilité critique + suites backend incohérentes |
| Restauration | Non qualifiée / non testée | réservée à ERP-22 Phase 2 |
| Distribution | Bloquée | accès historiquement exposés non confirmés comme révoqués/renouvelés, plus blocages Phase 1 |
| Production | Non autorisée | aucune décision de production ne peut découler de cette phase |

## Anomalies et réserves

### Bloquantes

- `proxy-addr` vulnérable en dépendance de production, avis critique avec correctif disponible.
- Trois avis élevés backend et un avis élevé frontend.
- Échecs reproductibles de `commercial-final-workflow`, `customers360-endpoint`, `ged-final-security` et `recette-critique-02`.

### Non bloquantes ou à clarifier

- Le provisionnement refuse toute adresse contenant `example`, y compris le domaine réservé `example.test`; une adresse `.invalid` a permis la qualification sans modifier le code.
- Le dépôt GED manuel avertit d'un doublon mais écrit une seconde copie ; ce comportement est cohérent avec l'implémentation observée mais doit être distingué de l'idempotence des archives métier générées.
- Les avertissements MySQL d'initialisation, certificat autosigné et fichier PID sont confinés à l'environnement local isolé.

## Actions nécessaires avant nouvelle qualification

1. Corriger les dépendances vulnérables de façon ciblée et revue, sans `npm audit fix` aveugle.
2. Déterminer pour chacune des 18 assertions si le code ou le test porte la règle attendue, puis corriger la source appropriée.
3. Relancer lint, builds, audits et suites concernées.
4. Produire une nouvelle archive source, un nouveau manifeste et une nouvelle empreinte ERP-21 ; l'archive actuelle ne doit pas être présentée comme contenant les corrections.
5. Confirmer la révocation ou la rotation des accès précédemment exposés avant toute distribution.
6. Exécuter séparément la qualification de restauration en Phase 2.

## Préservation et traçabilité

- Aucun fichier de l'archive candidate n'a été corrigé.
- Aucun secret temporaire n'est documenté ou ajouté à Git.
- Aucun conteneur, réseau, volume, port ou jeu de données de `lca` ou `lca-recette` n'a été modifié.
- Aucun `commit`, tag, push ou déploiement n'a été réalisé.
- L'environnement isolé reste disponible pour revue sur `127.0.0.1:4301` (frontend), `127.0.0.1:4302` (backend) et `127.0.0.1:43306` (MySQL).

