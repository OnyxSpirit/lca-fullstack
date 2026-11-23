# Audit des modules métier

## Cartographie réelle et résultat

| Module réel | Routes/pages | Contrôles inspectés | Qualification |
|---|---|---|---|
| Authentification / 2FA | `/auth`, centre sécurité | JWT, sessions, révocation, politique centrale | statique + tests; gouvernance centrale à revoir |
| RBAC / utilisateurs | `/users`, rôles, agences | affectations, délégation, agence active | statique + tests; blocage central confirmé |
| CRM / prospection | `/crm` | permissions, propriété, agence | statique + tests existants |
| Showroom / réception | `/showroom` | `OWN`, conseiller, essais | statique + tests existants |
| Clients 360 | `/customers` | accès agence, documents | statique + tests existants |
| Véhicules VN/VO | `/vehicles` | agence, transferts, origine | statique + tests existants |
| Devis / proformas / ventes | routes dédiées | transitions, permissions, coûts | statique + tests existants |
| Livraisons / retours | `/deliveries`, retours | checklist, cachets, transitions | statique + tests; dépend du défaut central/cachet |
| Facturation | `/billing` | factures, avoirs, paiements, idempotence | statique + tests existants |
| Trésorerie / budgets | `/treasury` | rattachements, réservations, rapprochement | statique + tests; `CONCESSION` est métier |
| Comptabilité / fiscal | sous-route trésorerie | écritures, clôtures, contrôles | statique + tests existants |
| SAV / atelier | `/service` | OR, devis, garantie, pièces | statique + tests existants |
| Magasin / pièces | `/parts` | stock, achats, transferts, entiers physiques | statique + tests existants |
| RH / rémunérations | `/hr` | identité, contrats, paie, documents | statique + tests existants |
| GED / documents | `/documents` | agence, archive, téléchargement | statique + tests existants |
| Notifications | `/notifications` | destinataire/agence, temps réel | statique + tests existants |
| Activité | `/activity` | permission, contexte territorial | statique + tests existants |
| Reporting | `/reports` | permissions vue/export, agrégats | statique + tests existants |
| Paramètres | `/settings` | référentiels centraux et agence | audit détaillé; non conforme |

## Workflows

Les services critiques utilisent majoritairement des permissions d'action et des transactions, avec des contrôles explicites de statut, d'idempotence et de périmètre. Les tests existants couvrent ventes, livraisons, avoirs/remboursements, paiements, retours, stock, SAV, trésorerie et RH.

Aucune séparation artificielle demandeur/approbateur transversale n'a été confirmée par cet audit. Les transitions et séparations spécifiques n'ont toutefois pas toutes été rejouées manuellement; les conclusions positives restent des validations statiques ou issues des tests existants.

## Incohérences transversales confirmées

- les pages centrales se basent sur `can(permission)`, alors que l'API ajoute souvent `isSuperAdmin`;
- les tests peuvent exercer directement l'API avec un payload plus complet que l'UI;
- la propriété métier « concession » est fréquemment assimilée à « rôle système ».

Pour les résultats détaillés et les limites par axe, voir `10-couverture-audit.md`.
