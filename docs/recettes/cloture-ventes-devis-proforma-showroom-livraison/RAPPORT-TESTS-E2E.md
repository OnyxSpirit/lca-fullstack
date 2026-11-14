# Tests E2E

La recette locale a été reconstruite puis contrôlée sur `http://127.0.0.1:4176`, backend `3004`, le 2026-11-14. La connexion a été réalisée normalement avec un compte temporaire limité aux permissions métier de la mission ; aucun second Super Administrateur, contournement 2FA ou jeton fabriqué n’a été utilisé.

Statut : **TESTÉ pour le lot ciblé**. Parcours exécutés dans le navigateur réel : connexion, ventes (tri montant et inversion), devis (tri validité et inversion), showroom (tri durée d’attente et inversion), chargement et filtres des pro forma, chargement et filtres des livraisons.

Les parcours métier exhaustifs de création/émission/annulation/signature/livraison n’ont pas tous été rejoués dans cette session ciblée ; ils restent couverts par les suites automatisées et les rapports fonctionnels dédiés. Le compte temporaire est supprimé après recette.
