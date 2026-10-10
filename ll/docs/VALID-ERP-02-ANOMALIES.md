# VALID-ERP-02 — Anomalies

## VERP02-01 — Double réservation d'un essai automobile

- Criticité : P1.
- Module : Showroom / essais.
- Fichier : `backend-node/src/modules/showroom/showroom.routes.ts` ; fonction de création/démarrage d'essai.
- Observé : la disponibilité du véhicule est lue avant la transaction, sans verrou de ligne, sans recherche d'essai actif et sans passage du véhicule dans un état indisponible. Aucun contrôle équivalent n'existe pour le commercial.
- Attendu : deux créations simultanées ne doivent pas réserver le même véhicule ou le même commercial.
- Reproduction : envoyer simultanément deux créations d'essai sur le même véhicule ou le même commercial disponible.
- Preuve : inspection de la route et test de contrat `valid-erp-02-crm-contracts.test.ts` documentant l'absence de `FOR UPDATE`/contrôle actif.
- Cause racine : modèle d'essai instantané (`in_progress`) sans intervalle ni verrou transactionnel de ressource.
- Impact : double affectation opérationnelle ; collision essai–rendez-vous indéterminable.
- Correction minimale : décision métier préalable sur la durée/fin, puis verrouillage transactionnel des ressources et contrainte de conflit.
- Tests nécessaires : véhicule identique, commercial identique, ressources différentes, annulation, concurrence réelle MySQL, essai contre rendez-vous.

## VERP02-02 — Activité de retour d'essai sans auteur

- Criticité : P2.
- Module : Showroom / activités.
- Fichier : `backend-node/src/modules/showroom/showroom.routes.ts` ; route de retour d'essai.
- Observé : l'insertion d'activité de retour ne renseigne pas `created_by`.
- Attendu : toute nouvelle activité authentifiée enregistre l'auteur issu de la session, distinct du responsable.
- Reproduction : terminer un essai puis lire l'activité associée dans l'API/timeline.
- Preuve : colonne omise dans l'INSERT de la route de retour.
- Cause racine : route non alignée sur le nouveau contrat d'auteur de la migration 077.
- Impact : traçabilité incomplète pour les nouvelles activités de retour.
- Correction minimale : ajouter `created_by = request.user.sub` dans cette insertion.
- Tests nécessaires : retour par commercial, responsable, autre agence autorisée et GLOBAL, conservation lors d'une réaffectation.

## VERP02-03 — Dérogation sans contrôle de scope (corrigée)

- Criticité : P1 sécurité.
- Module : CRM / rendez-vous.
- Fichier : `backend-node/src/modules/crm/crm.routes.ts` ; `POST /leads/:id/appointments`.
- Observé : la permission de dérogation était testée sans appliquer OWN/AGENCY/CONCESSION à la cible.
- Attendu : le scope de la permission de dérogation doit borner le prospect concerné.
- Reproduction : utilisateur avec création large et override OWN sur un prospect affecté à un tiers, requête API directe avec `overrideConflict=true`.
- Preuve : ancien appel unique à `assertPermission`; test `CRM-04 applique aussi le scope...`.
- Cause racine : primitive de présence de permission utilisée comme autorisation objet.
- Impact : contournement potentiel de séparation des responsabilités.
- Correction minimale : `assertLeadPermissionScope` avant transaction.
- Tests nécessaires : OWN, AGENCY, CONCESSION, GLOBAL et hors-scope ; ajoutés au contrat statique, matrice API dynamique à compléter.

## VERP02-04 — Conversion entreprise en client particulier (corrigée)

- Criticité : P1 données.
- Module : CRM / devis / clients.
- Fichier : `backend-node/src/modules/quotations/quotation.service.ts` ; `ensureCustomer`.
- Observé : `customer_type` était codé en dur à `individual` même avec `company_name`.
- Attendu : une entreprise convertie devient un client `company`, sans nom de famille artificiel.
- Reproduction : créer un prospect société, créer le client via la conversion/devis, lire `customers.customer_type`.
- Preuve : ancien INSERT constant ; test de contrat VALID-ERP-02.
- Cause racine : conversion antérieure au contrat particulier/entreprise.
- Impact : identité Client 360° et reporting erronés.
- Correction minimale : dériver le type de `company_name` et conserver `last_name = NULL` pour l'entreprise.
- Tests nécessaires : conversion particulier/entreprise et doublons téléphone/e-mail.

## VERP02-05 — Interface de dérogation absente

- Criticité : P2.
- Module : frontend CRM.
- Fichier : `frontend/src/modules/crm/CrmPage.tsx` ; dialogue de rendez-vous.
- Observé : l'API accepte une dérogation auditée, mais l'UI ne présente ni action conditionnée par permission ni champ de justification.
- Attendu : un utilisateur autorisé peut traiter un 409 sans fabriquer une requête directe.
- Reproduction : provoquer un conflit depuis le dialogue.
- Preuve : absence de `overrideConflict`/`overrideReason` dans le flux UI.
- Cause racine : CORR-ERP-02 a livré le contrôle backend sans parcours frontend.
- Impact : fonctionnalité inaccessible en usage normal.
- Correction minimale : évolution UI dédiée conditionnée par permission ; hors périmètre de validation.
- Tests nécessaires : visibilité RBAC, motif vide/valide, persistance et refus hors-scope.
