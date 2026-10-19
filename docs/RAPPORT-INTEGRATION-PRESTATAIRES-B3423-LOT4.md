# Rapport d’intégration prestataires B.3.4.2.3 — LOT 4

## Verdict

Le socle des contrats prestataires et son intégration à la GED centrale sont implémentés et qualifiés techniquement. La migration 099 est additive et a été validée sur MySQL 8.4 isolé après les migrations 096 à 098. Aucune migration n’a été exécutée sur la base métier, aucun service métier n’a été arrêté ou reconstruit et aucun flux financier n’a été créé.

Réserve fonctionnelle : l’interface permet la création, la consultation, les transitions, l’historique et la GED. La modification d’un brouillon est disponible par l’API sécurisée, mais son formulaire graphique dédié reste à finaliser avant de considérer tout le parcours UI de modification comme entièrement validé.

## Fichiers modifiés

- `backend-node/database/migrations/099_provider_contracts_and_ged.sql`
- `backend-node/src/app.ts`
- `backend-node/src/modules/hr/hr-provider-contract.routes.ts`
- `backend-node/src/modules/documents/document-access.ts`
- `backend-node/src/modules/documents/document.routes.ts`
- `backend-node/test/provider-contracts-b3423-lot4.test.ts`
- `frontend/src/modules/hr/ProviderContractsSection.tsx`
- `frontend/src/modules/hr/ProviderProfileModal.tsx`
- `frontend/src/modules/documents/DocumentsGedPage.tsx`
- `frontend/src/modules/documents/documentPolicy.ts`
- `frontend/src/types/documents.ts`
- `frontend/test/provider-contracts-b3423-lot4.test.ts`

## Schéma et migration

La migration 099 crée exclusivement :

- `provider_contracts`, lié au profil prestataire, au rattachement, à l’agence et à la concession ;
- `provider_contract_installments`, avec ordre unique, montant positif et marqueurs réservés à une consommation future ;
- `provider_contract_document_requirements`, typé par `document_types` et étape `ACTIVATION` ou `PAYMENT` ;
- `provider_contract_history`, historique métier append-only.

Les modes `PERIODIC`, `FIXED` et `INSTALLMENTS`, la devise XAF, les statuts `DRAFT`, `ACTIVE`, `SUSPENDED`, `ENDED`, `CANCELLED`, les dates et acteurs d’audit sont contraints par le schéma. Les FK utilisent `RESTRICT` pour préserver les historiques. `employee_contracts` n’est ni modifiée ni réutilisée.

## Règles métier et concurrence

- Les contrats simultanés sont admis lorsque leur objet diffère.
- Un doublon manifeste sur rattachement, objet, période, mode et montant est refusé.
- Une référence est unique dans la concession.
- Le total des échéances doit égaler le montant contractuel et rester dans la période du contrat.
- Un échéancier déjà marqué comme utilisé ne peut plus être remplacé.
- Seul un brouillon est modifiable ; les engagements actifs exigent un futur mécanisme d’avenant.
- Les transitions sont verrouillées en transaction avec `FOR UPDATE`.
- Une activation est refusée si le prestataire ou le rattachement est suspendu, si le contrat est expiré, si l’échéancier est incohérent ou si un document obligatoire à l’activation manque.
- La suspension, la terminaison et l’annulation exigent un motif et alimentent l’historique ainsi que l’audit central.
- Aucun contrat ne crée une dette, une dépense, un paiement ou une rémunération.

## RBAC et territoire

Deux permissions dédiées sont ajoutées : `hr.provider.contract.view` et `hr.provider.contract.manage`. Elles sont attribuées globalement au seul rôle système SUPER_ADMIN par la migration ; les autres attributions restent administrables dynamiquement.

Les scopes `GLOBAL`, `CONCESSION` et `AGENCY` sont évalués sur l’agence/concession du rattachement contractuel. `OWN` est explicitement refusé. Chaque lecture et écriture recharge le contrat dans le périmètre autorisé ; la création exige un rattachement actif dans ce même périmètre.

## GED

L’entité `provider_contract` est ajoutée au résolveur de la GED centrale et protégée par `hr.provider.contract.view`. L’interface réutilise les hooks, l’upload, la prévisualisation, le téléchargement, les types documentaires, l’archivage et le stockage existants. Aucun second stockage documentaire n’est introduit.

## Tests réellement exécutés

- Backend ciblé LOT 4 : **7/7 PASS**.
- Frontend ciblé LOT 4 : **1/1 PASS**.
- Backend TypeScript lint : **PASS**.
- Backend build : **PASS**.
- Frontend TypeScript lint : **PASS**.
- Frontend build Vite : **PASS** (2 513 modules transformés).
- MySQL 8.4.11 temporaire, sans volume persistant : baseline + seed + migrations 096, 097, 098 et 099 : **PASS**.
- Contrôle MySQL : quatre tables LOT 4 présentes, deux permissions présentes, dix-neuf contraintes référentielles sur les tables contractuelles.

Le test backend a dû être exécuté hors bac à sable parce que le chargeur `tsx` crée un socket IPC local dans `/tmp`; le premier échec `EPERM` ne provenait pas du code. Aucun test n’a utilisé la base métier.

## Anomalies et risques résiduels

- Le formulaire graphique de modification d’un brouillon n’est pas encore exposé ; l’API `PATCH` est présente et protégée.
- La qualification réalisée couvre le schéma réel MySQL et les contrats statiques backend/frontend, mais pas une recette HTTP complète avec authentification réelle ni une recette navigateur du formulaire.
- Les permissions devront être attribuées aux rôles métier via la matrice RBAC avant usage hors SUPER_ADMIN.
- Le futur lot rémunérations devra renseigner les marqueurs d’utilisation d’échéance sans modifier rétroactivement l’engagement.
- La migration 099 ne doit être appliquée à la base métier qu’après autorisation explicite et dans l’ordre 096 → 097 → 098 → 099.

## Prérequis du LOT 5

Avant le LOT 5 : appliquer les migrations séquentiellement dans un environnement autorisé, attribuer les permissions métier, terminer et recetter l’édition graphique des brouillons, puis valider les parcours HTTP/navigateur et les exigences GED d’activation. Le LOT 5 n’a pas été commencé.
