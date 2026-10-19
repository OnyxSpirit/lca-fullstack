# Rapport LOT B.3.4.8 — Notifications, auteur et contexte territorial

Date de qualification : 19 octobre 2026.

## Verdict

**CORRIGÉ ET QUALIFIÉ** sur le périmètre B.3.4.8. Les nouvelles notifications figent l’auteur et l’agence opérationnelle au moment de l’événement. Ces snapshots sont uniquement informatifs : ils ne participent ni à la sélection des destinataires, ni aux prédicats RBAC, ni aux mutations de lecture/archivage/suppression.

La migration `094_notification_historical_context.sql` est additive. Aucun backfill n’est exécuté : les anciennes lignes restent `UNKNOWN` et l’interface affiche explicitement l’indisponibilité du contexte historique.

## Cause et audit de l’existant

Avant correction, `notifications` ne stockait que le destinataire, le contenu et la ressource. `notifyPermissions` recevait une agence uniquement pour sélectionner les destinataires ; elle n’était pas persistée. Aucun auteur n’était enregistré. La consultation joignait l’agence **courante du destinataire** pour appliquer les scopes, sans jointure sur l’auteur. Une mutation ultérieure du nom ou du rattachement de l’auteur rendait donc impossible la restitution fidèle du contexte d’origine.

Le temps réel utilise une room privée `user:<id>`. Le JWT, la session persistée, l’utilisateur actif, l’agence courante et les permissions sont relus à la connexion. Le payload `notifications:created` a été réduit à `{id}` : le client invalide ensuite ses requêtes HTTP autorisées.

## Inventaire des producteurs

| Module | Événement | Auteur | Agence d’origine | Destinataire | Persistance/diffusion | Risque corrigé |
|---|---|---|---|---|---|---|
| CRM | affectation, étape, rendez-vous, activité | utilisateur de la requête | prospect/opportunité | affecté + habilités | service central + room privée | auteur/agence absents |
| Ventes / Devis | création et transitions | utilisateur de la requête | vente/opportunité | habilités scopés | service central après transaction | contexte non figé |
| Véhicules | création, statut, transfert | utilisateur de la requête | véhicule/agence cible métier | habilités scopés | service central après transaction | contexte non figé |
| Showroom | affectation, prise en charge, essai, conversion | utilisateur de la requête | visite | utilisateur affecté | notification nominative privée | auteur absent |
| Atelier | création et transitions OR | utilisateur de la requête | OR | habilités atelier | service central après transaction | auteur/agence absents |
| Livraisons | planification, report, remise | utilisateur de la requête | livraison | habilités livraison | service central après transaction | auteur/agence absents |
| Facturation | paiement, facture soldée | utilisateur de la requête | facture | habilités finance | service central après transaction | auteur/agence absents |
| RH | annulation dépense, décision prime | utilisateur de la requête | dépense/employé | habilités ou employé | service central après transaction | auteur/agence absents |
| Sécurité 2FA | activation, récupération, politique, révocation | utilisateur ou administrateur réel | non applicable | compte concerné | notification nominative privée | auteur absent |

Les opérations inventoriées sont déclenchées par une action humaine ou une transition métier demandée par un utilisateur. Le contrat accepte aussi explicitement `actorType: 'system'` pour un futur traitement automatique ; aucun utilisateur fictif n’est créé. Une notification globale nouvelle affiche « Contexte territorial non applicable ».

## Correction

La table reçoit :

- `actor_type` (`HUMAN`, `SYSTEM`, `UNKNOWN`) ;
- `actor_user_id` nullable, avec FK `ON DELETE SET NULL` ;
- `actor_display_name_snapshot` ;
- `operation_agency_id` nullable, avec FK `ON DELETE SET NULL` ;
- `operation_agency_name_snapshot`.

Le service résout le nom de l’auteur et celui de l’agence depuis MySQL avant l’insertion. Un auteur humain absent, une agence inconnue ou un couple système/utilisateur incohérent est refusé ; aucune divergence n’est masquée. `notifyPermissions` continue d’utiliser `agencyId` pour les mêmes scopes et le transmet séparément comme agence opérationnelle. Les producteurs nominatifs fournissent explicitement leur ressource territoriale.

L’API retourne uniquement les snapshots persistés. Elle ne rejoint jamais le nom courant de l’auteur ou de l’agence pour les reconstruire. L’interface présente une ligne discrète « Auteur · Agence » et distingue humain, système, contexte non applicable et historique indisponible.

## RBAC, confidentialité et transactions

- Les scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL` restent calculés sur le destinataire et ses permissions courantes.
- Les snapshots ne figurent dans aucun prédicat d’autorisation.
- Les mutations restent limitées à `user_id = utilisateur authentifié`.
- Les destinataires, exclusions et clés d’idempotence restent inchangés.
- Les notifications métier restent appelées après la transaction validée ; un rollback métier ne produit donc pas de notification.
- Le Socket.IO privé transporte uniquement l’identifiant servant de signal de rafraîchissement.

## Migration et qualification MySQL 8.4

La migration 094 a été exécutée sur un conteneur MySQL 8.4 temporaire, monté sur `tmpfs`, sans volume. Le conteneur a ensuite été supprimé.

Résultats :

- ligne historique et message conservés ;
- ancienne ligne classée `UNKNOWN`, sans auteur/agence inventés ;
- insertion d’une notification humaine avec snapshots : PASS ;
- renommage ultérieur de l’utilisateur et de l’agence sans modification des snapshots : PASS ;
- index et deux clés étrangères : PASS ;
- postcondition complète : PASS ;
- définition de colonne divergente détectée `AMBIGUOUS` : PASS.

Le runner de migrations vérifie désormais aussi le type et la nullabilité de chaque colonne ajoutée avant de considérer un DDL repris comme satisfait. Une présence nominale avec une définition incompatible est donc refusée.

## Tests

- Backend lint : PASS.
- Backend build : PASS.
- Test MySQL 8.4 `MIG094` : 1 PASS.
- Tests ciblés B.3.4.8 backend : 4 PASS.
- Tests ciblés notifications historiques frontend : 2 PASS.
- Tests notifications/RBAC existants : PASS.
- Campagne backend complète : 1 955 tests ; après adaptation du test RH concerné, deux réserves préexistantes et hors périmètre demeurent dans les tests Stock/Garage (`VEH-LOC` et `S01-S20`, attentes antérieures à l’ajout du type `GARAGE`).
- Campagne frontend complète : 913 PASS, 0 FAIL ; lint PASS ; build PASS.

## Fichiers du lot

- `backend-node/database/migrations/094_notification_historical_context.sql`
- `backend-node/database/baseline/001_initial_schema.sql`
- `backend-node/src/scripts/mysql-migration-runner.ts`
- service et routes Notifications ; producteurs CRM, Ventes, Devis, Véhicules, Showroom, Atelier, Livraisons, Facturation, RH et 2FA ;
- `frontend/src/types/notifications.ts`
- `frontend/src/modules/notifications/NotificationsPage.tsx`
- tests backend/frontend B.3.4.8 et adaptation du test RH de non-régression.

## Réserves et exploitation

La migration 094 n’a pas été appliquée à une base métier et aucun conteneur applicatif n’a été reconstruit ou redémarré. Le code applicatif exige les nouvelles colonnes : appliquer la migration par le gestionnaire officiel avant de démarrer cette version. Ne pas backfiller les anciennes notifications. Aucune archive officielle, donnée métier, branche Git ou environnement distant n’a été modifié.
