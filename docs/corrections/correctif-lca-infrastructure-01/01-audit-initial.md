# Audit initial

Date : 25 novembre 2026. Le répertoire était déjà modifié par EVOLUTION-LCA-03; toutes ces modifications ont été conservées. L'environnement principal identifié par labels, montages et réseau est `lca-*`, avec MySQL 8.4.11. Le backend était en boucle de redémarrage avant serveur : 135 étapes 1–6 `APPLIED`, étape 7 `FAILED_PARTIAL`, aucune ligne 135 dans `schema_migrations`, aucune 136.

Le fichier 135 présent ne correspondait plus aux checksums : étape 2 courante `ebeae…`, journal `401465…`. La FK `fk_invoice_customer` reliait `invoices.customer_id NOT NULL` à `customers.id`, règles RESTRICT/NO ACTION, sans orphelin. La baseline déclarée 071 contenait prématurément les objets 094. Node hôte était 24.11.1, images Node 22; `frontend/dist` appartenait à un UID/GID Docker. Aucun nettoyage n'a été réalisé.

L'inventaire Docker détaillé est dans `18-inventaire-docker.md`; les preuves d'audit antérieures restent dans `docs/audits/audit-lca-docker-01/`.
