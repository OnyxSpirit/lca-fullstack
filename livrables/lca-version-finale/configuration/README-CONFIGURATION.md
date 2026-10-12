# Configuration et secrets

Les trois fichiers sous `exemples/` contiennent uniquement des exemples ou placeholders. `lca.env.example` est le modèle Compose principal ; les deux autres documentent les exécutions locales des composants.

Les variables obligatoires du déploiement Compose sont : `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Les limites de pool et de rate-limit, TTL JWT, adresse/port HTTP et `TRUST_PROXY_HOPS` ont des valeurs par défaut documentées dans le modèle.

Générer des secrets longs et indépendants, les transmettre hors courriel non chiffré, les stocker dans le coffre approuvé, limiter leurs droits et organiser leur rotation. Ne jamais ajouter un `.env` réel, une clé privée TLS, un token, un dump ou un fichier de sauvegarde à ce paquet.
