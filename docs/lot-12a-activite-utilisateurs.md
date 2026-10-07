# Lot 12A — Activité utilisateurs et audit opérationnel

## Source et modèle

`audit_logs` reste l’unique source autoritative. La migration 068 ajoute uniquement le contexte figé `agency_id` / `concession_id`, quatre index de consultation et `activity.view`; aucune table concurrente et aucun événement historique artificiel ne sont créés. L’acteur est toujours `users.id`. La ressource (employé, vente, facture, etc.) reste un sujet distinct.

Les comptes ne sont pas supprimés physiquement par le module Users. Une désactivation conserve donc l’identité actuelle et tout l’historique. La FK historique `ON DELETE SET NULL` reste un dernier recours. L’interface ne présente jamais le rôle actuel comme le rôle historique : aucun snapshot de rôle n’existe. Il n’existe aucune politique automatique de rétention et le lot n’en invente pas.

## Schéma audité

Avant 068 : PK `id`, acteur `user_id`, `module`, `entity_type`, `entity_id`, `action`, JSON `old_values` / `new_values`, IP, user-agent et `created_at`; index ressource et `(user_id,created_at)`; FK acteur `SET NULL`. Il manquait le contexte de ressource, un index de flux récent et les index de scope. Après 068 : contexte nullable et figé, index `(created_at,id)`, `(agency_id,created_at,id)`, `(concession_id,created_at,id)` et `(module,created_at,id)`.

## Couverture des producteurs

| Domaine | Événements constatés | Acteur / ressource | Contexte futur | Couverture |
|---|---|---|---|---|
| Auth | changements/réinitialisations de mot de passe via Users; pas de login/logout/refresh | User / User | ressource User | Partielle, acceptable 12A |
| Users / RBAC | création, modification, statut, rôles, permissions | User / User ou rôle | ressource User; rôles centraux sans agence | Oui |
| CRM / Clients | activités CRM dédiées mais pas toutes recopiées dans `audit_logs` | User / lead-client | variable | Partielle, utile à compléter ultérieurement |
| Véhicules | modification véhicule | User / véhicule | producteur historique non converti | Partielle |
| Ventes / devis | cycle vente et devis | User / vente-devis | vente figée | Oui pour Vente |
| Billing | factures, paiements, avoirs, remboursements | User / objet financier | producteur historique non converti | Oui fonctionnel, contexte à normaliser |
| Treasury / Budget | comptes, catégories, opérations, transferts, reversals, flux automatiques | User / écriture | ressource Treasury figée | Oui |
| Atelier / garantie | actions OR/garantie significatives | User / OR-garantie | producteur historique non converti | Partielle |
| Pièces | opérations majeures présentes dans les workflows mais couverture audit inégale | User / pièce-mouvement | variable | Partielle |
| Livraison / retour | transitions, autorisations, livraison, retour | User / livraison-retour | ressource figée | Oui |
| GED | dépôt/archivage | User / document | producteur historique; détail masqué | Oui |
| Showroom | journal métier propre, peu d’`audit_logs` | User / visite-essai | variable | Partielle, utile |
| RH général | mutations RH | User / employé | variable; détail masqué | Partielle |
| Contrats | création, activation, fin, annulation | User / contrat employé | ressource figée | Oui |
| Congés | demande, décision, annulation | User / congé employé | snapshot ressource | Oui |
| Primes | brouillon, soumission, décision, annulation | User / prime employé | snapshot ressource | Oui |
| Settings | paramètres, constructeurs, barèmes | User / paramètre | événement central possible | Oui |
| Notifications | archive/suppression | User / notification | producteur historique | Oui |

Les manques classés « partiels » ne sont pas backfillés. Critique pour 12A : les familles représentatives demandées utilisent désormais l’écrivain central. Utile ultérieurement : homogénéiser Billing, véhicules, atelier, pièces, CRM et Showroom. Non nécessaire : navigation, clics, lecture passive, frappe, scroll.

## Scope et événements centraux

- `OWN`: `audit_logs.user_id = currentUser.id`, indépendamment du sujet métier.
- `AGENCY`: `audit_logs.agency_id = agence courante`.
- `CONCESSION`: `audit_logs.concession_id = concession courante`.
- `GLOBAL`: tous les événements.

Un événement central possède `concession_id` et `agency_id = NULL`: il est visible en CONCESSION et GLOBAL, jamais en AGENCY. Une ancienne ligne sans contexte est visible en OWN (par son acteur) ou GLOBAL seulement. Aucun contexte historique n’est déduit de l’agence actuelle du User.

## Confidentialité

L’écrivain central supprime récursivement avant persistance les clés password/passwd, token, secret, authorization, credential, cookie et hash. L’API répète cette sanitation pour l’historique. Les détails des ressources `employee`, `employee_contract`, `employee_leave`, `employee_bonus` et `document` sont entièrement masqués. Aucun contenu GED ni user-agent n’est envoyé. L’IP existante est affichable dans le détail autorisé sans enrichissement/fingerprinting supplémentaire.

Les événements auth login/logout/refresh ne sont pas ajoutés : ils exigeraient une politique dédiée pour les échecs sans acteur authentifié et ne bloquent pas la vue opérationnelle. Les changements de mot de passe et désactivations existants sont audités sans credential.

## API et interface

`GET /api/activity` fournit page/pageSize (maximum 100), période, acteur, module, catégorie dérivée, agence, type de ressource et recherche. Tri stable `created_at DESC, id DESC`. La requête utilise des JOIN bornés, aucun N+1, et conserve une ligne dont la ressource a disparu. `GET /api/activity/filters` dérive modules et acteurs (actifs ou inactifs ayant un historique) du journal visible.

La page « Activité utilisateurs » se trouve dans « Système & Concession », protégée par `activity.view`. Elle expose les filtres, reset, pagination, état vide et détail filtré. La gestion Users et la fiche Employee liée ouvrent cette page avec `userId`; aucun lien fictif n’existe pour un Employee sans User. Aucun export, score de productivité, temps de travail déduit ou BI 12B n’est inclus.

## Performance et limites

Les index 068 couvrent flux récent, scopes et module/date; l’index historique acteur/date couvre OWN. Une catégorie d’action est dérivée à la lecture et peut nécessiter un filtrage CPU; elle reste paginée mais n’a pas d’index spéculatif. Les identifiants métiers restent actuellement affichés sous forme `entity_type #id` afin d’éviter une union/N+1 transversale. Une future normalisation des producteurs partiels doit utiliser `writeAudit`, jamais un trigger ou un second journal.
