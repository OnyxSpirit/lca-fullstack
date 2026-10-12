# STABILISATION-ERP-22 Phase 2 — Restauration

Date : 12 octobre 2026  
Projet cible : `lca-restauration`

## Résultat

La sauvegarde de qualification RC2 a été restaurée intégralement dans un environnement Docker neuf et indépendant. La comparaison avant/après est identique avant les mutations des tests fonctionnels.

## 1. Isolation de la cible

| Service | Conteneur | Port local | État final |
|---|---|---:|---|
| frontend | `lca-restauration-frontend-1` | `127.0.0.1:4501` | healthy, 0 redémarrage |
| backend | `lca-restauration-backend-1` | `127.0.0.1:4502` | healthy, 0 redémarrage |
| MySQL 8.4.11 | `lca-restauration-mysql-1` | `127.0.0.1:45306` | healthy, 0 redémarrage |

MySQL n'est lié qu'à l'interface locale, jamais publiquement. Les volumes dédiés sont `lca_restauration_mysql_data`, `lca_restauration_ged_data` et `lca_restauration_uploads_data`. Les réseaux dédiés sont `lca-restauration_restauration_private` et `lca-restauration_restauration_host`.

Le backend et le frontend utilisent exactement les images RC2 déjà qualifiées :

- backend : `sha256:55c754c6e4c08e8e3d470d8130ba0a3d2fac4c03f06d72af36f9c901683f8f57` ;
- frontend : `sha256:569ed5394c46737b0fafac3643abcb044fb61bdc9d3c9a69eb196ff1b33bb539` ;
- MySQL : image `mysql:8.4`, moteur constaté 8.4.11.

Des secrets DB/JWT/bootstrap nouveaux ont été générés dans un fichier temporaire mode 0600. Ils n'ont été ni affichés, ni copiés dans les rapports, ni réutilisés depuis les autres environnements.

## 2. Ordre de restauration exécuté

1. nouvelle extraction des 786 fichiers RC2 ;
2. validation des chemins des archives GED/uploads ;
3. refus préalable si un conteneur ou volume `lca-restauration` existait ;
4. vérification complète de `SHA256SUMS` ;
5. création de MySQL seul et attente du healthcheck ;
6. import de `mysql.sql` dans la base vide ;
7. extraction de `uploads.tar.gz` et `ged.tar.gz` dans les nouveaux volumes ;
8. démarrage backend, puis frontend ;
9. attente des trois états `healthy` ;
10. comparaison SQL et fichiers, puis tests fonctionnels ciblés.

La restauration n'a écrasé aucune base. Aucun volume source ou historique n'a été monté dans les services restaurés.

## 3. Comparaison avant/après

Le fichier `source-summary.tsv` a été comparé octet pour octet au résumé SQL restauré avant les tests mutables : aucune différence.

Éléments comparés : schéma 152 tables, migrations 9/max 79, agences, utilisateurs, rôles, permissions et affectations, clients, prospects, véhicules, ventes, lignes, factures, encaissements, OR, pièces, stocks, mouvements, réservations, documents et paramètres.

Les contrôles financiers sont identiques : vente et facture à 11 800 000 XAF, payé 5 000 000 XAF, solde 6 800 000 XAF. Les statuts sont conservés : `confirmed`, `partially_paid`, `confirmed`, `in_progress`, `reserved`. La chaîne relationnelle client → vente → véhicule → facture → paiement → OR → réservation → pièce retourne exactement une relation cohérente.

Les clés étrangères étaient actives pendant la création du jeu. L'import a restauré les contraintes du dump ; les relations critiques ont été contrôlées par jointures métier, et le bootstrap backend n'a appliqué aucune migration supplémentaire.

## 4. GED et uploads

- inventaire GED restauré identique à l'inventaire source ;
- inventaire uploads restauré identique à l'inventaire source ;
- empreinte des deux PDF : `cfa3181c1ee36e8bce5e39f84959f4558ea7ba32c0e4539a8ab3c8ce8c716ec6` ;
- empreinte de l'upload fictif : `f06f34dc92ffc4e0f04c68cb7b1200cb37c30f0c628c97798b206896771c046d` ;
- deux métadonnées SQL pour deux fichiers GED ;
- aucun fichier GED manquant ;
- aucun fichier GED orphelin ;
- téléchargement authentifié réussi avec empreinte identique ;
- téléchargement anonyme refusé avec HTTP 401.

