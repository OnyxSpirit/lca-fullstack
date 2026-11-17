# 08 — RBAC et sécurité

L'autorité runtime repose sur les permissions persistées, les portées `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`, l'agence active et les affectations actives. Le simple nom d'un rôle ressemblant à `SUPER_ADMIN` ne suffit pas : les tests ciblés vérifient le caractère système du vrai rôle.

Les sessions sont liées à un contexte versionné ; les changements d'agence ou de droits invalident les hypothèses en vol. Les réinitialisations de mot de passe révoquent les sessions. La 2FA couvre enrôlement TOTP, récupération, step-up, appareils de confiance, révocation et politiques par rôle. Aucun secret, OTP ou jeton n'a été extrait pendant l'audit.

Réserve de preuve : les quatre scénarios MySQL réels de contexte/agence/administration/temps réel n'ont pas été lancés, la base `lca_reporting_ged_hr_e2e` ne satisfaisant pas le garde-fou nominal des tests.

