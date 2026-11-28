# MySQL et migrations

- Moteur : MySQL 8.4.
- Schéma frais dédié : bootstrap complet 0→137 réussi.
- Migrations 135, 136 et 137 appliquées avec postconditions.
- Rejeu : niveau 137, zéro avertissement, état `VERSIONED`.
- Base recette historique : `FAILED_PARTIAL` 135/7 préservé, sans contournement ni modification.
- Contrôle d’immuabilité final : 104 migrations vérifiées contre la référence `a78a76d67d7b1e0b76d54fde80467b11c76f3cf2` jusqu’à 134, avec une exception de récupération documentée.
- Les intégrations conditionnelles de migration utilisent des schémas éphémères nommés et vérifient installation, rejeu, reprise et divergence sans modifier le moteur.