L'upload fictif est un artefact de volume sans métadonnée GED, volontairement distinct. Il est présent et identique après restauration.

## 5. RBAC dynamique

Le rôle `ERP22_CUSTOMER_READER`, sa permission `customers.view`, son scope `AGENCY` et son affectation initiale sont identiques avant/après.

Après la comparaison immuable, un nouvel utilisateur fictif a été créé dans la cible et affecté au rôle restauré. Sa connexion JWT a réussi, `GET /api/customers` a été autorisé et `GET /api/users` a été refusé avec HTTP 403. Le Super Administrateur demeure un rôle système protégé. Aucun rôle métier n'est codé en dur et aucune permission métier n'a été attribuée automatiquement.

## 6. Tests de reprise

Résultat : **19/19 contrôles réussis**.

- frontend HTTP 200 ;
- health backend/MySQL ;
- refus sans JWT ;
- connexion d'un utilisateur restauré et émission JWT ;
- consultation client ;
- consultation véhicule via sa relation client/atelier ;
- consultation facture ;
- consultation OR ;
- consultation pièce et stock ;
- métadonnées et téléchargement GED ;
- refus GED anonyme ;
- rôle dynamique et scope restaurés ;
- affectation et connexion du rôle dynamique ;
- accès RBAC autorisé et interdit ;
- Socket.IO avec JWT valide accepté ;
- Socket.IO avec JWT invalide refusé.

Les journaux des trois services ne contiennent aucun `error`, `fatal`, `panic`, `exception`, `unhandled` ou `corrupt`. MySQL présente uniquement ses avertissements standards d'initialisation locale, certificat autosigné et emplacement PID.

## 7. Mesures

| Étape | Durée |
|---|---:|
| Initialisation MySQL jusqu'à `healthy` | 40 s |
| Import SQL | 48 s |
| Restauration GED/uploads | 5 s |
| Commande de démarrage applicatif | 15 s |
| Démarrage applicatif jusqu'à `healthy` | 7 s |
| Restauration totale jusqu'aux trois services sains | 119 s |

Mesures sur données de qualification uniquement ; aucune extrapolation à la production n'est valide.

## 8. Reprise de service, retour arrière et procédure

La reprise ne doit être annoncée qu'après : empreintes valides, import sans erreur, migrations attendues, fichiers présents, jointures métier cohérentes, healthchecks, journaux et smoke tests.

Séquence reproductible validée :

```bash
sha256sum -c BACKUP/SHA256SUMS
docker compose -p TARGET --env-file TARGET_ENV -f TARGET_COMPOSE up -d mysql
# attendre MySQL healthy
docker exec -i TARGET_MYSQL sh -lc 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"' < BACKUP/mysql.sql
docker run --rm -v TARGET_UPLOADS:/data -v BACKUP:/backup:ro alpine:3.21 tar -C /data -xzf /backup/uploads.tar.gz
docker run --rm -v TARGET_GED:/data -v BACKUP:/backup:ro alpine:3.21 tar -C /data -xzf /backup/ged.tar.gz
docker compose -p TARGET --env-file TARGET_ENV -f TARGET_COMPOSE up -d backend frontend
# comparer SQL, empreintes, healthchecks, logs et parcours ciblés
```

Conditions d'arrêt : empreinte invalide, cible non vide, volume déjà présent, archive à chemin absolu/traversant, version inattendue, migration différente, fichier manquant, divergence financière, erreur de contrainte, service non sain ou log critique.

Retour arrière : ne jamais restaurer sur place. Conserver l'ancienne installation arrêtée mais intacte, basculer uniquement après validation, et en cas d'échec arrêter la cible neuve puis revenir au routage de l'ancienne instance. La suppression de la cible ou de ses volumes est une action destructive distincte, non exécutée pendant cette mission.

## 9. Anomalies et limites

- Aucune anomalie applicative ou de données n'a nécessité de correction du code principal.
- La première cellule d'orchestration a cessé d'afficher la progression après l'initialisation MySQL, mais le processus contrôlé a continué jusqu'à son manifeste de métriques ; l'état final et chaque étape ont été vérifiés indépendamment.
- Le libellé historique `foreign_key_violations` du résumé de comparaison représente en réalité `@@FOREIGN_KEY_CHECKS=1`, non un compteur de violations. L'intégrité réelle est démontrée par l'import avec contraintes et les jointures métier.
- La procédure historique générique à volumes codés en dur doit être paramétrée avant un usage multi-environnement ou production.

