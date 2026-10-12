# Rapport de préparation de livraison ERP LCA

Date : 12 octobre 2026  
Identifiant technique : `LCA-ERP-PKG-20261012`  
Mission : préparation non destructive du paquet définitif, sans distribution ni déploiement

## 1. Résumé exécutif

Le paquet autonome a été préparé dans `livrables/lca-version-finale/` et archivé sous `livrables/LCA-ERP-LIVRAISON-FINALE.zip`. La copie conserve l'arborescence applicative nécessaire, exclut les secrets et artefacts de développement, fournit un profil Docker épinglé et regroupe SQL, exploitation, configuration et documentation. Aucun environnement Docker protégé, aucune donnée et aucun fichier métier qualifié n'a été modifié par cette préparation.

Verdict : **B — PAQUET PRÊT AVEC RÉSERVES DOCUMENTÉES**. Ce verdict n'autorise ni distribution, ni déploiement, ni production.

## 2. Version qualifiée de référence

La référence est l'état de travail qualifié annoncé dans `CLOTURE-QUALIFICATION-ERP-LCA.md` : backend 231/231, frontend 153/153, typechecks/builds réussis, reporting MySQL 5/5, GED/PDF, révocation de session, isolation frontend, HTTPS/WSS temporaire, concurrence CRM et RBAC validés dans leur périmètre. Aucun numéro de version officiel n'existant, seul l'identifiant de paquet daté est utilisé ; aucune release Git n'a été créée.

## 3. Documents consultés

- `docs/CLOTURE-QUALIFICATION-ERP-LCA.md` ;
- `docs/QUALIFICATION-FINALE-ERP-LCA.md` ;
- `docs/CORRECTION-FINALE-ERP-LCA.md` ;
- les 12 documents de `docs/livraison-lca/` ;
- `README.md`, `DEPLOYMENT.md`, les README base/migrations, Compose, Dockerfiles, Nginx et scripts backup/restore.

## 4. Contenu du paquet

Le paquet comprend l'application backend/frontend, les lockfiles npm, l'infrastructure Docker/Nginx, les SQL nécessaires à une installation fraîche et à l'upgrade, les exemples de configuration, les procédures d'exploitation, les preuves de qualification et les manifestes d'intégrité. La structure exacte est documentée dans `README-LIVRAISON.md` et `manifestes/MANIFESTE-LIVRAISON.md`.

## 5. Fichiers inclus

Sont inclus : 122 fichiers backend source, 151 frontend source, 6 ressources publiques, baseline consolidée 071, seed système, 46 migrations 034–079, historique legacy 001–033 pour traçabilité runtime, configurations Nginx interne/hôte, MySQL, scripts backup/restore, trois exemples d'environnement, 12 guides et trois rapports de référence. Les copies applicatives contrôlées sont identiques aux sources qualifiées sur les échantillons critiques comparés, notamment la correction GED, la baseline et l'entrée React.

## 6. Fichiers exclus

Exclusions volontaires : `.git`, `.agents`, `.codex`, `.env` et `.env.recette`, clés/certificats privés, dumps/sauvegardes, `docs.zip`, logs, caches, fichiers temporaires, `node_modules`, `dist`, couvertures et tests. Les 396 fichiers de tests ne sont pas nécessaires à l'installation ; leurs résultats sont attestés par les rapports de qualification. Aucun fichier source exclu n'a été supprimé.

## 7. Configuration Docker

Le Compose natif reste présent pour conserver la topologie qualifiée. `docker-compose.livraison.yml` le surcharge pour utiliser MySQL par digest et les deux `Dockerfile.livraison` épinglés. La résolution combinée a été validée par `docker compose ... config --quiet`, sans création ni démarrage de conteneur. Les réseaux public/privé, healthchecks, dépendances et volumes persistent comme dans la référence.

## 8. État des digests

Les index OCI vérifiés le 12 octobre 2026 ont été appliqués à Node 22 Bookworm Slim, MySQL 8.4 et Nginx 1.27 Alpine. Les manifests `linux/amd64` contrôlés sont consignés dans `infrastructure/docker/IMAGES-VERIFIEES.md`. AUD-LCA-024 est donc traitée pour ces trois images dans le profil de livraison. Restent la production d'un SBOM, la signature du paquet selon politique et l'image utilitaire `alpine:3.21` des scripts, encore référencée par tag.

## 9. Configuration HTTPS

Le Nginx interne route API, uploads et Socket.IO avec headers et timeouts. Le modèle hôte assure redirection HTTP→HTTPS, TLS 1.2/1.3, HSTS et proxy WebSocket. Il contient un domaine fictif et aucun certificat. La configuration a été validée localement lors de la qualification ; DNS, certificats, renouvellement et proxy de production doivent être adaptés et recettés par l'exploitant.

## 10. État MySQL

MySQL 8.4.11 a été utilisé pendant la qualification isolée. Le Compose monte la baseline et le seed sur volume vide ; le backend exécute ensuite son bootstrap avant le serveur. Aucun dump ni aucune donnée client n'est inclus.

## 11. État des migrations

