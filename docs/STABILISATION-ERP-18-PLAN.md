# ERP-18 — Plan de recette finale

Date : 2026-10-11. Environnement exclusif : `lca-recette` (frontend 4176, API 3004, MySQL 33321).

## Ordre d'exécution

1. figer les références Git, Docker, données et sauvegardes ERP-17 ;
2. relire les preuves ERP-03/04/05/10/11/14/15/16/17 ;
3. inventorier comptes, rôles, permissions et scopes sans lire les secrets ;
4. tester les connexions officielles et accès API en lecture pour les profils disponibles ;
5. contrôler dans le navigateur la session accessible et les anomalies historiques ;
6. vérifier Pièces par permissions opposées, API, code déployé et tests ;
7. rejouer seulement les tests ciblés Stock, Vente, Showroom et GED ;
8. consolider les réserves et le niveau de préparation à la livraison.

## Garde-fous

Aucune reconstruction Docker, mutation métier, réinitialisation de mot de passe, modification RBAC, migration, seed, suppression, restauration, opération Git destructive, commit, push ou déploiement. Toute validation navigateur exige une session réellement ouverte ; une preuve API ou statique n'est pas requalifiée en preuve navigateur.

## Critères de sortie

- aucune altération des six conteneurs, volumes, réseaux, ports et données historiques ;
- matrice distinguant navigateur, API, audit statique et tests automatisés ;
- anomalie P0/P1 non résolue explicitement portée au bilan ;
- verdict `PRÊT POUR LIVRAISON`, `PRÊT SOUS RÉSERVES` ou `NON PRÊT POUR LIVRAISON` argumenté.
