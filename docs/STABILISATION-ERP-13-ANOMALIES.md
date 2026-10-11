# STABILISATION-ERP-13 — Anomalies

## Corrigée

Les agrégats RH additionnaient les dépenses brouillon, soumises ou rejetées. Impact observé : 150 000 XAF consommés et −50 000 XAF restants, alors que seuls 90 000 XAF étaient approuvés. Le backend filtre désormais `approval_status='approved'` dans les quatre agrégations concernées.

## Ouverte

Absence d’une deuxième concession réelle pour éprouver l’isolation de bout en bout. Aucun défaut fonctionnel prouvé sur ce point.
