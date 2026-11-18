# Sécurité et performances

Sécurité vérifiée : secrets injectés par variables, aucun secret ajouté au dépôt, 2FA non contournée, scopes DB stricts, proxy qualification séparé, volumes distincts. Le frontend publie les en-têtes `X-Frame-Options`, `Referrer-Policy` et `Permissions-Policy` existants.

Performance : les collections croissantes doivent employer pagination SQL et tri stable. Les paginations clientes Achats directs/Fiscalité constituent une réserve. Aucun benchmark complet n'est encore disponible.
