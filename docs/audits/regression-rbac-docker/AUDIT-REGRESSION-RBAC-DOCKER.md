# Audit de la régression RBAC après reconstruction Docker

## Synthèse

La régression est causée par une divergence entre le scope persistant du rôle système `SUPER_ADMIN` (`GLOBAL`) et le contrat des modules métier migrés, qui n'acceptent que `OWN` ou `AGENCY`. Le middleware validait correctement la permission, mais la normalisation `GLOBAL` vers `AGENCY` n'était écrite que dans le contexte RBAC historique. Les listes CRM, clients, véhicules et devis lisent le contexte canonique `agencyRbac` et recevaient donc encore `GLOBAL`.

La reconstruction Docker a rendu le défaut visible, mais n'en est pas la cause : les permissions, rôles et migrations sont présents dans les bases inspectées.

## Symptômes et permissions exactes

| Écran | Endpoint | Permission | Erreur observée | Cause |
|---|---|---|---|---|
| Prospects | `GET /api/leads` | `crm.prospect.view` | chargement impossible | prédicat métier alimenté par `GLOBAL` |
| Clients | `GET /api/customers` | `customers.view` | scope manquant | même divergence |
| Stock | `GET /api/vehicles` | `vehicles.view` | scope `AGENCY` requis | même divergence |
| Devis | `GET /api/quotations` | `quotations.view` | scope `OWN/AGENCY` manquant | même divergence |

Le code et la base utilisent bien `vehicles.view` et `quotations.view` (pluriel), malgré les variantes au singulier présentes dans certains messages métier.

## Docker, MySQL et migrations

- Conteneurs applicatifs constatés : frontend, backend et MySQL de l'environnement courant, plus une recette et une base MySQL isolée.
- Base protégée `concession_erp`, inspection strictement en lecture : niveau de migration 126, rôle système `SUPER_ADMIN` actif, 375 permissions actives et 375 attributions ; les permissions concernées existent avec le scope `GLOBAL` ; trois agences actives.
- Base recette inspectée en lecture : niveau 111, rôle système complet (329/329), mêmes permissions métier en `GLOBAL`, quatre agences.
- Base jetable utilisée pour les écritures : `lca_facturation_recette_isolee`, niveau 126.
- Aucun seed manquant, aucune migration RBAC absente et aucune attribution arbitraire à corriger.

## Chronologie pertinente

Les changements Git pertinents sont notamment `6823012` (audit RBAC multi-agences), `fba3576` (stabilisation backend), puis `b5cc574` (intégrations et CRM). Les modules métier ont progressivement adopté `agencyRbac` et les scopes locaux stricts. Le défaut est une incompatibilité centrale de normalisation, pas une conséquence démontrée des travaux récents de facturation.

## Super Administrateur et agence active

Le vrai Super Admin reste défini par le rôle système actif `SUPER_ADMIN` et par ses permissions persistées. Il conserve l'accès central global, mais exerce les permissions métier dans l'agence active. Il peut basculer d'agence ; les données métier restent filtrées sur cette agence. Un rôle seulement nommé comme un Super Admin ne bénéficie pas de ce comportement.

## Étendue du mécanisme partagé

La même lecture du scope canonique existe dans CRM, Clients, Véhicules, Devis, Pro-formas, Showroom, Livraisons, Retours véhicule et certaines intersections de scopes. La correction est centrale dans l'autorisation métier ; aucune exception générale n'a été ajoutée aux endpoints. Les modules volontairement centraux (administration, comptabilité consolidée, sécurité) conservent leurs règles `CONCESSION/GLOBAL`.

## Conclusion

Cause confirmée : normalisation incomplète du scope effectif du vrai Super Admin entre les deux contextes RBAC. Docker, MySQL, les migrations et les seeds ne sont pas la cause. Une erreur de collation vue séparément dans un worker comptable est hors de cette chaîne d'autorisation et n'explique aucun des quatre écrans.
