# Guide de recette manuelle

## Prérequis

Session 2FA valide, deux agences, profils facturation/encaissement/comptable/trésorerie/sans droit, comptes Treasury et mappings actifs, schémas comptables actifs. Utiliser uniquement `lca_recette`.

## Campagne

1. Exécuter A–D avec factures identifiées `AUDIT-FIN-*`; vérifier paiements, soldes, mouvements et écritures.
2. Exécuter E–G sur comptes dédiés ; comparer solde initial + entrées − sorties ± transferts.
3. Changer d’agence et de profil ; tester UI, URL directe et API 403.
4. Tester dates inversées, montants nuls/excessifs, justificatifs requis, double clic et rejeu de clé avec payload différent.
5. Télécharger factures, reçus, avoirs, pièces comptables et exports ; vérifier contenu et GED.
6. Comparer reporting/API/MySQL par période, agence et devise.

## Nettoyage

Supprimer seulement profils et fixtures réversibles. Contrepasser les écritures immuables selon le workflow métier ; ne jamais supprimer l’historique financier. Conserver une liste exacte des IDs créés.
