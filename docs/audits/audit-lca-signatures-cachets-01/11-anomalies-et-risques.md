# Anomalies et risques

## AUD-SC-001 — Critique — politiques absentes après rechargement

- Observé : GET filtre `service_stamp_agencies.stamp_id=p.id`.
- Attendu : politique de l’agence active, avec éventuel fallback concession.
- Cause démontrée : réemploi de `scope()` puis `replaceAll('st.','p.')`.
- Impact : paramètres visibles remis aux défauts, perte de confiance et émission sans marques.
- Fichiers : `document-mark.routes.ts`, route GET policies.
- Correction recommandée : prédicat dédié aux politiques sur concession/agence.
- Tests : sauvegarde/relecture, deux agences, fallback, actualisation.

## AUD-SC-002 — Majeure — chargement simultané

- Cause démontrée : mutation unique et `isPending` partagé.
- Impact : UX ambiguë ; pas d’écrasement DB démontré.
- Correction : état par `documentType` ou composant enfant avec mutation propre.
- Tests : successif, concurrent, erreur isolée.

## AUD-SC-003 — Majeure — signature en agence secondaire

- Cause : résolution via `users.agency_id` au lieu de l’affectation active.
- Impact : signature requise introuvable et blocage possible.
- Statut : risque démontré par code, reproduction MySQL requise.

## AUD-SC-004 — Majeure — contrôle de rôle divergent en livraison

- Cause : la route livraison n’interroge pas `service_stamp_role_authorizations`.
- Impact : un cachet partagé peut être utilisé dans la livraison avec `stamp.use` sans rôle explicitement autorisé.
- Correction : aligner les règles ou documenter que ce workflow déroge intentionnellement.

## AUD-SC-005 — Mineure — états techniques

- Observé : `triggerStatus` anglais rendu directement.
- Impact : incompréhension utilisateur.
- Correction : mapper vers des libellés métier français après validation du sens.

## AUD-SC-006 — Majeure — couverture documentaire partielle

- Observé : seulement quatre types utilisent les politiques ; pro forma exclue.
- Impact : attente utilisateur non satisfaite si l’écran est perçu comme global.
- Correction : afficher explicitement la matrice supportée avant toute extension.
