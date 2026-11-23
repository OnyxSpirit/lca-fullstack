# Autorisations des cachets en livraison

La sélection du cachet dans `delivery.routes.ts` vérifie maintenant l'existence d'une autorisation `service_stamp_role_authorizations` correspondant à un rôle actif de l'acteur : rôle système actif, ou rôle d'agence actif porté par une affectation active dans l'agence de la livraison.

Les contrôles antérieurs restent appliqués : cachet et version actifs, absence de révocation, concession, agence propriétaire ou partagée, service, type de document DELIVERY_REPORT et permissions de livraison.

Un test MySQL dédié retire l'autorisation du rôle et démontre une réponse 409 ainsi que l'absence de ligne dans `delivery_signatures`. Les fixtures LOT13 autorisent explicitement les rôles attendus au lieu de contourner le contrôle.
