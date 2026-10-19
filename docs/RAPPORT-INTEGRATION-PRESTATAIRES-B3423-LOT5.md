# Rapport d’intégration prestataires B.3.4.2.3 — LOT 5

## Verdict

Le LOT 5 est implémenté dans la limite des règles financières explicitement déterminées. Les rémunérations prestataires disposent d’un modèle, d’API, de permissions et d’une présentation distincts des salaires employés. Elles ne créent aucun paiement, mouvement de trésorerie, dépense budgétaire, réservation ou approbation financière. Les LOTS 6 et 7 n’ont pas été commencés.

## Fichiers modifiés

- `backend-node/database/migrations/100_provider_remunerations.sql`
- `backend-node/src/app.ts`
- `backend-node/src/modules/hr/hr-provider-remuneration.routes.ts`
- `backend-node/test/provider-remunerations-b3423-lot5.test.ts`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/modules/hr/RemunerationsAdministration.tsx`
- `frontend/src/modules/hr/ProviderRemunerationsAdministration.tsx`
- `frontend/test/provider-remunerations-b3423-lot5.test.ts`
- `docs/RAPPORT-INTEGRATION-PRESTATAIRES-B3423-LOT5.md`

## Migration et modèle

La prochaine numérotation libre était 100. La migration additive `100_provider_remunerations.sql` crée :

- `provider_remunerations`, indépendante de `salary_history`, `employee_contracts` et `hr_remunerations` ;
- `provider_remuneration_history`, historique append-only des transitions.

Chaque constatation conserve le prestataire, contrat, rattachement, agence, concession, éventuelle échéance, source, période, brut, retenue explicite, net calculé, XAF, statut, dates et acteurs. Une clé de génération unique par contrat empêche les doubles périodes, forfaits et échéances. Une échéance ne peut référencer qu’une constatation. Toutes les FK historiques utilisent `RESTRICT`.

## Modalités et exigibilité

- **Périodique** : une période mensuelle complète située dans les bornes du contrat ; le montant brut est le montant périodique contractuel. Une période partielle est refusée tant qu’aucune règle de prorata n’est décidée.
- **Forfaitaire** : génération manuelle explicite d’un forfait unique, exactement égal au montant contractuel. L’activation seule ne génère rien.
- **Échéance** : génération sur une échéance exacte, non utilisée, avec le montant et la date contractuels ; son marqueur LOT 4 est renseigné transactionnellement.
- **Retenue** : montant facultatif saisi explicitement, strictement inférieur au brut, avec justification obligatoire. Aucun taux fiscal n’est calculé.

La génération exige simultanément un contrat, un prestataire et un rattachement actifs. Un contrat suspendu, terminé ou annulé ne produit aucune nouvelle rémunération. Une constatation existante n’est jamais supprimée lors d’un changement ultérieur d’état.

## Statuts et transitions

- `DRAFT` : préparation ;
- `SUBMITTED` : soumise à décision ;
- `VALIDATED` : constatation validée, présentée comme « En attente de traitement financier » ;
- `REJECTED` : rejetée et resoumissible ;
- `CANCELLED` : annulée avant validation.

La validation exige un acteur distinct du préparateur et du soumetteur. Les transitions utilisent des transactions, des verrous `FOR UPDATE`, l’historique dédié et l’audit central. Aucun statut `PAID` n’est introduit.

## Routes et permissions

Routes : liste, contrats éligibles, historique, préparation, soumission, validation, rejet et annulation sous `/api/hr/provider-remunerations`.

Permissions dédiées :

- `hr.provider.remuneration.view` ;
- `hr.provider.remuneration.prepare` ;
- `hr.provider.remuneration.submit` ;
- `hr.provider.remuneration.validate`.

Les scopes `AGENCY`, `CONCESSION` et `GLOBAL` utilisent l’agence du contrat. `OWN` est explicitement refusé. Les permissions salariées n’accordent aucun accès implicite aux prestations et réciproquement.

## Intégration dans RH

L’espace existant devient « Salaires & rémunérations » et présente deux vues explicites : « Salaires des employés » et « Rémunérations des prestataires ». La vue salariée et ses flux financiers existants restent inchangés. La vue prestataire affiche l’identité, l’agence, le contrat, la prestation, la période ou échéance, le brut, la retenue, le net, le statut et la date de constatation.

## Garanties d’intégrité

Les protections reposent sur les contraintes SQL et les transactions backend, pas sur le frontend : unicités de génération, unicité de l’échéance, FK, contrôles XAF/brut/retenue/net, verrouillage du contrat et de l’échéance, permissions territoriales, séparation des acteurs et transitions strictes. Le code LOT 5 ne référence aucune table de paie salariée ni aucun service financier.

## Tests réellement exécutés

- Backend ciblé LOTS 4/4.1/5 : **14 tests PASS**.
- Frontend ciblé LOTS 4/4.1/5 : **3 fichiers PASS**.
- Lint TypeScript backend : **PASS**.
- Lint TypeScript frontend : **PASS**.
- Build backend : **PASS**.
- Build frontend : **PASS**, 2 514 modules transformés.
- MySQL 8.4.11 isolé et sans volume : baseline, seed, migrations 096 à 100 : **PASS**.
- MySQL réel : création d’une constatation périodique à 1 500 000 XAF, retenue 50 000 XAF, net généré 1 450 000 XAF : **PASS**.
- MySQL réel : tentative de double génération de la même période : **rejetée par `uk_provider_rem_generation` comme attendu**.
- Le conteneur temporaire a été supprimé après les essais.

Les tests ciblés vérifient aussi la séparation salariés/prestataires, les trois modalités, les scopes et permissions, les verrous, l’historique, l’absence de paiement/dépense et les non-régressions statiques LOT 4. Ils ne constituent pas une recette HTTP/authentifiée ou navigateur complète.

## Décisions métier bloquantes et réserves

Trois politiques restent volontairement non inventées :

1. prorata ou paiement intégral d’une période périodique partielle ;
2. événements d’exigibilité forfaitaire plus fins qu’une constatation manuelle validée ;
3. taux, assiette ou automatisation fiscale des retenues.

En conséquence, les périodes partielles sont bloquées, le forfait est unique et intégral, et les retenues restent des montants justifiés. Une recette HTTP réelle multiutilisateur, un test de concurrence à deux connexions et une recette navigateur restent à exécuter dans un environnement applicatif isolé autorisé. Aucune infrastructure métier n’a été modifiée pour les simuler.

## Prérequis du LOT 6

Avant tout LOT 6 : autoriser et appliquer séquentiellement 096 à 100 dans l’environnement cible, attribuer les permissions métier, recetter les parcours HTTP/navigateur et décider les règles partielles/forfaitaires/fiscales si elles doivent évoluer. Le LOT 6 devra relier une constatation `VALIDATED` au circuit financier sans transformer rétroactivement les données contractuelles ou salariales.
