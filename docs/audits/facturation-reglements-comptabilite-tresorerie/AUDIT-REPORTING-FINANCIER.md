# Audit reporting financier

Route UI `/treasury`, filtres période/agence/devise/granularité, activités paginées, indicateurs liquidité/créances/dettes/engagements et exports PDF/XLSX/CSV. Les routes exigent `reporting.view`/`reporting.export` et un contexte agence.

Automatisé : tests frontend et backend réussis. API sans jeton : 401. MySQL : les indicateurs Treasury sont vides car aucun mouvement n’existe ; les créances facturation restent disponibles. Le navigateur authentifié a confirmé les préréglages de période, dates, devise, granularité et exports sur un état vide. Une période inversée peut être saisie sans message visible immédiat ; ce point doit être rejoué sur un jeu de données avant de le qualifier d’anomalie métier.

Verdict : **CONFORME AVEC RÉSERVES**.
