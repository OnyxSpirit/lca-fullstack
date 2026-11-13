# Rapport de non-régression RBAC

## Validations réussies

- Backend TypeScript : `npm run lint` — PASS.
- Tests ciblés initiaux : 7/7 PASS (`agency-authorization`, contexte agence, CRM, clients, devis, véhicules et régression Super Admin).
- Modules partageant le mécanisme : Billing, Pro-formas et Showroom — 3/3 PASS.
- Intégration MySQL niveau 126 : 1/1 PASS sur base jetable ; vrai Super Admin, faux Super Admin, rôles différents par agence, invalidation, bascule d'agence, quatre endpoints réels et absence de fuite inter-agences.
- Frontend production : `npm run build` — PASS.
- Frontend ciblé : 26/26 PASS sur la bascule d'agence, la purge de cache, l'isolation de session et la réhydratation du contexte.
- `git diff --check` — PASS.

## Échecs rencontrés et corrigés pendant la mission

La garde du nom de base isolée ne reconnaissait pas le suffixe français `isolee`, puis deux fixtures SQL avaient un nombre de valeurs et une valeur d'enum fiscal incorrects. Ces défauts de test ont été corrigés ; le test MySQL final passe.

## État de la suite frontend globale

La suite globale n'est pas verte dans l'arbre de travail existant. Des tests Facturation/Encaissements déjà présents échouent (avoirs/remboursements, permissions visuelles et destination de paiement), puis le lanceur termine sur `SyntaxError: Invalid or unexpected token`. Ces échecs ne touchent pas les fichiers modifiés par cette mission et le build de production réussit. Ils sont déclarés comme réserve, sans être masqués ni attribués au correctif RBAC.

## Protection des données

- Aucune écriture dans `concession_erp`.
- Aucune réinitialisation de volume Docker.
- Toutes les écritures de validation ont ciblé `lca_facturation_recette_isolee`.
- Aucun commit, push ou déploiement.

## Verdict

**RÉGRESSION CORRIGÉE AVEC RÉSERVES** : les endpoints RBAC concernés sont corrigés et validés sur MySQL réel, mais le correctif n'est pas déployé et la suite frontend globale comporte des échecs préexistants hors périmètre.
