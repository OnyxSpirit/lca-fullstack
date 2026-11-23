# Guide de recette utilisateur

## Créer une catégorie

- Chemin : Paramètres de concession → Signatures et cachets → Cachets.
- Profil : administrateur d'agence ou habilité.
- Permission : `stamp.manage` en `AGENCY`.
- Action : saisir nom/description et enregistrer.
- Attendu : création dans le référentiel de la concession, visible après rechargement et auditée.

## Créer un cachet local

- Données : image PNG/JPEG valide, nom, catégorie facultative et documents.
- Action : laisser seulement l'agence propriétaire cochée et enregistrer.
- Attendu : propriétaire égal à l'agence active ; aucun sélecteur de propriétaire ; cachet visible localement.

## Partager un cachet

- Profil : habilité à gérer et partager.
- Permissions : `stamp.manage` et `stamp.assign_agencies` en `AGENCY`.
- Action : cocher plusieurs agences ou « Sélectionner toutes les agences ».
- Attendu : état partiel correctement représenté ; propriétaire toujours coché/verrouillé ; partage persistant.

## Modifier les affectations

- Chemin : fiche du cachet → agences autorisées.
- Action : ajouter une agence, enregistrer, puis la retirer.
- Attendu : visibilité ajoutée puis retirée dans l'agence cible ; propriétaire jamais retiré ; audit avant/après.

## Utiliser depuis une agence partagée

- Profil : utilisateur avec `stamp.view` et `stamp.use`, sans `stamp.manage`.
- Action : activer l'agence partagée et émettre un document compatible.
- Attendu : cachet sélectionnable/utilisable, mais aucune action d'administration.

## Vérifier les refus

- Sans `stamp.assign_agencies` : partage refusé.
- Agence non affectée : cachet absent et usage refusé.
- Agence hors concession/inactive : affectation refusée.
- Cachet inactif/révoqué ou type incompatible : usage refusé.
- `agencyId` falsifié dans la requête de création : propriétaire reste l'agence active.

## Ressource centrale

- Profil : utilisateur ordinaire avec permission de gestion correspondante en `AGENCY`.
- Action : modifier l'identité/logo ou un référentiel central autorisé.
- Attendu : succès identique au Super Admin habilité ; utilisateur sans permission refusé.
