# ERP-06 — Tests

## Exécution réelle

- Campagne API : 60 appels pendant le parcours initial, puis validation idempotente 27 appels, aucune erreur 5xx.
- MySQL : statuts, soldes, autorisation, checklist, documents, signatures, GED, audit, notifications et unicité contrôlés directement.
- Navigateur : liste, compteurs, cartes, détail, checklist, document, signature, notifications et correction financière vérifiés sur `127.0.0.1:4176` uniquement.
- PDF : 6 pages de PV et planning rendues/inspectées.

## Automatisation

- `npm run lint` backend : succès.
- `npm run lint` frontend : succès.
- Tests frontend ciblés Livraison : 9/9 succès.
- Tests backend ciblés : checklist, RBAC, stabilisation et rendu PV passent ; plusieurs fichiers échouent dans la suite globale historique. Le test financier isolé valide 6/7 sous-tests, avec une assertion de nom de baseline obsolète sans lien avec la correction.
- Suite globale observée : backend 179/218 ; frontend lancée globalement par le script historique, scénarios Livraison tous verts avant arrêt. Ces rouges préexistent et ne fondent pas le verdict Livraison.

Script rejouable : `scripts/stabilisation-erp-06-delivery.mjs`.
