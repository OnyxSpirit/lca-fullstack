# Tests d’investigation

## Exécutés

Commande ciblée sur six suites existantes signatures/cachets/PDF : **40 tests réussis, 0 échec**, durée 17,4 s. Couverture confirmée : versionnement, sécurité raster, RBAC statique, multi-documents, révocation, snapshots, dimensions et absence de marques fictives.

## MySQL

Docker est disponible, mais les conteneurs existants ne sont pas réputés jetables pour cette mission. Aucun scénario en écriture n’y a été lancé. Le test permanent `document-marks-b321-mysql.integration.test.ts` couvre création, relecture, modification multi-documents, partage, changement de jeton et validations ; il ne couvre pas la relecture d’une politique sauvegardée. `document-marks-lot13-mysql.integration.test.ts` couvre livraison, concurrence et immutabilité.

## Résultats par scénario demandé

- A : démontré par test existant et code ; exécution MySQL courante réservée.
- B : écriture démontrée statiquement ; relecture jugée défaillante par preuve SQL.
- C : unicité et upsert indépendants démontrés ; chargement UI partagé démontré.
- D : partage cachet couvert ; politiques multi-agences non validées à cause du défaut GET.
- E : cinq cas de rendu PDF couverts par tests unitaires ; émission HTTP/MySQL réservée.
