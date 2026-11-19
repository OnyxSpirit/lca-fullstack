# Recettes fonctionnelles

Validé : démarrage frontend/backend/MySQL, healthcheck via Nginx, bootstrap vierge, migrations et connexion du compte fictif. La connexion répond `two_factor_setup_required`, preuve que la politique 2FA reste active.

Le 19 novembre, le compte fictif isolé a été enrôlé TOTP puis connecté dans le navigateur réel, sans contournement. Achats directs : 121 lignes, page 1/13, tailles standard et recherche exacte ramenant 1 résultat. Fiscalité : 121 lignes, page 1/13 et agrégats filtrés 7 381 000 XAF déclarés, 1 230 000 XAF réglés, 6 151 000 XAF restant. Les états de chargement, vide, erreur et les actions permissionnées sont présents.

## Workflows sans séparation artificielle

- RH → Budgets → Demandes de rallonge : même session forte, création puis approbation et, sur une seconde demande, rejet ; statuts, décideur et audit vérifiés en MySQL.
- RH → Rémunérations : même utilisateur prépare la période, soumet, valide, engage au budget et poursuit vers réservation/paiement ; recette FIN-04 MySQL réussie.
- RH → Rémunérations prestataires : boutons Soumettre/Valider gouvernés uniquement par `hr.provider.remuneration.submit/validate` et statut ; contrat backend ciblé réussi.
- Cas négatifs : permission absente 403, agence hors scope 404/403, statut déjà décidé 409.
