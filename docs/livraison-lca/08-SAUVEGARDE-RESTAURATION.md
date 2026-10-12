# Sauvegarde et restauration

## Principe

Une sauvegarde valide couvre le même point logique pour MySQL, GED et uploads. Le dump SQL seul est insuffisant. Les secrets sont sauvegardés séparément dans un coffre, jamais dans l'archive applicative.

## Sauvegarde qualifiée

1. annoncer une fenêtre sans écriture ou activer un mécanisme équivalent démontré ;
2. arrêter backend/frontend, laisser MySQL disponible ;
3. produire un `mysqldump --single-transaction` avec routines, triggers et événements ;
4. archiver GED et uploads en lecture seule ;
5. enregistrer version, Compose, inventaires et prérequis sans secrets ;
6. calculer les SHA-256 ;
7. redémarrer, vérifier healthchecks et journaux ;
8. chiffrer, externaliser et appliquer la rétention.

La campagne ERP-22 a mesuré 48 secondes d'interruption sur un jeu fictif minuscule. Ce n'est pas un RPO/RTO ni une garantie de production.

## Restauration qualifiée

Toujours restaurer d'abord dans une cible vide : nouveaux conteneurs, volumes, réseaux, ports et secrets. Vérifier `SHA256SUMS`, démarrer MySQL seul, importer SQL, restaurer uploads/GED, puis démarrer backend/frontend. Comparer schéma, comptages, relations, montants, statuts et empreintes avant les tests mutables.

Contrôler login/JWT, rôles/scopes, client, véhicule, vente, facture/paiement, OR, stock, GED et Socket.IO. ERP-22 a obtenu 19/19 contrôles et 119 secondes au total sur données fictives ; aucune extrapolation n'est permise.

## Restrictions

Les scripts `scripts/backup.sh` et `scripts/restore.sh` ciblent les volumes `lca_*`. Ils conviennent uniquement à la topologie prévue et après revue. Ne jamais lancer une restauration sur une base existante ou un environnement source. Ne jamais supprimer automatiquement un orphelin GED.

La procédure exécutée et ses commandes détaillées sont dans [ERP-22 Sauvegarde](../STABILISATION-ERP-22-SAUVEGARDE.md) et [ERP-22 Restauration](../STABILISATION-ERP-22-RESTAURATION.md).

