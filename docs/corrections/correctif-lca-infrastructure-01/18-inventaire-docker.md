# Inventaire Docker

L'audit initial comptait 45 images, 76 conteneurs, 28 volumes et environ 2250 entrées de cache. L'inventaire final du 25 novembre 2026, après conservation de toutes les ressources de preuve, compte 48 images, 106 conteneurs dont 18 actifs, 37 volumes et 31 réseaux. Projets observés : principal `lca`, `lca-recette`, `lca-financial-e2e`, `lca-reporting-ged-hr`, `evolution-lca-01`, `lca-codex-qualification`, `lca-rbac-roles-01` et `correctif-lca-infrastructure-01-erp`. Les MySQL actifs sont 8.4; les backends affectés partageaient le code/migration divergent et redémarraient.

Ressources créées et conservées pour cette mission : réseau `correctif-lca-infrastructure-01`; volumes `correctif_lca_infrastructure_01_mysql` et `_2`; conteneurs MySQL `correctif-lca-infrastructure-01-mysql` (arrêt propre externe, conservé) et `-mysql-2`; conteneurs de restauration, runners, tests et builds nommés avec le même préfixe. Aucun port hôte n'est publié pour MySQL. Les conteneurs ponctuels terminés sont conservés pour inspection.

Aucune ressource préexistante n'a été réutilisée pour un test destructif. Aucun nettoyage n'a été effectué. Un inventaire machine détaillé sans secrets figure dans les preuves finales.
