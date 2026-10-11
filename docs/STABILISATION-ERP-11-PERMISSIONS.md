# ERP-11 — Permissions

Le rôle officiel reçoit `parts.catalog.view`, `parts.catalog.manage`, `parts.stock.view` et `parts.stock.move`, toutes au scope `CONCESSION`. La révocation temporaire de `parts.stock.move` est appliquée immédiatement à un jeton déjà émis (403), puis la permission est restaurée. Aucun scope `GLOBAL` n’est utilisé.
