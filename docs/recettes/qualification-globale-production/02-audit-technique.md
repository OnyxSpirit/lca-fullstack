# Audit technique

Constats initiaux vérifiés le 18 novembre 2026 : builds frontend/backend réussis, environnement vierge amorcé jusqu'à la migration 132 et proxy de qualification corrigé. Une anomalie critique RBAC a été trouvée dans la normalisation des scopes persistés : une valeur différente de `OWN` devenait implicitement `AGENCY`. Elle est désormais rejetée.

Les paginations clientes ajoutées précédemment restent adaptées aux petits référentiels, mais Achats directs et Fiscalité nécessitent encore une pagination SQL pour une qualification volumétrique favorable.
