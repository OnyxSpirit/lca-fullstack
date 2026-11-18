# Tests volumétriques

Le schéma isolé a été préparé et les tests d'intégration concurrents ont réellement exercé MySQL 8.4. En revanche, la génération complète du jeu minimum (125 clients, prospects, véhicules et factures, puis 150 à 250 mouvements par domaine) n'a pas été achevée avant le verdict.

Aucune mesure de latence, taille JSON ou plan `EXPLAIN` n'est donc inventée. La réserve volumétrique reste ouverte pour toutes les surfaces marquées `ANOMALIE RÉSIDUELLE`. Les contrats déjà paginés continuent d'être couverts par les tests de bornes 10/20/50/100 des campagnes précédentes.

