# Rapport de correction RBAC des appareils personnels 2FA — Lot A

Date : 17 octobre 2026

Verdict : **VALIDÉ AVEC RÉSERVES**

## 1. Résumé de l'anomalie

La section « Mes appareils » était affichée aux utilisateurs possédant `auth.2fa.view`, mais les routes personnelles exigeaient `auth.2fa.devices.view` ou `auth.2fa.devices.revoke`. Un utilisateur autorisé à administrer ses propres paramètres 2FA pouvait donc voir la section puis recevoir un HTTP 403.

## 2. Cause racine

Les endpoints personnels réutilisaient les permissions et le prédicat de scope conçus pour l'administration d'appareils tiers. Même lorsque `personal=true`, `listTrustedDevices` évaluait `auth.2fa.devices.view` et `deviceForAction` évaluait `auth.2fa.devices.revoke` après avoir vérifié le propriétaire.

Le frontend suivait déjà le contrat personnel cohérent : section et actions personnelles avec `auth.2fa.view`, endpoints suffixés par `/me`, sans chargement du répertoire utilisateurs/agences.

## 3. Contrat RBAC avant correction

| Opération | Frontend | Backend avant |
|---|---|---|
| Voir mes appareils | `auth.2fa.view` | `auth.2fa.devices.view` + scope administratif |
| Révoquer mon appareil par ID | `auth.2fa.view` | `auth.2fa.devices.revoke` + scope administratif |
| Révoquer l'appareil courant | section sous `auth.2fa.view` | authentification seule |
| Voir les appareils administrés | `auth.2fa.devices.view` | `auth.2fa.devices.view` + scope |
| Révoquer un appareil administré | `auth.2fa.devices.revoke` | `auth.2fa.devices.revoke` + scope et step-up tiers |

## 4. Contrat RBAC après correction

| Endpoint | Permission | Limitation des données |
|---|---|---|
| `GET /auth/2fa/devices/me` | `auth.2fa.view` | SQL impose `u.id = request.user.sub` |
| `DELETE /auth/2fa/devices/me/current` | `auth.2fa.view` | hash du cookie et `request.user.sub` |
| `DELETE /auth/2fa/devices/me/:id` | `auth.2fa.view` | l'appareil doit appartenir à `request.user.sub`; sinon 404 |
| `GET /auth/2fa/devices` | `auth.2fa.devices.view` | scopes OWN/AGENCY/CONCESSION/GLOBAL inchangés |
| `DELETE /auth/2fa/devices/:id` | `auth.2fa.devices.revoke` | scopes inchangés; step-up tiers et protection SUPER_ADMIN inchangés |

## 5. Justification de sécurité

`auth.2fa.view` est la permission personnelle déjà utilisée pour consulter l'état TOTP et ouvrir « Mes appareils ». Elle n'accorde aucun droit administratif. En mode personnel, le backend ignore désormais les filtres d'identité implicites et construit lui-même la contrainte à partir de la session authentifiée.

La consultation ne prend aucun `user_id` arbitraire en compte. La révocation personnelle charge l'appareil par son identifiant puis retourne 404 avant toute écriture si `row.user_id !== request.user.sub`. Cette réponse ne révèle pas l'existence d'un appareil tiers. Les routes administratives, leurs scopes territoriaux, le step-up de révocation tierce et la protection du SUPER_ADMIN ne sont pas modifiés.

Toutes les routes restent derrière `authenticate` et `enforceAgencyScope` au montage `/api`. Les routes personnelles exigent en plus explicitement `auth.2fa.view`.

## 6. Fichiers modifiés

- `backend-node/src/modules/auth/two-factor-admin.routes.ts`
- `backend-node/src/modules/auth/trusted-device.service.ts`
- `backend-node/test/trusted-device-management.test.ts`
- `frontend/test/trusted-device-management.test.ts`
- `docs/RAPPORT-CORRECTION-RBAC-APPAREILS-2FA-LOT-A.md`

Aucun composant frontend n'a nécessité de correction : il utilisait déjà le mode, la permission et les endpoints personnels appropriés.

## 7. Endpoints concernés

La correction porte uniquement sur les trois routes `/auth/2fa/devices/me*`. Les deux endpoints administratifs `/auth/2fa/devices` et `/auth/2fa/devices/:id` sont inchangés.

