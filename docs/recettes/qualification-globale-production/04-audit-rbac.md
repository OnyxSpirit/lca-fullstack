# Audit RBAC

La migration 131 réduit les anciens scopes vers `AGENCY`, supprime les valeurs ambiguës puis contraint l'ENUM à `OWN|AGENCY`. La migration 132 supprime les valeurs invalides résiduelles et ajoute un `CHECK`.

Sur la base vierge de qualification : 380 attributions `AGENCY`, 2 `OWN`, 0 attribution invalide. Les résolveurs refusent désormais explicitement `GLOBAL`, `CONCESSION`, `NULL` ou toute chaîne inconnue au lieu de les promouvoir.

Les occurrences restantes de ces mots doivent être classées : plusieurs concernent légitimement l'origine commerciale d'un véhicule, le rattachement d'un compte de trésorerie ou le contexte d'audit, et non un scope RBAC. Des tests historiques restent à moderniser lorsqu'ils créent encore des acteurs avec d'anciens scopes.

## Autorisation multi-étapes

L'audit transversal confirme que l'autorisation d'une action repose sur la session authentifiée, les permissions fraîches de l'agence active, le scope `OWN` ou `AGENCY`, l'état et les préconditions métier. L'identité du créateur, demandeur, préparateur ou soumetteur n'est plus un motif autonome de refus. Aucun scope `CONCESSION` ou `GLOBAL` n'a été réintroduit et `OWN` n'a pas été élargi artificiellement.
