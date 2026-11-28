# Procédure permanente de qualification complète

## Prérequis

- Node.js 22 ;
- MySQL 8.4 dans une instance isolée et identifiée ;
- image backend de référence avec Poppler pour les contrôles PDF ;
- backend HTTP et proxy WSS isolés pour le test temps réel TLS ;
- base vierge dédiée au test destructif d’amorçage administrateur ;
- variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET`, sans jamais consigner leurs valeurs dans les preuves ;
- `QUALIFICATION_PROOF_ROOT` pointant vers un dossier de preuves non sensible.

## Ordre obligatoire

1. Exécuter la suite backend standard et conserver son TAP. Les 107 ignorés attendus dans ce mode ne valent pas qualification.
2. Générer l’inventaire AST : `node --import tsx scripts/inventory-conditional-integrations.ts`. La commande doit annoncer exactement 107 lignes.
3. Sur la base d’intégration isolée, exécuter `npm run test:integrations:qualification`. Le script refuse Node autre que 22, une base dont le nom ne signale pas l’isolation et un inventaire différent de 107.
4. Exécuter séparément `admin-provisioning-security.test.ts` avec `SEED_ADMIN_MYSQL_TEST=1` sur une base fraîche dédiée.
5. Démarrer le proxy TLS isolé et exécuter `wss-proxy-mysql.integration.test.ts` avec `LCA_WSS_PROXY_TEST=1`, `LCA_WSS_URL` et `LCA_WSS_CA_PATH`.
6. Rapprocher les résultats : 105 tests dans la passe intégrations, 1 test d’amorçage isolé et 1 test WSS, soit 107/107.
7. Exécuter ensuite backend standard, frontend complet, lints TypeScript, builds, immuabilité des migrations et `git diff --check` sur l’état final.

## Conditions d’échec

La qualification complète échoue si l’inventaire n’est pas exactement 107, si l’un des modes dédiés n’a pas produit sa preuve, si un test est ignoré dans son mode d’intégration, si un code de sortie est non nul, si la chaîne TLS n’est pas validée, si MySQL n’est pas 8.4, si Node n’est pas 22, ou si une suite globale finale échoue.

## Résultats et preuves attendus

Les journaux sont écrits sous `docs/qualifications/qualification-lca-02/preuves/integrations-conditionnelles/`. Ils doivent contenir les résumés TAP, codes de sortie, durées, inventaires JSON et configurations non sensibles. Aucun secret, jeton, mot de passe ou clé privée ne doit y être copié. Les ressources Docker sont conservées pour inspection et ne sont jamais supprimées automatiquement.
