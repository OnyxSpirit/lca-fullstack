# Guide de recette manuelle

## Préparation

1. Confirmer frontend 4176, backend 3004, MySQL 33321 et base `lca_recette`.
2. Noter les compteurs initiaux des tables métier et du stockage GED.
3. Créer une concession/agence ou utiliser l’agence de recette, un rôle dynamique, deux utilisateurs, un client/prospect et trois véhicules : disponible, transit, vendu.
4. Utiliser un suffixe unique et consigner tous les identifiants pour le nettoyage.

## Ventes et devis

1. Rechercher par référence exacte, partielle, casse, accents, espaces et valeur inexistante.
2. Créer une vente ; vérifier exclusion transit/vendu, prix minimum, remise, TVA et garantie.
3. Confirmer sans facture ; vérifier statut, véhicule et absence de facture/paiement artificiel.
4. Vérifier préparation bloquée ; créer/émettre/payer la facture ; vérifier déverrouillage.
5. Depuis un prospect au stade offre, créer un devis, le modifier, l’émettre, télécharger le PDF, puis transformer en pro forma.
6. Tester annulation, expiration et rejeu selon les transitions réellement exposées.

## Pro forma

1. Créer depuis client puis depuis prospect ; comparer totaux aux lignes.
2. Modifier le brouillon ; actualiser la page.
3. Émettre ; contrôler numéro, snapshots, PDF et GED.
4. Réutiliser la même clé de requête et vérifier l’absence de doublon.

## Showroom

1. Enregistrer une visite ; tester doublon de téléphone.
2. Affecter puis réaffecter ; vérifier compteurs et notifications.
3. Prendre en charge, planifier un essai, démarrer immédiatement si permis, retourner avec kilométrage.
4. Répéter avec véhicule transit/vendu et utilisateur autre agence ; attendre refus/absence.

## Livraison

1. Vérifier qu’une vente impayée n’est pas préparée sans autorisation.
2. Tester autorisation avec solde, révocation et consommation unique.
3. Planifier à une heure connue et comparer UI, API, MySQL et fuseau.
4. Démarrer, figer la checklist, valider les dix contrôles, passer qualité puis ready.
5. Tester finalisation sans consentement, avec item manquant et avec permission révoquée.
6. Finaliser, contrôler vente/véhicule/kilométrage/signature/PV/GED.
7. Rejouer la requête et tenter une seconde livraison : aucune mutation supplémentaire.

## RBAC et multi-agences

Pour chaque action critique : rôle autorisé, rôle refusé, OWN, AGENCY, autre agence, URL directe, API directe, session révoquée. Attendre respectivement succès, 403 ou 404 sans fuite d’existence.

## Nettoyage

Supprimer uniquement les données portant le suffixe de recette, dans l’ordre imposé par les clés étrangères et sans désactiver les contraintes. Supprimer les fichiers GED associés, puis comparer les compteurs finaux aux compteurs initiaux.

Pour la campagne `b0bd7910`, le nettoyage a suivi une transaction avec assertions d’identité, sans désactivation FK. Résultat vérifié : zéro compte/rôle/document suffixé, sept fichiers GED supprimés, deux schémas jetables supprimés et compteurs métier identiques au baseline.
