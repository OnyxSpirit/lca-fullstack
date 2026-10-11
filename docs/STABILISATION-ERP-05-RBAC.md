# STABILISATION-ERP-05 — RBAC

| Profil | Résultat observé |
|---|---|
| Super Administrateur | workflow global exécuté ; agence initiale restaurée à #1 |
| Responsable commercial | 200, cinq ventes visibles dans la concession |
| Commercial | 200, trois ventes OWN ; détail agence 2 masqué en 404 |
| Comptable | `/sales` 403 ; création vente 403 |
| Responsable financier | `/sales` 403 |
| Responsable livraison | 200, trois ventes accessibles |
| Direction | `/sales` 403 |

Aucun rôle n'a reçu GLOBAL pour faire réussir la campagne. La réserve `vehicles.view OWN` du Commercial demeure. Le test inter-concessions reste bloqué faute de seconde concession officielle.
