# Sécurité et performances

Sécurité vérifiée : secrets injectés par variables, aucun secret ajouté au dépôt, 2FA non contournée, scopes DB stricts, proxy qualification séparé, volumes distincts. Le frontend publie les en-têtes `X-Frame-Options`, `Referrer-Policy` et `Permissions-Policy` existants.

Performance mesurée le 19 novembre 2026 sur Docker/MySQL 8.4 isolé, avec 121 lignes dans l'agence active et 17 hors agence : Achats directs page 10 = 4 686 octets, 0,414 s à froid ; filtre combiné/page corrigée = 4 696 octets, 0,086 s. Fiscalité page 10 = 6 405 octets, 0,230 s à froid ; filtre combiné/page corrigée = 6 422 octets, 0,019 s. Ces temps sont des observations locales reproductibles, pas des objectifs de production.

`EXPLAIN ANALYZE` : Achats directs utilise `idx_part_direct_purchase_agency` et lit 20 lignes pour `LIMIT 10 OFFSET 10` (10,2 ms observés). La page fiscale utilise un range scan sur `idx_fiscal_obligation_scope`, 30 lignes, 1,32 ms. L'agrégat fiscal filtré prend 0,963 ms ; l'optimiseur choisit un scan sur le petit jeu de 138 lignes, l'index de périmètre étant disponible pour les volumes supérieurs. Aucun N+1 n'est introduit.
