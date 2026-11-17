# 12 — Tests MySQL

## Contrôles lecture seule exécutés

`notifications=0`, `audit_logs=46`, `users=32` tous actifs, `roles=24`, `permissions=382`, `role_permissions=485`, `settings=10`, `agencies=16`, `concessions=11`, `orphan_role_permissions=0`.

## Intégrations identifiées mais non exécutées

- notifications HTTP/MySQL/Socket ;
- administration centrale et habilitations locales ;
- contexte agence, isolation et Super Administrateur ;
- salles temps réel, changement d'agence et révocation.

Chaque test exige que `DB_NAME` contienne `isolated`, `test` ou son code de phase. Le nom effectif est `lca_reporting_ged_hr_e2e`. Modifier le test, renommer/créer une base ou contourner ce contrôle aurait enfreint la mission. Résultat intégration : **0 exécutée, 4 bloquées par garde-fou**, et non « réussies ».

