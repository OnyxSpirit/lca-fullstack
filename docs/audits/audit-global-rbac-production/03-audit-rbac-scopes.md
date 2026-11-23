# Audit RBAC, scopes et multi-agences

## Modèle actif

Les types et contrôles actifs n'acceptent que `OWN` et `AGENCY` (`rbac.service.ts:8-16`). Les rangs sont `OWN < AGENCY`. Une valeur persistée différente déclenche un refus, et le schéma final la rend impossible.

Le contexte d'autorisation est recalculé depuis :

- le vrai rôle système `SUPER_ADMIN` (`code` + `is_system`);
- la session et son `active_agency_id`;
- `user_agencies` et `user_agency_roles` pour les utilisateurs ordinaires;
- les permissions actives des rôles de l'agence active.

Le changement d'agence vérifie l'affectation, incrémente `agency_context_version` et force le recalcul. Les écritures sensibles relisent et verrouillent session, rôles et attributions; un contexte modifié produit `AGENCY_CONTEXT_CHANGED` ou `AGENCY_AUTHORIZATION_CHANGED`.

Preuves principales : `agency-rbac.service.ts:19-75`, `agency-authorization.ts:120-137`, migration `114_rbac_multi_agency_foundation.sql`.

## Super Admin

Le Super Admin est identifié en base, pas par un libellé client. Il peut choisir toute agence active, mais ses permissions restent les attributions du rôle système, normalisées en `OWN`/`AGENCY`. Il ne contourne donc pas automatiquement les validations métier. Le refus cachet est cohérent avec le code actuel, mais incohérent avec le payload UI.

À l'inverse, les helpers « centraux » imposent le vrai Super Admin. Cette exception de rôle est trop large au regard de l'exigence actuelle : elle neutralise les permissions centrales attribuables aux rôles ordinaires. Voir AUD-RBAC-001.

## Classification de `GLOBAL` et `CONCESSION`

| Classe | Exemples | Verdict |
|---|---|---|
| Baseline / migrations historiques | baseline `role_permissions`, migrations 043–130 | historique; normalisé par 131 |
| Migration de normalisation | 131 et script d'export | attendu |
| Origine commerciale | véhicule `CONCESSION/EXTERNAL/UNKNOWN` | métier, pas RBAC |
| Trésorerie | compte rattaché `AGENCY/CONCESSION` | métier, pas RBAC |
| Audit | `context.mode=GLOBAL` | territoire de journalisation, pas RBAC |
| Comptabilité | `scope_type=GLOBAL/CONCESSION/...` | portée métier de contrôle |
| Source active RBAC | aucune comparaison active confirmée | conforme |

La baseline conserve quatre valeurs parce qu'elle précède les migrations; une installation complète doit impérativement aller jusqu'à 132. La migration 131 convertit `GLOBAL`/`CONCESSION` en `AGENCY`, supprime les valeurs nulles, puis réduit l'ENUM. La 132 supprime toute valeur hors domaine et ajoute un `CHECK`.

## Ressources centrales

Le modèle doit distinguer deux axes :

- **scope RBAC** : profondeur de droit dans l'agence (`OWN`, `AGENCY`);
- **propriété métier** : utilisateur, agence ou concession.

Le code actuel remplace souvent la propriété « concession » par une condition de rôle système. C'est le défaut architectural central. Une ressource centrale devrait être résolue depuis la concession de l'agence active, puis protégée par une permission explicite; elle ne nécessite ni ancien scope RBAC ni accès à toutes les concessions.

## Conclusion RBAC

- élimination active des anciens scopes : **conforme**;
- gestion de l'agence active et verrouillage : **conforme statiquement**;
- délégation des ressources centrales : **non conforme**;
- modèle des cachets : **non conforme / décision d'architecture requise**.
