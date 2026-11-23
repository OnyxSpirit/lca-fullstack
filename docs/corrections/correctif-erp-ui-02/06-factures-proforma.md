# Factures pro forma

Le filtre « Tous les statuts » emploie la chaîne vide. Le sérialiseur commun omet cette valeur, tandis que la requête SQL utilise la condition `(?='' OR p.status=?)`. Pagination, agence et scopes `OWN`/`AGENCY` restent appliqués.

La combinaison recherche/statut/tri est portée dans la clé React Query, ce qui évite la réutilisation d’un cache d’un autre filtre.