## 8. Tests réalisés

| Validation | Résultat |
|---|---|
| Backend lint | PASS |
| Backend build | PASS |
| Frontend lint | PASS |
| Frontend build | PASS — 2 505 modules transformés |
| Tests backend ciblés 2FA/appareils | PASS — 5 fichiers sur 5 |
| Tests frontend ciblés 2FA/RBAC | PASS — 7 fichiers sur 7 |
| Tests backend RBAC ciblés | 5 fichiers PASS, 1 fichier en échec préexistant |

Les tests ajoutés vérifient : permission personnelle sur les trois routes `/me`, conservation des permissions administratives, contrainte SQL issue de `request.user.sub`, refus d'un appareil tiers avant la branche administrative, montage derrière l'authentification, absence de chargement utilisateurs/agences en mode personnel et usage exclusif des endpoints `/me`.

## 9. Résultats détaillés

- Consultation personnelle : contrat aligné sur `auth.2fa.view`.
- Anti-IDOR : identité dérivée exclusivement de la session; aucun `user_id` client.
- Révocation personnelle : uniquement pour un appareil appartenant au demandeur.
- Révocation courante : permission personnelle explicite, cookie expiré, session JWT non révoquée.
- Administration : permissions, scopes, step-up et SUPER_ADMIN préservés.
- Invalidation frontend après révocation : la query key `['auth','2fa','devices']` reste invalidée.
- Erreurs frontend : état d'erreur et toast existants conservés.

## 10. Régressions recherchées

Les tests ciblés couvrent connexion/2FA, gouvernance, appareil de confiance, rotation, cookie, durée 7/30 jours, step-up, centre de sécurité, navigation et interfaces de scopes. Lint et builds complets des deux applications réussissent.

Le test backend `rbac-core-alignment.test.ts` échoue sur un cas sans rapport avec ce lot : il attend que `roles.permissions.manage` accepte une délégation avec scope `null`, alors que l'implémentation actuelle lève « Cette permission n'est pas compatible avec le périmètre sélectionné ». Les quatre autres sous-tests du fichier réussissent. Ce test n'a pas été modifié.

## 11. Tests non exécutés

- Scénarios HTTP réels 1 à 10 : **NON EXÉCUTÉS**, car aucun environnement de recette MySQL isolé n'a été explicitement établi pour cette mission.
- Parcours navigateur réel : **NON EXÉCUTÉ** pour la même raison.
- Nouvelle connexion après révocation sur une base réelle : **NON EXÉCUTÉE**; le comportement est couvert statiquement et par les tests existants, mais pas par HTTP réel ici.

Aucun résultat HTTP 200/401/403 n'est revendiqué sans exécution réelle.

## 12. Réserves

La correction compile et ses tests ciblés passent, mais la validation de bout en bout exige encore une recette isolée avec utilisateurs disposant respectivement de `auth.2fa.view`, de permissions administratives par scope et d'aucune permission. Le test RBAC préexistant cité ci-dessus reste rouge hors périmètre.

## 13. Réponses explicites et verdict

| Question | Réponse |
|---|---|
| A. Un utilisateur peut-il consulter ses propres appareils ? | **Oui**, avec `auth.2fa.view`, limité par `request.user.sub`. |
| B. Peut-il révoquer ses appareils ? | **Oui**, avec `auth.2fa.view`, uniquement s'ils lui appartiennent. |
| C. Peut-il consulter les appareils d'autres utilisateurs ? | **Non**, pas via les endpoints personnels; l'administration exige `auth.2fa.devices.view`. |
| D. Peut-il révoquer les appareils d'autres utilisateurs ? | **Non**, pas via les endpoints personnels; l'administration exige `auth.2fa.devices.revoke`, le scope et le step-up. |
| E. Les permissions administratives sont-elles préservées ? | **Oui**, sans modification. |
| F. Le mécanisme de confiance de 7 jours reste-t-il intact ? | **Oui**, aucune logique de création, expiration, rotation ou cookie n'a été modifiée. |
| G. Nouvelle permission ou migration ? | **Non**. |

**Verdict final : VALIDÉ AVEC RÉSERVES**, la réserve portant uniquement sur l'absence de recette HTTP/navigateur isolée et sur un test RBAC préexistant hors périmètre.
