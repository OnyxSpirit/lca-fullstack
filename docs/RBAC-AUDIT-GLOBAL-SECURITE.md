# Audit global RBAC — sécurité

## Verdict

Le socle multi-agences est techniquement crédible mais son adoption est minoritaire. **448/664 endpoints restent sur l’infrastructure historique**, 29 sont hybrides et 52 n’exposent pas de garde d’action directement identifiable. La migration globale n’est donc pas sécurisée de bout en bout.

## Socle et sessions

- `src/modules/rbac/agency-rbac.service.ts` résout l’agence active depuis `refresh_tokens.active_agency_id`, vérifie une session non révoquée/non expirée et calcule les rôles locaux via `user_agencies`/`user_agency_roles`.
- Le vrai Super Admin exige `roles.code='SUPER_ADMIN'`, `is_system=TRUE`, rôle actif et utilisateur actif. Les privilèges viennent de permissions explicites.
- `agency_context_version` est incrémentée au changement d’agence. Les wrappers de `agency-authorization.ts` relisent le contexte dans la transaction, verrouillent session et affectation et refusent les versions divergentes.
- Réserve : la majorité des modules continue à lire `request.rbac`, `request.user.agencyId`, `users.agency_id` ou `user_roles`; elle ne bénéficie donc pas de ces garanties fraîches.

## Scopes et isolation

- Les modules CRM, Notifications, Clients CRUD, Showroom, Devis, Proformas, Ventes et le stock véhicule principal utilisent le nouveau contexte à des degrés documentés.
- Les recherches résiduelles montrent **48 fichiers** utilisant encore les helpers historiques et seulement **13 fichiers** contenant les primitives modernes.
- `GLOBAL`, `CONCESSION`, `users.agency_id` et `user_roles` restent nombreux dans RH, Atelier, Trésorerie, Pièces, GED, Facturation et Reporting. Ils sont historiques, mais deviennent dangereux dès qu’ils permettent `1=1` ou une concession complète sur une ressource destinée à OWN/AGENCY.
- Le Client 360 est explicitement hybride : `customer.routes.ts` combine le client migré avec des prédicats de producteurs historiques (`request.rbac`). Il est classé partiel.

## Transactions et concurrence

- 52 fichiers métier contiennent une transaction ou un wrapper frais ; 59 contiennent `FOR UPDATE/FOR SHARE`. Cette présence ne prouve pas la fraîcheur des autorisations.
- Les wrappers `withCurrentAgencyAuthorization*` constituent le modèle sûr : contexte relu, session/affectation verrouillées, permission revalidée, ressource verrouillée.
- Livraisons illustre le risque courant : les écritures utilisent `transaction(...)` et des verrous métier, mais pas encore le wrapper frais. Un retrait de rôle ou changement d’agence concurrent peut donc laisser l’opération poursuivre avec une autorisation calculée avant transaction.
- Facturation, Trésorerie, Pièces, RH et Atelier comportent de nombreuses transactions métier correctes mais continuent à construire leur scope avant la transaction. Risque TOCTOU **élevé**, critique pour paiement, mouvement et transfert.

## Collisions et accessibilité

Quatre clés méthode+chemin sont déclarées deux fois :

- `POST /api/invoices` : première déclaration de validation puis handler principal ; volontaire mais fragile, à documenter comme chaîne middleware.
- `GET /api/parts` : deux handlers dans le même routeur ; le premier appelle conditionnellement `next()`. Risque de divergence et route secondaire potentiellement masquée.
- `POST /api/document-marks/stamps/:id/version` et `PATCH /api/document-marks/stamps/:id/status` : doublons entre `stampLifecycleRouter` monté avant `documentMarkRouter`. Le premier doit appeler `next()` pour rendre le second atteignable ; contrôle de flux à conserver dans les tests.

## Socket.IO

- Les sockets rejoignent `user:<id>`, `session:<sid>` et seulement `agency:<activeAgencyId>`. Les rooms `treasury:agency:*` et `hr:agency:*` exigent une permission du contexte actif.
- Un Super Admin ne rejoint pas toutes les agences automatiquement.
- Le changement d’agence appelle `refreshRealtimeSession`; une session invalide est déconnectée.
- Les helpers historiques émettent encore vers `global`, `hr:global` et `treasury:global`. Aucun socket n’est actuellement ajouté à ces rooms par `agencyRealtimeRooms`, ce qui évite une fuite mais rend les branches globales vraisemblablement inopérantes. À remplacer par une diffusion explicitement autorisée, pas par une réactivation globale.
- Les producteurs non migrés doivent être revus pour vérifier l’émission après commit et l’agence issue de la ressource persistée.

## Anomalies prioritaires

| ID | Criticité | Constat | Preuve | Action finale |
|---|---|---|---|---|
| SEC-01 | CRITIQUE | Facturation/paiements restent historiques | `billing.routes.ts`, 21 endpoints D | Migration atomique avec permissions fraîches et tests négatifs |
| SEC-02 | CRITIQUE | Trésorerie/comptabilité non migrée | 52 endpoints D, scopes concession/global | Double autorisation, séparation des tâches, contexte frais |
| SEC-03 | ÉLEVÉ | Livraisons hybrides | 20 C + 15 D ; transactions sans wrapper frais | Finaliser routeur, services, checklists et concurrence |
| SEC-04 | ÉLEVÉ | Pièces et Atelier utilisent helpers historiques | 62 + 85 endpoints D | Migrer chaîne stock/OR/réservation/transfert |
| SEC-05 | ÉLEVÉ | RH sensible largement historique | 109 D, 27 gardes à confirmer | Définir confidentialité/OWN et migrer transactions |
| SEC-06 | ÉLEVÉ | 52 routes sans garde directement détectable | Inventaire G | Confirmer helper/héritage route par route ; toute absence réelle est à corriger |
| SEC-07 | MOYEN | `leads.agency_id` reste nullable | migration 116 | Audit des NULL historiques puis contrainte additive si règle complète |
| SEC-08 | MOYEN | Émissions globales devenues sans consommateurs | `realtime/socket.ts` et producteurs HR/Trésorerie | Remplacer par ciblage explicite ou supprimer après décision reporting |
| SEC-09 | MOYEN | Quatre collisions de routes | inventaire AST | Tester ordre, intention et accessibilité ; fusionner si pertinent |

Les 52 anomalies G sont « fortement suspectées », non toutes démontrées : certains fichiers utilisent des helpers personnalisés que l’AST de route ne peut résoudre. Aucune correction n’a été effectuée pendant l’audit.
