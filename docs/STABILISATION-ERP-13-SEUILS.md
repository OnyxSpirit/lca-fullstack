# STABILISATION-ERP-13 — Seuils

Le seuil minimum est modifiable séparément de la quantité courante et son changement est audité. La condition métier est inclusive : une quantité inférieure ou égale au seuil est signalée.

Recette : quantité `0`, seuil `1`, `below_minimum=true` dans l’API et « 1 sous seuil » dans l’interface.
