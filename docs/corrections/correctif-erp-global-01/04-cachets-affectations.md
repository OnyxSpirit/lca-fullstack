# Cachets et affectations multi-agences

## Modèle

`service_stamps.agency_id` demeure l'agence propriétaire. `service_stamp_agencies` contient chaque agence autorisée à utiliser la même identité et la même version binaire. Aucun fichier n'est dupliqué.

## Création

`POST /api/document-marks/stamps` ignore tout propriétaire fourni par le navigateur et utilise l'agence active authentifiée. Le cachet, son affectation propriétaire, ses autres affectations, types documentaires, version et audit sont écrits dans une transaction. Un partage supplémentaire exige `stamp.assign_agencies`.

## Consultation et administration

`GET /api/document-marks/stamps` retourne les cachets utilisables dans l'agence active, dont ceux partagés par une autre agence. Les mutations administratives utilisent le périmètre propriétaire. `PUT /api/document-marks/stamps/:id/agencies` remplace atomiquement les affectations et journalise avant/après.

## Interface

L'interface charge le référentiel réel de la concession. Elle affiche des checkboxes natives, verrouille le propriétaire, gère « Sélectionner toutes les agences » et l'état indéterminé, et réutilise le même composant lors d'une modification. Sans permission inter-agences, la création reste locale.

## Utilisation documentaire

La livraison et la résolution automatique vérifient l'affectation à l'agence, `stamp.use`, le statut, la révocation, la version active, le type documentaire et, pour un cachet départemental propriétaire, le département. Les rôles système et les rôles de l'agence active sont tous deux résolus.

## Sécurité

Connaître l'identifiant d'un cachet ne suffit jamais. Les lectures d'image/version appliquent le même périmètre. Une agence non affectée reçoit un refus ou une absence de ressource, et une agence partagée ne peut pas administrer le cachet.