La baseline représente le niveau 071. Une installation fraîche enregistre son marqueur consolidé et applique 072–079. Les migrations 034–071 restent nécessaires aux upgrades historiques et 001–033 restent en legacy pour traçabilité. Le runner refuse les états ambigus et les doublons. Le paquet contient 46 migrations actives, sans modification de leur contenu.

## 12. Configuration des secrets

Seuls des modèles et placeholders sont livrés. La recherche ciblée de clés privées, tokens usuels et affectations de credentials a détecté uniquement des noms de variables et valeurs fictives documentées dans les exemples, scripts npm et guides. Aucun secret réel confirmé n'a été trouvé. Les secrets doivent être générés, transmis et stockés hors paquet par l'exploitant.

## 13. Sauvegarde et restauration

Les scripts couvrent MySQL, uploads et GED et vérifient les SHA-256. Leur syntaxe Bash a été validée. Ils ciblent explicitement les volumes `lca_*` et utilisent Alpine par tag. La restauration arrête l'application et remplace les données : elle exige une cible vide/approuvée, une sauvegarde préalable et un exercice isolé. Aucun script n'a été exécuté sur les environnements existants.

## 14. Résultats de l'analyse de sécurité

Contrôles de noms : aucun `.env` actif, clé privée, certificat privé, dump, base locale, log, archive de sauvegarde, `.git`, `node_modules`, `dist`, cache ou répertoire temporaire interdit. Contrôles de signatures : aucun en-tête de clé privée, jeton AWS/GitHub/Slack/OpenAI caractéristique. Les occurrences génériques `PASSWORD`/`SECRET` sont limitées à des variables, placeholders ou documentation. Aucune donnée client n'a été introduite.

## 15. Résultats des vérifications

- Compose combiné : OK ;
- syntaxe backup/restore : OK ;
- baseline, seed, 46 migrations, Nginx interne et modèle TLS : présents ;
- chemins Docker et contexte de build : cohérents avec `application/` ;
- copies critiques : identiques à la référence qualifiée ;
- campagne de tests générale : non relancée conformément à la mission ;
- installation fraîche : non exécutée, car la qualification MySQL/Docker isolée est déjà documentée et une nouvelle campagne n'était pas nécessaire.

## 16. Résultats du contrôle ZIP

L'archive a été testée avec `unzip -t`, extraite dans un répertoire temporaire, puis ses empreintes internes ont été revérifiées : **OK**. Son contenu racine est exactement `lca-version-finale/` et elle ne se contient pas elle-même.

## 17. Résultats SHA-256

`manifestes/SHA256SUMS.txt` couvre tous les fichiers livrés sauf lui-même et a été vérifié avant archivage puis après extraction. L'archive dispose du fichier adjacent `LCA-ERP-LIVRAISON-FINALE.zip.sha256`, vérifié avec `sha256sum -c`. L'empreinte n'est pas inscrite dans l'archive pour éviter une dépendance circulaire.

## 18. Réserves restantes

AUD-LCA-013 et AUD-LCA-014 restent ouvertes. AUD-LCA-024 est traitée pour les trois images d'exécution principales mais sans SBOM/signature et sans pinning de l'utilitaire Alpine. Restent également les contrôles d'infrastructure cible : TLS/DNS, profils réels, mono/multi-concession, volumétrie/RPO/RTO et scripts liés aux volumes `lca_*`.

## 19. Actions de l'exploitant

Approuver formellement la remise, vérifier l'empreinte via un canal indépendant, analyser/signaler le paquet selon la politique, fournir l'hôte et le coffre de secrets, prouver l'absence de collision des volumes, adapter DNS/TLS, lancer une installation isolée, créer puis faire tourner le compte initial, vérifier rôles/scopes, configurer supervision et sauvegardes, exécuter un restore drill, puis obtenir les validations sécurité, exploitation et métier avant production.

## 20. Fichiers créés

- `livrables/lca-version-finale/` ;
- `livrables/LCA-ERP-LIVRAISON-FINALE.zip` ;
- `livrables/LCA-ERP-LIVRAISON-FINALE.zip.sha256` ;
- `docs/RAPPORT-PREPARATION-LIVRAISON-LCA.md`.

## 21. État Git

Branche observée : `main`. Avant la préparation, 40 fichiers modifiés et cinq fichiers non suivis issus de la qualification étaient présents ; ils ont été préservés. La préparation ajoute le rapport et `livrables/` comme nouveaux éléments non suivis. Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche n'a été effectué.

## 22. Verdict de préparation

**B — PAQUET PRÊT AVEC RÉSERVES DOCUMENTÉES.** Les éléments indispensables sont présents, l'analyse ciblée n'a confirmé aucun secret, Compose est cohérent et l'intégrité répertoire/ZIP est démontrée. Les réserves ne sont pas masquées.

## 23. Conditions de remise au client

La remise nécessite : validation écrite de l'autorité de livraison, revue des réserves, transmission séparée de l'empreinte/signature, canal sécurisé, accusé de réception, désignation des responsables LCA/NOVA/BEROX, interdiction de joindre des secrets et planification d'un transfert technique. La production exige en plus la recette de l'infrastructure cible et les approbations sécurité, exploitation et métier.
