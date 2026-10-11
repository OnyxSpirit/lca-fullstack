# ERP-11 — Scopes

Scopes observés : absence de jeton, rôle sans permission, `CONCESSION` et protection système. Le transfert inter-agences 2 → 3 est autorisé parce que les deux agences appartiennent à la même concession. Le middleware générique reste plus strict pour certains paramètres de lecture inter-agences ; chaque acteur consulte donc son agence, sans contournement SQL.
