# Audit RBAC

La migration 131 réduit les anciens scopes vers `AGENCY`, supprime les valeurs ambiguës puis contraint l'ENUM à `OWN|AGENCY`. La migration 132 supprime les valeurs invalides résiduelles et ajoute un `CHECK`.

Sur la base vierge de qualification : 380 attributions `AGENCY`, 2 `OWN`, 0 attribution invalide. Les résolveurs refusent désormais explicitement `GLOBAL`, `CONCESSION`, `NULL` ou toute chaîne inconnue au lieu de les promouvoir.

Les occurrences restantes de ces mots doivent être classées : plusieurs concernent légitimement l'origine commerciale d'un véhicule, le rattachement d'un compte de trésorerie ou le contexte d'audit, et non un scope RBAC. Des tests historiques restent à moderniser lorsqu'ils créent encore des acteurs avec d'anciens scopes.
