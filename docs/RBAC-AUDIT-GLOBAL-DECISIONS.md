# Audit global RBAC — décisions métier

## Décisions réellement ouvertes

| ID | Sujet | Endpoints/domaines | Options recevables | Impact sans décision |
|---|---|---|---|---|
| DEC-01 | Gouvernance des référentiels (catégories, constructeurs, tarifs, checklists, types RH) | Paramètres, pièces, livraison, atelier, RH | Central véritable Super Admin ; concession ; surcharge agence | Impossible de choisir agence/central sans inventer une règle |
| DEC-02 | Autorité de destination des transferts | Véhicules, pièces, personnel, prestataires | Acceptation explicite destination ; rôle central ; workflow à deux acteurs | Risque de modification d’une agence étrangère |
| DEC-03 | Reporting transversal | Reports, dashboards, audit, activités | Agence active ; portefeuille d’agences explicite ; rôle central dédié | `GLOBAL/CONCESSION` ne peut pas être remplacé correctement |
| DEC-04 | Confidentialité RH et OWN | 136 endpoints RH | Dossier personnel ; manager hiérarchique ; RH agence ; central | Fuite de données personnelles ou blocage excessif |
| DEC-05 | Clients multi-agences | Clients, CRM, Client 360 | Client propre à une agence ; identité centrale avec relations locales ; partage explicite | Doublons ou fuite de chronologie inter-agences |
| DEC-06 | Comptes de trésorerie concession/agence | 52 endpoints | Compte strict agence ; compte concession avec mandats d’agences ; central | Mouvements financiers non autorisés ou reporting incomplet |
| DEC-07 | Cachets/signatures/marques | GED et document-marks | Personnel ; agence ; concession ; central par type documentaire | Mauvaise marque juridique sur documents |
| DEC-08 | Services de livraison et checklists | 15 endpoints historiques | Catalogue concession + application agence ; catalogue central ; surcharge locale | Migration du sous-module impossible à finaliser proprement |

## Décisions déjà établies

- Les endpoints métier migrés acceptent uniquement `OWN` ou `AGENCY`.
- Le véritable Super Admin est un rôle système actif, code exact `SUPER_ADMIN`, avec permission explicite.
- L’agence active est liée à la session côté serveur et non choisie librement par le payload.
- Une autorisation source ne vaut jamais autorisation destination.
- Le stock véhicule sans propriétaire explicite refuse OWN ; AGENCY est requis.
- En l’absence de règle destination véhicule, le transfert inter-agences reste fermé.

## Problèmes techniques, pas décisions métier

- Revalider le contexte dans la transaction, utiliser `FOR UPDATE`, émettre après commit et remplacer `users.agency_id` sont des exigences techniques.
- Les collisions de routes et tests obsolètes ne nécessitent aucun arbitrage métier.
- `leads.agency_id` nullable exige un diagnostic de données ; le choix de provenance des lignes orphelines peut, lui, nécessiter DEC-05.

## Critère de résolution

Chaque décision doit produire une règle écrite contenant : ressource, agence source, agence destination éventuelle, permission, définition OWN, acteur central éventuel, comportement lecture/écriture et cas historique. Le lot final ne doit pas extrapoler au-delà de cette règle.
