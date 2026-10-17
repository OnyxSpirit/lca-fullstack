# Annexe — Matrice API frontend/backend

Audit statique du 17 octobre 2026. Le catalogue exhaustif des 555 déclarations Express est dans [CATALOGUE-ROUTES-API.md](./CATALOGUE-ROUTES-API.md). Les appels dynamiques utilisant des identifiants ou des paramètres de requête ont été rapprochés par famille de route; cette annexe ne transforme pas ce rapprochement statique en validation HTTP.

## Points d'entrée et transport

- `frontend/src/services/apiClient.ts` préfixe les appels par `/api`, transmet le jeton Bearer et coordonne un refresh concurrent.
- `backend-node/src/app.ts` monte l'authentification publique sous `/api/auth`, puis les routeurs protégés sous `/api` après `authenticate`.
- Les téléchargements utilisent `apiDownload`; les mutations et lectures JSON utilisent `apiRequest`.
- Les routes de page `service/*` sont servies par les domaines backend `workshop`, `parts`, `billing`, `customers` et `documents`; l'absence d'un dossier backend nommé `service` n'est donc pas une absence d'API.

## Couverture des clients frontend

| Client/hook | Appels détectés | Domaines principaux | Routeur backend correspondant | Conclusion statique |
|---|---:|---|---|---|
| `activityHooks.ts` | 4 | activité, filtres, PDF | activity | Cohérent |
| `dashboardHooks.ts` | 3 | synthèse, recherche globale | dashboard, core | Cohérent |
| `documentHooks.ts` | 10 | GED, aperçu, versions | documents | Cohérent |
| `documentMarkHooks.ts` | 18 | cachets/signatures | document-marks | Cohérent |
| `erpHooks.ts` | 185 | CRM, ventes, clients, véhicules, SAV, atelier, pièces, livraisons, facturation | routeurs métier correspondants | Couverture large; validation HTTP non exécutée |
| `hrHooks.ts` | 82 | RH, budgets, dépenses, rémunérations | hr | Couverture large; suite frontend en échec sur plusieurs contrats RH |
| `notificationHooks.ts` | 3 | notifications | notifications | Cohérent |
| `reportHooks.ts` | 4 | rapports | reports | Cohérent |
| `resourceSettingsHooks.ts` | 5 | ressources atelier | settings/workshop | Cohérent |
| `settingHooks.ts` | 20 | paramètres | settings et sous-routeurs | Cohérent |
| `treasuryHooks.ts` | 46 | comptes, mouvements, rapprochement, réservations | treasury | Couverture large; suite frontend en échec sur plusieurs contrats trésorerie |
| `twoFactorHooks.ts` | 19 | TOTP, politiques, appareils | auth/two-factor-admin | Écart confirmé sur les permissions des endpoints personnels |
| `userHooks.ts` | 16 | utilisateurs/rôles | users | Cohérent statiquement |

Total détecté dans ces clients : 415 appels explicites, auxquels s'ajoutent des appels directs dans les composants et services. L'inventaire des interactions recense 478 occurrences `apiRequest`, `apiDownload` ou `fetch` dans le périmètre frontend métier.

## Écarts démontrés

| ID | Chaîne | Attendu | Constat | Effet |
|---|---|---|---|---|
| AUD-2FA-001 | `TrustedDevicesPanel(personal)` → `useTrustedDevices(..., personal=true)` → `GET /auth/2fa/devices/me` | La permission personnelle `auth.2fa.view` suffit à « Mes appareils » | L'UI ouvre la section avec `auth.2fa.view`, mais la route et le service exigent `auth.2fa.devices.view`; la révocation par identifiant exige `auth.2fa.devices.revoke` | 403 possible pour l'utilisateur personnel minimal; liste et révocation individuelle inaccessibles |
| AUD-API-001 | Suites de contrats frontend | Contrats de hooks stables | 34 fichiers de tests frontend échouent, notamment RH, trésorerie, GED, livraisons et garanties | Plusieurs contrats restent à requalifier avant livraison |
| AUD-API-002 | Suite backend globale | Tous les routeurs démarrent sous les mocks de test | Plusieurs fichiers échouent; `auth-session-revocation.test.ts` ne fournit pas `assertPermission` dans son mock RBAC; exécution interrompue après blocage | Régression réelle ou dérive des doubles de test non départagée partout |

## Limites

- Aucun appel HTTP réel n'a été effectué : aucun environnement de recette isolé n'était explicitement établi.
- Les réponses réelles, en-têtes, statuts et effets SQL sont donc `NON VÉRIFIÉS` par HTTP.
- La présence d'une route ne prouve pas son fonctionnement; les verdicts du rapport s'appuient aussi sur les builds, tests ciblés et lectures des services SQL.
