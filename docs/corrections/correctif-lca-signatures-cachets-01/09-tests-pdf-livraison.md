# Tests PDF, livraison et archivage

La suite ciblée backend/PDF a exécuté **44 tests : 44 réussis, 0 échec, 0 ignoré**, en 14,55 s. Elle couvre les quatre générateurs automatiques existants, les comportements BLOCK/ALLOW_WITHOUT_MARK, les marques absentes ou interdites, les documents multipages, les fonds et la préservation des archives.

Le procès-verbal de livraison conserve son workflow particulier. LOT13 a validé PNG/JPEG, immutabilité d'une archive, remplacement des marques, idempotence, révocation, IDOR, scopes et refus par rôle avant la réserve de concurrence décrite dans le rapport 07.

Aucun type PDF hors périmètre n'a été raccordé au moteur de politiques.
