# Recommandations et plan correctif

## Architecture recommandée

Conserver deux niveaux :

1. **Cachet** : identité, image/version, propriétaire, agences autorisées, rôles autorisés et types documentaires éligibles.
2. **Politique** : par agence et document, exigences de signature/cachet, cachet par défaut, règle d’absence et activation.

## Ordre proposé, sans implémentation dans cet audit

1. Corriger la lecture des politiques avec un prédicat dédié et ajouter un test HTTP/MySQL sauvegarde → GET → changement d’agence.
2. Isoler la mutation et les notifications par document.
3. Remplacer les statuts techniques par des libellés métier français.
4. Décider explicitement si la livraison doit respecter les autorisations de rôles du cachet.
5. Résoudre la signature selon l’affectation d’agence active, pas seulement l’agence primaire.
6. Afficher « documents autorisés » sur la fiche cachet et « règles d’émission » dans les politiques.
7. Décider document par document de l’extension du moteur : pro forma en priorité, puis documents SAV/comptables si besoin métier validé.

## Tests requis

MySQL 8.4 jetable, deux agences d’une même concession et une agence externe ; quatre combinaisons de présence de marques ; `BLOCK`/`ALLOW_WITHOUT_MARK`; deux sauvegardes concurrentes ; révocation ; rôle inactif ; changement d’agence ; archive byte-identique.

La correction doit préserver les validations B3.2.1 et LOT13 et ne doit introduire que les scopes `OWN` et `AGENCY`.
