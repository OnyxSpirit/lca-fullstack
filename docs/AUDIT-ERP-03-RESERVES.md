# AUDIT-ERP-03 — Réserves

## R1 — Suite globale non verte

La validation complète du dépôt reste impossible tant que 39/217 fichiers de tests backend et 31/786 tests frontend échouent. La majorité observée relève d’assertions textuelles fragiles ou d’autres modules, mais ce bruit réduit la capacité de détection de régressions transversales.

Action recommandée : chantier séparé de remise à niveau des tests, en privilégiant les tests comportementaux aux expressions régulières sur le texte source.

## R2 — Annulation par dialogue natif

Le motif d’annulation est demandé avec `window.prompt`. La règle est appliquée et l’API valide le motif, mais l’expérience est peu accessible et difficile à automatiser.

Action recommandée : modale contrôlée avec champ obligatoire, message financier et état de soumission.

## R3 — Discipline de build avant bootstrap

Un bootstrap lancé depuis un `dist` périmé n’a appliqué que les migrations connues de cet artefact. Après build, le niveau 079 a été atteint.

Action recommandée : faire dépendre explicitement le bootstrap du build courant ou exécuter directement la source versionnée en environnement de recette.

## R4 — Règle financière après paiement

L’annulation est correctement bloquée dès qu’un paiement confirmé existe. Le traitement métier ultérieur (avoir, remboursement, régularisation) relève d’une décision financière et n’a pas été inventé pendant cet audit.

## R5 — Périmètre de validation

La recette réelle a été conduite sur une base jetable. Aucun test d’écriture n’a été exécuté contre la base persistante ni contre la production; cela respecte la mission mais ne remplace pas une recette préproduction gouvernée.
