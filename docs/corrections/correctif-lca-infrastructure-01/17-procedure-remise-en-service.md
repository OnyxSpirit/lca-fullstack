# Procédure contrôlée de remise en service

## Préconditions

1. Autorisation explicite de l'utilisateur pour modifier la base principale et laisser redémarrer le backend.
2. Vérifier l'archive SHA-256 `7084d71c…e671`, l'espace disque, MySQL 8.4.11 et l'identité exacte `lca-mysql-1`/base configurée.
3. Refaire les lectures : étape 135/7 exactement `FAILED_PARTIAL` checksum `affa2d…`, étapes 1–6 exactes, FK exacte, colonnes tierces absentes, zéro orphelin.
4. Vérifier que le code déployé correspond aux fichiers qualifiés et que `npm run db:migrations:verify` réussit.

## Intervention après autorisation

Laisser le bootstrap officiel exécuter la reprise; ne pas lancer de SQL manuel et ne pas modifier le journal. Surveiller successivement l'étape 135/7, les étapes 8–9, le journal 135, les 15 étapes 136, les 2 étapes 137, puis le démarrage serveur. Une opération Docker ne doit être utilisée que si explicitement autorisée; aucun volume ne doit être supprimé.

## Contrôles après

Niveau 137, aucune étape non `APPLIED`, FK/colonnes exactes, aucune donnée orpheline, compteurs/agrégats inchangés hors ajouts attendus, healthcheck backend 200, frontend/proxy/authentification accessibles, aucun redémarrage en boucle ni erreur critique. Rejouer le bootstrap et confirmer zéro migration.

## Échec

Ne jamais effacer les journaux. Capturer logs et état réel. Si l'état correspond à une phase connue, le runner reprend; sinon bloquer. La sauvegarde restaurée prouve la récupérabilité; toute restauration principale destructive requiert une nouvelle autorisation explicite.
