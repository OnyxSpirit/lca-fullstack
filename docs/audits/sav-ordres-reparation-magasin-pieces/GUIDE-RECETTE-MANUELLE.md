# Guide de recette manuelle

## Préconditions

- Utiliser `lca_recette`, jamais `concession_erp`.
- Préparer Super Admin, Responsable SAV, réceptionniste, technicien, magasinier, responsable magasin, comptabilité et sans permission, sur au moins deux agences.
- Relever les compteurs des tables métier et GED avant test.

## Parcours prioritaire

1. Connexion légitime avec 2FA puis sélection d'agence.
2. Ouvrir `/service` et vérifier Caisse, Journal, Reporting ; relever requêtes et codes HTTP.
3. Créer client/vehicule externe marqué campagne, ouvrir OR et dérouler réception → diagnostic → devis → décision → pièces → intervention → qualité → facture → paiement → restitution.
4. Depuis `/parts/repair-orders`, préparer, livrer partiellement, réceptionner, consommer et retourner.
5. Vérifier chaque mouvement MySQL et chaque document GED après actualisation.
6. Rejouer avec les profils et la seconde agence ; vérifier menus, URL directe et API directe.
7. Tester double clic/deux sessions sur réservation, livraison, encaissement et confirmation.
8. Nettoyer uniquement les identifiants de campagne et comparer les compteurs.

Conserver pour chaque étape : capture, URL, méthode, statut HTTP, corps utile, lignes MySQL avant/après et identifiant GED.

