# Recettes fonctionnelles

Validé : démarrage frontend/backend/MySQL, healthcheck via Nginx, bootstrap vierge, migrations et connexion du compte fictif. La connexion répond `two_factor_setup_required`, preuve que la politique 2FA reste active.

Les recettes CRUD complètes nécessitent l'enrôlement TOTP légitime du compte isolé puis l'automatisation navigateur. Elles restent ouvertes et aucun contournement 2FA n'a été introduit.

## Workflows sans séparation artificielle

- RH → Budgets → Demandes de rallonge : même session forte, création puis approbation et, sur une seconde demande, rejet ; statuts, décideur et audit vérifiés en MySQL.
- RH → Rémunérations : même utilisateur prépare la période, soumet, valide, engage au budget et poursuit vers réservation/paiement ; recette FIN-04 MySQL réussie.
- RH → Rémunérations prestataires : boutons Soumettre/Valider gouvernés uniquement par `hr.provider.remuneration.submit/validate` et statut ; contrat backend ciblé réussi.
- Cas négatifs : permission absente 403, agence hors scope 404/403, statut déjà décidé 409.
