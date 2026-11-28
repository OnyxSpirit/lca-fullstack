# Réceptions et intégrité

La source de vérité est la somme des réceptions persistées et leurs listes d'identifiants véhicule. Une modification de statut ne modifie pas les quantités reçues. Les lignes sont verrouillées pendant la réception ; un dépassement du reliquat échoue. Le rejeu idempotent restitue les mêmes identifiants.

Contrôle MySQL isolé : niveau 138, zéro `FAILED_PARTIAL`, zéro réception dont `quantity_received` diffère de `JSON_LENGTH(vehicle_ids)`. Le scénario concurrent 6+6 sur un reliquat de 6 produit un succès et un conflit.

La création de références libres réutilise la même discipline : une erreur postérieure à leur résolution annule marque, modèle, commande et fiches. Les courses d'unicité relisent le gagnant au lieu de créer un doublon.

Clôture : rejeu de réception, clé réutilisée sur une autre commande, reliquat exact, dépassement et quantité zéro sont tous qualifiés.
