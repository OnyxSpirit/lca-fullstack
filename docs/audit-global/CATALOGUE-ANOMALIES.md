# Annexe — Catalogue des anomalies

## Anomalies confirmées

| ID | Priorité | Module | Preuve | Attendu / constat | Recommandation et validation |
|---|---|---|---|---|---|
| AUD-2FA-001 | P1 | Auth/2FA | `TwoFactorSecurityCenterPage.tsx:5`, `TrustedDevicesPanel.tsx:6`, `two-factor-admin.routes.ts:20-22`, `trusted-device.service.ts:38-56` | « Mes appareils » est accordé avec `auth.2fa.view`; l'API exige `auth.2fa.devices.view/revoke`. Un utilisateur personnel minimal reçoit 403. | Aligner le contrat personnel sans élargir l'administration; tests RBAC OWN/AGENCY/CONCESSION/GLOBAL, HTTP et navigateur. |
| AUD-SEC-001 | P1 | Auth | `authStore.ts:8-10,47-48,68-77,80-85` | Les JWT d'accès et de refresh sont persistés dans `localStorage`, exposant les sessions à une compromission XSS. | Étudier une session cookie HttpOnly/Secure/SameSite avec rotation et protection CSRF; campagne de migration et tests de session. |
| AUD-TEST-001 | P1 | Transversal | Suite frontend | 34/172 tests échouent, couvrant finance, RH, GED, SAV, navigation et session. | Requalifier chaque échec avant livraison; ne pas assouplir les assertions sans preuve métier. |
| AUD-TEST-002 | P1 | Transversal | Suite backend | La suite globale produit plusieurs échecs puis ne termine pas. | Isoler les fichiers, corriger la terminaison/handles ouverts et restaurer un PASS global reproductible. |
| AUD-RT-001 | P2 | Temps réel | `AppBootstrap.tsx` et producteurs backend | 13 familles d'événements émises n'ont pas de listener explicite. | Ajouter les invalidations appropriées ou supprimer/normaliser les événements; test multi-session. |
| AUD-TEST-003 | P2 | Auth/tests | `auth-session-revocation.test.ts` | Le mock RBAC n'exporte pas `assertPermission`, requis par `user-access.ts`. | Mettre à jour le double de test puis vérifier la révocation réelle. |
| AUD-2FA-002 | P3 | Auth/2FA | `TwoFactorSecuritySettingsPage.tsx:19` | Le texte dit que la confiance est « préparatoire » alors que le lot 3 est implémenté. | Corriger seulement le libellé après résolution de AUD-2FA-001. |

## Réserves de validation

| ID | Priorité | Domaine | Réserve |
|---|---|---|---|
| AUD-VAL-001 | P1 | Base de données | Schéma actif, migrations appliquées, index et FK non vérifiés sur l'instance réelle. |
| AUD-VAL-002 | P1 | API/workflows | Aucun test HTTP réel ni navigateur n'a été exécuté faute d'environnement isolé explicitement établi. |
| AUD-VAL-003 | P2 | Socket.IO | Isolation territoriale et reconnexion non éprouvées avec plusieurs sessions réelles. |
| AUD-VAL-004 | P2 | PDF/exports/uploads | Builds et code inspectés, mais rendu, téléchargement, MIME et impression non validés dans un navigateur réel. |

Une réserve n'est pas assimilée à un défaut : elle interdit seulement un verdict `CONFORME` faute de preuve dynamique suffisante.
