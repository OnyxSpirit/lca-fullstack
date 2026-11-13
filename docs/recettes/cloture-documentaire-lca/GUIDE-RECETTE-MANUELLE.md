# Guide de recette manuelle

## Accès déjà raccordés

1. CRM > ouvrir un prospect > **Imprimer la fiche** (`crm.prospect.view`). Vérifier identité, NIU, commercial et absence de données d’une autre agence.
2. Clients > ouvrir un client > **Fiche PDF** (`customers.view`). Vérifier coordonnées, identité légale et scope OWN.
3. Stock véhicules > **Inventaire PDF** (`vehicles.view`). Appliquer un filtre état puis contrôler qu’il est repris.
4. SAV > ouvrir un OR > **Diagnostic**, **Contrôle qualité**, **Restitution** (`service.documents.view` côté UI, `service.order.view` côté API). Les deux derniers exigent un enregistrement métier existant; un 404 est attendu sinon.
5. Pièces > Demandes Atelier > ouvrir une demande > **Bon PDF** (`parts.internal_request.view`).
6. Pièces > **Inventaire PDF** (`parts.inventory.view`).

## Recette directe des autres endpoints

Depuis une session authentifiée dans l’agence de test, appeler les endpoints de la matrice finale avec un identifiant appartenant à l’agence. Attendre HTTP 200, `Content-Type: application/pdf`, un fichier ouvrable, le pied LCA avec NIU et aucune mutation de statut. Refaire avec un utilisateur sans permission (403) et un objet d’une autre agence (404/403).

## GED

Les instantanés d’inventaire ne doivent pas apparaître en GED. Pour les événements finalisés, la recette GED est bloquée tant que l’archivage immuable n’est pas raccordé; ne pas valider ce point.

## Erreurs attendues

- identifiant invalide : 400;
- permission absente : 403;
- objet absent/hors scope ou état final requis absent : 404;
- contrôle qualité/restitution inexistants : 404 sans création automatique.
