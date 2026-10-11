# STABILISATION-ERP-04 — Validation VIN

Règle réelle frontend/backend : `^[A-HJ-NPR-Z0-9]{17}$`, normalisation trim + majuscules et saisie frontend limitée à 17 caractères.

| Cas | Résultat |
|---|---|
| 17 caractères valides | 201 et longueur MySQL 17 |
| 16, 18 et 25 caractères | 400 |
| vide | 400 |
| espaces | 400 |
| minuscules | normalisées si caractères permis |
| lettres I/O/Q | 400 |
| doublon séquentiel | 409 `VIN_ALREADY_EXISTS` |
| doublon simultané | 201/409, une seule ligne |

MySQL contient 7 VIN REC04 distincts, tous de longueur 17. Aucun tronquage silencieux n'a été observé.

