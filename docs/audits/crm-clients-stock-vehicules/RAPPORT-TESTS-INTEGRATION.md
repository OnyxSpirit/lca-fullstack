# Rapport des tests d’intégration

## Résultats

| Niveau | Commande / périmètre | Résultat |
|---|---|---|
| Backend Node ciblé | CRM, clients, showroom, stock, véhicules, ventes/RBAC | 523 tests; 505 succès; 0 échec; 18 ignorés |
| Frontend ciblé | CRM, clients, showroom, stock, véhicules, RBAC | 43 succès; 0 échec |
| MySQL 8.4 réel | identité client, normalisation, conflits et concurrence | Succès; schéma temporaire supprimé |
| Infrastructure | Docker Compose recette | backend et MySQL sains; `/api/health` = `ok` |
| Métadonnées DB | MySQL 8.4.11 / migrations | 56 migrations; 0 étape non appliquée; 8/8 tables cœur présentes |

## Scénarios transversaux couverts

- prospect → opportunité → client, avec réutilisation d’identité;
- prospect / visite showroom → essai routier;
- opportunité → devis / vente;
- vente → verrouillage et changement de visibilité du véhicule;
- client → véhicules, ventes, factures, paiements, SAV et GED;
- filtrage OWN/AGENCY et changement de contexte d’agence;
- courses concurrentes sur création d’identité et mutations verrouillées.

## Limites conscientes

Les tests conditionnels qui écrivent directement dans la base choisie sans nettoyage n’ont pas été lancés sur `lca_recette`. Leur activation aurait violé le mandat de conservation des données existantes. Le contrôle HTTP est majoritairement assuré par Supertest avec serveur réel en mémoire; l’état du backend conteneurisé a été vérifié séparément.

## Reproductibilité

Toujours utiliser `docker-compose.recette.yml` avec `.env.recette`. Ne jamais lancer les tests MySQL opt-in sans vérifier leur stratégie de nettoyage. Pour les scénarios mutables, préférer un schéma aléatoire créé puis supprimé.
