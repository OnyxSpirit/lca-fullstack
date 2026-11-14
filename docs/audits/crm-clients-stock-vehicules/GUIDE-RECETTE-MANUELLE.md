# Guide de recette manuelle

## Préconditions

- Utiliser exclusivement `lca-recette` : backend `3004`, frontend `4176`, MySQL `33321`.
- Préparer deux agences, un conseiller OWN, un gestionnaire AGENCY et un profil sans droits financiers.
- Employer des fixtures dédiées et supprimables; ne pas réutiliser des dossiers métier réels.

## CRM

1. Créer un prospect avec téléphone/email, puis tenter un doublon normalisé.
2. Rechercher le prospect, l’affecter, ajouter une activité et une relance.
3. Parcourir les transitions du pipeline; vérifier le motif obligatoire en perte.
4. Planifier, reprogrammer et annuler un rendez-vous.
5. Planifier un essai, démarrer, saisir le retour; vérifier kilométrage et statut.
6. Convertir en client, puis créer devis et vente; vérifier l’absence de second client.
7. Rejouer avec un conseiller OWN sur un prospect d’un autre conseiller : aucun accès.

## Client 360°

1. Ouvrir la fiche issue de la conversion et vérifier identité, origine CRM et timeline.
2. Ajouter un contact; vérifier l’affichage après rafraîchissement.
3. Vérifier opportunités, véhicule, vente/devis, facture/règlement, SAV et GED selon les données préparées.
4. Tester chaque profil : les onglets interdits doivent disparaître et les appels directs être refusés.
5. Vérifier pagination et changement de taille sur une section dépassant 7 lignes.
6. Constater et consigner l’absence d’édition générale depuis l’en-tête.

## Stock VN/VO

1. Créer un VN et un VO; tester VIN invalide, VIN doublon et champs techniques.
2. Tester recherche et filtres statut/type/marque/modèle/énergie/emplacement.
3. Passer par les statuts autorisés avec motif; tenter une transition interdite.
4. Affecter Parc/Showroom/Garage; tenter `available` sans emplacement actif.
5. Ajouter jusqu’à 8 photos, changer la principale et supprimer une photo.
6. Avec un profil sans droit financier, vérifier masquage et refus de modification des prix.
7. Vendre puis livrer; vérifier absence du stock actif et immutabilité.
8. Tester un changement d’emplacement intra-agence.
9. Tenter une autre agence : le refus actuel est attendu et correspond à `STOCK-001`.

## Critères de sortie

Aucune erreur 500, aucune fuite inter-agences, aucune donnée financière visible sans permission, aucun doublon d’identité intra-agence, aucun véhicule vendu modifiable. Joindre captures, requêtes/réponses expurgées et identifiants de fixtures au procès-verbal.
