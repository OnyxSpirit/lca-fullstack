# Clôture de qualification technique ERP LCA

Date : 12 octobre 2026  
Projet : ERP / CRM La Congolaise de l'Automobile  
Prestataire : BEROX

## 1. Résumé exécutif

La qualification technique est achevée. Les 38 fichiers initialement rouges ont été corrigés et rejoués. Les suites finales sont vertes : **231/231 fichiers backend** (227 historiques et 4 nouvelles preuves d'intégration) et **153/153 fichiers frontend**. Une régression applicative réelle, découverte par la recette GED générique, a été corrigée : l'insertion SQL d'une nouvelle version documentaire comportait un placeholder de trop.

Le reporting MySQL 8.4, les scopes AGENCY/CONCESSION/GLOBAL et le refus OWN inadapté, la GED, les PDF après révocation de session, HTTPS et WSS ont été validés dynamiquement sur des ressources jetables. Aucun projet Docker historique n'a été arrêté, recréé ou modifié.

Verdict : **B. QUALIFIÉ AVEC RÉSERVES NON BLOQUANTES**. Les réserves portent sur l'absence de timeout par requête SQL, le buffering mémoire des uploads GED et l'application effective des digests vérifiés dans le paquet de livraison. Elles ne constituent pas un P0/P1 ouvert, sous les limites d'exploitation précisées ci-dessous.

## 2. Situation initiale

- Backend : 203/227 fichiers réussis, 24 rouges.
- Frontend : 139/153 fichiers réussis, 14 rouges.
- Reporting MySQL bloqué par des JWT sans `sid` ni session persistée.
- GED/PDF et HTTPS/WSS non prouvés dynamiquement.
- Réserves ouvertes : AUD-LCA-013, AUD-LCA-014 et AUD-LCA-024.

## 3. Périmètre exécuté

- triage et correction des 38 fichiers rouges ;
- correction des fixtures d'authentification et du script fresh RBAC ;
- MySQL 8.4, baseline 71 et migrations 72 à 79 ;
- reporting, RBAC multi-agences et multi-concessions ;
- GED/PDF, versions, archive, audit, rollback et révocation ;
- terminaison TLS Nginx et WSS Socket.IO ;
- saturation SQL et mémoire GED bornées ;
- vérification registry des manifests Docker ;
- typechecks, builds et suites complètes.

## 4. Environnement temporaire

Projet Docker : `lca-closeqa-20261012-b72c`. MySQL 8.4 sur `127.0.0.1:13384`, données en `tmpfs`, stockage GED sous `/tmp/lca-closeqa-20261012-b72c-ged`, backend temporaire sur `127.0.0.1:13082`, Nginx temporaire sur `127.0.0.1:14080/14443`, certificat auto-signé d'une journée. Toutes ces ressources ont été supprimées.

Après nettoyage, `lca`, `lca-recette`, `lca-qualification`, `lca-requalification` et `lca-restauration` étaient chacun `running(3)`.

## 5. Classification des 38 fichiers rouges

Légende : A test obsolète ; B fixture obsolète ; C mock incomplet ; D assertion liée à la structure ; F régression applicative. Tous les résultats ci-dessous sont **RÉUSSIS** après correction, sans réserve individuelle sauf mention contraire.

| Fichier | Classe | Cause et correction |
|---|---:|---|
| backend `auth-session-revocation` | C | mock DB sans export `transaction` ; transaction simulée sans désactiver le contrôle de session |
| backend `commercial-residuals` | B | permissions, contexte concession, snapshots et réponses de confidentialité obsolètes ; fixtures alignées sur RBAC et 404 anti-énumération |
| backend `commercial-tax` | D | pagination PDF déplacée vers `document-layout` ; assertion portée sur le module responsable |
| backend `commercial-transversal-routes` | B | rôle de test sans permission/scope explicite ; fixture AGENCY et assertion sur le prédicat réellement appliqué |
| backend `concession-workflow-conformity` | D | assertions sur anciennes localisations d'implémentation ; contrats courants vérifiés |
| backend `crm-appointment-endpoint` | C | mocks de contexte agence/RBAC incomplets ; réponses nécessaires ajoutées |
| backend `crm-assignment-endpoint` | C | helper d'auth interceptait les requêtes RBAC propres au test ; interception rendue optionnelle |
| backend `delivery-candidates` | C | même contamination du helper RBAC ; mock spécifique préservé |
| backend `delivery-document-security` | A | attente antérieure au téléchargement centralisé/protégé ; contrat 401/404 actuel vérifié |
| backend `delivery-financial-authorization` | D | assertion de source trop stricte après extraction de service ; invariant métier conservé |
| backend `delivery-services` | D | même dérive structurelle ; archive, audit et temps réel toujours vérifiés |
| backend `fin01-billing-export` | D | détails internes d'implémentation retirés de l'assertion ; format et sécurité d'export conservés |
| backend `ged-business-archive` | D | résolution/archivage déplacés ; assertions réorientées vers l'API de service actuelle |
| backend `ged-ux-03` | D | assertion textuelle devenue trop précise ; invariant GED maintenu |
| backend `lot14c1-vehicle-foundation` | D | baseline consolidée et writers déplacés ; attentes actualisées |
| backend `sale-direct-tax-01` | D | calcul fiscal extrait ; test pointe le service canonique |
| backend `sav-finance-03` | D | agrégat SAV refactoré par origine ; requêtes financières réelles vérifiées |
| backend `sav-workshop-suppliers-compliance` | D | permission fournisseur renommée/dynamique ; seed actuel vérifié |
| backend `settings-concession-dynamic` | D | écriture d'audit centralisée ; invariant et événement conservés |
| backend `showroom-scope-matrix` | C | mocks incomplets pour contexte agence, locks et courses ; matrice 105/105 rétablie |
| backend `stock-parc-fix` | D | contrôle stock déplacé ; invariant métier vérifié au bon niveau |
| backend `super-admin-system` | A | attente incompatible avec le Super Admin système réservé ; protection réelle vérifiée |
| backend `treasury-flow-integration` | D | activation/audit répartis entre route et service ; assertions actualisées |
| backend `vehicle-return-lot9` | D | baseline et service financier réorganisés ; invariants retour/stock conservés |
| frontend `billing-stabilization` | D | condition `disabled` enrichie par le readiness de vente ; attente complète |
| frontend `commercial-role-alignment` | D | validation rendez-vous extraite en policy ; fonction et conversion ISO vérifiées |
| frontend `concession-workflow-conformity` | D | noms d'états internes changés ; blocage financier/idempotence vérifiés |
| frontend `navigation` | A | libellé NIU stocké sous forme de tuple canonique ; absence de NIF et présence NIU vérifiées |
| frontend `numeric-input-ux.behavior` | D | formatage et état de formulaire réorganisés ; vide/zéro/entier toujours testés |
| frontend `preproduction-corrections` | A | garde prix désormais autoritaire côté backend et candidats livraison déjà filtrés par API |
| frontend `quotations-dynamic-rbac` | D | hook paginé remplace l'ancien hook ; garde `quotations.view` conservée |
| frontend `receptionist-rbac` | D | nouveaux verrous stock et libellés ; absence de mutations non autorisées maintenue |
| frontend `recette-critique-01` | D | requête CRM paginée ; filtre commercial toujours transmis |
| frontend `recette-critique-02` | A | prix minimum remplacé par `pricing-guard` backend ; limite de remise conservée |
| frontend `sav-finance-03` | A | libellés précisés en valeurs nettes ; champs financiers inchangés |
| frontend `sav-or-ux04.behavior` | D | décision client exprimée par `approvalActive` ; verrous persistants conservés |
| frontend `sav-or19.behavior` | D | forme de mapping modifiée ; historique complet sans déduplication reste vérifié |
| frontend `treasury-flow-integration` | D | métadonnées d'audit exposées par le hook ; readiness et audit toujours présents |

## 6. Corrections des tests et fixtures

Le helper `auth-session-fixture` n'intercepte les requêtes RBAC que lorsque `mockRbac` est demandé. Les tests reporting créent désormais un `refresh_tokens.id`, placent ce `sid` dans le JWT et utilisent une session non révoquée. Le script fresh RBAC fournit `firstName` aux trois créations CRM. Aucun middleware de sécurité n'a été contourné.

Quatre preuves reproductibles ont été ajoutées : GED HTTP MySQL, révocation PDF, réserves SQL/GED et proxy WSS.

## 7. Correction applicative

**F — régression réelle corrigée** dans `document.routes.ts` : `POST /documents/:id/version` produisait `ER_WRONG_VALUE_COUNT_ON_ROW`. La liste des placeholders a été réalignée sur les 22 colonnes et 20 paramètres (deux valeurs littérales). Preuve : le scénario de version passe en 201, crée `version=2` et référence le `parent_document_id`; typecheck, build et 231/231 fichiers backend passent ensuite.

## 8. Reporting MySQL et RBAC

| Scénario | Méthode | Attendu / obtenu | Statut |
|---|---|---|---|
| Réconciliation finance, CSV et scopes | HTTP authentifié + SQL MySQL 8.4 | montants AGENCY/CONCESSION/GLOBAL exacts, inter-agences refusée | RÉUSSI |
| SAV dates financières | factures, paiements, remboursement datés | septembre 100 000, octobre 100 000, novembre -60 000 pour l'agence | RÉUSSI |
| Ventes/marges | données persistées | 25 M concession, 45 M global, annulations exclues | RÉUSSI |
| Stock actuel | données multi-agences | périmètres et CSV cohérents | RÉUSSI |
| Dates/granularités invalides | HTTP | validation/refus attendus | RÉUSSI |

Résultat : **5/5**. Le passage de `reporting.view` à OWN est fail-closed pour un agrégat non compatible. L'absence de permission retourne 403. Les scopes CONCESSION et GLOBAL retournent des données réelles, pas seulement un passage middleware.

## 9. GED et PDF

La recette `document-marks` a réussi **11/11** sous-scénarios : formats réels, fichiers falsifiés, historique byte-identique, idempotence, scopes OWN/AGENCY/CONCESSION/GLOBAL, IDOR inter-agence/inter-concession, courses de remplacement/désactivation, rollback fichier + SQL + snapshot + audit + realtime, puis retry.

La recette GED générique a validé upload autorisé/interdit, téléchargement, masquage inter-agence, accès concession, refus inter-concession, accès global, pagination `pageSize=1`, version 2, archive, lecture d'archive réservée, restauration et audit.

La recette PDF/session a obtenu 200 avec une session active, 401 après révocation du même `sid`, puis 200 avec une nouvelle session légitime. L'isolation frontend a réussi **9/9** : purge cache/état UI au logout, changement de session ou d'agence, et rejet d'une réponse de l'ancienne session encore en vol.

## 10. HTTPS et WSS

- `nginx -t` : RÉUSSI.
- HTTP 14080 vers HTTPS 14443 : 301 RÉUSSI.
- TLS 1.2 : `ECDHE-RSA-AES256-GCM-SHA384`, certificat auto-signé attendu.
- HSTS et proxy `/api/health` : 200 RÉUSSI.
- `/uploads` traversé via le backend, ressource absente 404 ; document sans jeton 401.
- WSS `/socket.io`, namespace `/realtime` : session persistée acceptée ; jeton invalide refusé avec `Jeton invalide`.
- `X-Forwarded-For`, `X-Real-IP` et `X-Forwarded-Proto` sont configurés sur la passerelle testée ; le backend était réglé avec `TRUST_PROXY_HOPS=1`.

L'application n'utilise pas de cookie d'authentification : login/refresh renvoient des jetons JSON. La vérification d'un attribut de cookie `Secure` est donc **NON APPLICABLE**, et non déclarée réussie. Les certificats réels restent une responsabilité de déploiement.

## 11. AUD-LCA-013 — SQL

La configuration de production reste bornée : `connectionLimit=10`, `queueLimit=40`, `connectTimeout=10000`, transactions avec rollback et retry de deadlock ciblé. Un test réduit à pool 2/file 2 et cinq requêtes `SLEEP(0.25)` a produit quatre succès, un refus de file et une durée totale de 781 ms. Le rollback a été vérifié.

Risque résiduel : une requête déjà envoyée n'a pas de budget de temps global. Risque **modéré et acceptable** sous supervision des requêtes lentes, métriques pool, seuils d'alerte et capacité bornée. Ne pas ajouter un timeout global susceptible d'interrompre une transaction légitime sans étude par route.

## 12. AUD-LCA-014 — GED

Deux parsings multipart concurrents de 15 Mio ont ajouté 62 Mio RSS dans la mesure contrôlée ; le dépassement a retourné 413. Le parseur conserve les chunks puis effectue `Buffer.concat`, donc plusieurs copies transitoires existent.

Risque **modéré et non bloquant** avec `client_max_body_size`, limite applicative 15 Mio et concurrence d'upload bornée au proxy/exploitant. Limite recommandée : au plus deux uploads de taille maximale simultanés par instance tant qu'un streaming vers fichier temporaire n'est pas développé. Le streaming reste une amélioration séparée.

## 13. AUD-LCA-024 — digests Docker

Manifests interrogés directement auprès du registre officiel le 12 octobre 2026 :

| Image | Digest index multi-architecture | Manifest linux/amd64 |
|---|---|---|
| `node:22-bookworm-slim` | `sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392` | `sha256:efd0ab5780c2d9ab1f0f869571a00d5edb17793bff4cce4a2792e3eb0ffc7562` |
| `mysql:8.4` (8.4.11) | `sha256:6ea90827b1100f8f2ae306a539f86d2c264a26ed435a2a9f75551dd5c3aeb242` | `sha256:80f4933e3835f9dc4d35a28ec500d7986cb4414e6c6821c5461239cb7beb8995` |
| `nginx:1.27-alpine` (1.27.5) | `sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10` | `sha256:62223d644fa234c3a1cc785ee14242ec47a77364226f1c811d2f669f96dc2ac8` |

Les tags sont compatibles `linux/amd64` et `linux/arm64/v8`. Les digests locaux Node/MySQL différaient des tags registry actuels : ils n'ont pas été recopiés. Aucun Dockerfile/Compose historique n'a été modifié. L'épinglage par digest index et la génération SBOM doivent être appliqués dans le paquet de livraison contrôlé.

## 14. Résultats des suites

- Backend typecheck : RÉUSSI.
- Backend build : RÉUSSI.
- Backend historique corrigé : 227/227.
- Backend final avec nouvelles preuves : **231/231**, zéro timeout, zéro échec.
- Frontend typecheck : RÉUSSI.
- Frontend build Vite : RÉUSSI.
- Frontend final : **153/153**, zéro timeout, zéro échec.
- `git diff --check` : RÉUSSI.

Les tests ont été exécutés fichier par fichier avec `--experimental-test-isolation=none`, chaque fichier dans un processus distinct et un timeout de 120 secondes. Les intégrations conditionnelles citées dans ce rapport ont aussi été exécutées explicitement avec leur variable d'activation ; elles ne sont pas assimilées à leurs exécutions `skip` de la campagne générale.

## 15. Régressions découvertes et corrigées

Une seule régression applicative a été confirmée : création d'une version GED en erreur SQL 500. Elle est corrigée et couverte par un test MySQL HTTP. Aucun autre défaut P0/P1 n'a été confirmé. Les 38 rouges initiaux relevaient de A à D, pas d'un affaiblissement métier.

## 16. Tests non exécutés

- Certificats TLS réels et DNS d'exploitation : **NON EXÉCUTÉ**, opération de déploiement.
- Validation fonctionnelle utilisateur/client : **NON EXÉCUTÉ**, distincte de la qualification technique.
- Charge longue durée ou stress non borné : **NON EXÉCUTÉ** volontairement ; interdit par le périmètre prudent.
- SBOM/signature des images et déploiement des références digest : **NON EXÉCUTÉ**, action de paquetage/livraison.

## 17. Anomalies et risques résiduels

Aucune anomalie P0/P1 applicative confirmée ne reste ouverte. Restent trois réserves non bloquantes : timeout SQL par requête non généralisé, GED bufferisée, tags Docker non encore remplacés par les digests vérifiés. HTTPS est validé localement avec certificat auto-signé, pas avec les certificats de production.

## 18. Fichiers modifiés

- une correction applicative ciblée : `backend-node/src/modules/documents/document.routes.ts` ;
- fixtures/tests backend des 24 rouges, helper de session, reporting et fresh RBAC ;
- tests frontend des 14 rouges ;
- quatre tests d'intégration ajoutés : GED HTTP, PDF/session, réserves, WSS ;
- présent rapport.

Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche n'a été effectué.

## 19. Actions humaines nécessaires

1. Appliquer les digests index vérifiés dans le paquet de livraison, produire et archiver le SBOM.
2. Installer les certificats réels, configurer DNS et vérifier la chaîne de confiance lors du déploiement.
3. Borner opérationnellement la concurrence des uploads GED à deux fichiers maximaux par instance et surveiller RSS.
4. Activer le slow query log/observabilité du pool et définir des budgets ciblés uniquement pour les routes démontrées lentes.
5. Faire réaliser la validation fonctionnelle client et l'autorisation de mise en production séparément.

## 20. Verdict final

**B. QUALIFIÉ AVEC RÉSERVES NON BLOQUANTES.**

La qualification technique demandée est terminée : suites vertes, sécurité critique concluante, reporting et scopes réels validés, GED/PDF et rollback concluants, HTTPS/WSS qualifiés au niveau local disponible. Les réserves restantes sont explicites, mesurées et relèvent de l'exploitation ou du paquetage. Ce verdict ne constitue ni validation fonctionnelle client, ni autorisation de distribution, ni autorisation de production.
