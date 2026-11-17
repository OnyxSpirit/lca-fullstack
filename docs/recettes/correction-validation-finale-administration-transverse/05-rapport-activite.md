# 05 — Rapport Activité utilisateur

Le détail contient désormais systématiquement action technique, entité et identifiant, en plus des champs métier et changements avant/après. Les événements historiques sans territoire restent explicitement non qualifiés ; aucune agence n’a été inventée.

Le backend filtre récursivement mots de passe, jetons, secrets, cookies, hashs, OTP/TOTP, codes de récupération et clés privées, à l’écriture et à la lecture. Les tests ciblés Activité passent.
