# Tests ventes

Les parcours de lecture, pagination, synthèse financière et articulation vente-facture-livraison ont été couverts par les tests existants et les suites de concurrence livraison. Aucun double effet financier n’a été observé.

Le tri serveur accepte uniquement date, référence, client, montant et statut ; le sens est normalisé en ASC/DESC et l’identifiant fournit l’ordre secondaire. Contrat automatisé : 1/1. Validation navigateur réel : tri par montant puis inversion exécutés avec succès le 2026-11-14.
