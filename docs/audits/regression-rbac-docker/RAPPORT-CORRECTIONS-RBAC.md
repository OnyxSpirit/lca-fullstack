# Rapport des corrections RBAC

## Correction réalisée

`assertAgencyBusinessPermissionInContext` transforme désormais, pour le seul vrai Super Admin, une permission persistée en scope métier effectif `AGENCY` dans le contexte canonique `agencyRbac`. `assertAnyAgencyBusinessPermission` réutilise la même règle. Les consommateurs aval lisent donc tous le même scope effectif.

La comparaison transactionnelle tient compte de cette dualité : pour un Super Admin, elle vérifie l'identité de l'ensemble des permissions, sans confondre la représentation persistée `GLOBAL` et sa projection métier `AGENCY`. Toute suppression de permission, perte de session, désactivation ou changement de contexte reste détecté.

## Fichiers modifiés

- `backend-node/src/modules/rbac/agency-authorization.ts`
- `backend-node/test/agency-authorization.test.ts`
- `backend-node/test/agency-rbac-context-mysql.integration.test.ts`
- `backend-node/test/rbac-super-admin-business-scope-regression.test.ts`
- les quatre rapports de `docs/audits/regression-rbac-docker/`

## Sécurité et impact

- Aucun bypass par nom de rôle.
- Aucune autorisation générale ajoutée.
- Le Super Admin métier est limité à l'agence active.
- Les scopes `OWN` et `AGENCY` des rôles locaux restent inchangés.
- Les contrôles centraux continuent d'exiger le vrai rôle système et la permission persistée.
- Aucune donnée, migration ou configuration Docker n'a été modifiée dans `concession_erp`.

## Migrations

Aucune migration n'est nécessaire : le schéma et les attributions sont corrects. La correction est exclusivement dans la résolution runtime.

## Réserves

Le déploiement et le redémarrage des conteneurs n'ont pas été effectués conformément à la mission. L'environnement courant ne bénéficiera du correctif qu'après une opération contrôlée distincte. L'erreur de collation du worker comptable observée dans les journaux est indépendante et reste à traiter dans son propre périmètre.
