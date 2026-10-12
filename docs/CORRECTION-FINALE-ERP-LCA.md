# Correction globale et stabilisation finale — ERP LCA

Date : 12 octobre 2026. Mission exécutée sans navigateur, sans modification de données, migration appliquée, conteneur, volume, secret, commit ou push.

## 1. Résumé exécutif

Les 24 constats de l'audit ont été revérifiés. Vingt-et-un ont reçu une correction proportionnée ; trois risques d'infrastructure/performance restent reportés. Les sept P1 ont une correction livrée, dont la configuration TLS doit encore être instanciée et validée par l'exploitant. Les builds et les tests ciblés sont verts.

## 2. État initial

Le dépôt ne présentait au début de cette mission que le dossier non suivi `docs/audit-final-erp-lca/`, créé par l'audit précédent. Aucun changement source préexistant n'a été écrasé.

## 3. Périmètre

RBAC, scopes agence/concession/global, Socket.IO, annuaire, CRM, PDF, TLS de référence, GED, reporting, pool MySQL, authentification frontend/backend, pièces, avatars, healthcheck, accessibilité et Nginx.

## 4. Liste des 24 anomalies

Le registre ci-dessous reprend chaque identifiant une seule fois.

## 5. Anomalies confirmées

Les constats marqués corrigés ont été reconfirmés dans le code avant modification.

## 6. Faux positifs identifiés

Aucun faux positif complet. AUD-LCA-007 demeure conditionnelle à l'architecture TLS externe.

## 7. Anomalies corrigées

Vingt-et-une corrections complètes sont recensées dans le tableau.

## 8. Anomalies non corrigées

AUD-LCA-013, 014 et 024 restent des réserves ; 013 a reçu une mitigation partielle.

## 9. Justifications des reports

Les reports évitent une modification architecturale non qualifiée : timeout SQL généralisé, nouveau parseur streaming et gouvernance de digests nécessitent chacun un environnement et une décision d'exploitation dédiés.

| ID | Gravité initiale/retenue | Cause et correction | Fichiers principaux | Tests/résultat | Statut final |
|---|---|---|---|---|---|
| AUD-LCA-001 | P1/P1 | `LIMIT 1` arbitraire ; ordre déterministe et refus explicite des données multi-rôles, sans migration destructive | `rbac.service.ts` | test audit + typecheck : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-002 | P1/P1 | filtre générique ignorant la permission ; délégation aux contrôles de ressource conscients du scope | `agency-scope.ts` | test audit + contrôles RBAC existants : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-003 | P1/P1 | rooms calculées au handshake ; déconnexion sur `rbac:updated`, rôle, agence et mots de passe, NULL agence préservé | `socket.ts`, `user.service.ts` | NOTIF + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-004 | P1/P1 | DTO annuaire trop riche ; permissions et indicateur Super Admin supprimés, contrat sélecteur conservé | `user.service.ts` | test audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-005 | P1/P1 | transition fondée sur lecture obsolète ; UPDATE compare-and-swap et 409 au perdant | `crm.routes.ts` | matrice CRM + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-006 | P1/P1 | fetch PDF hors isolation ; `apiDownload` central | `invoicePdf.ts` | single-flight/session + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-007 | P1/P1 conditionnel | référence HTTP seule ; redirection 80→443, TLS 1.2/1.3 et HSTS dans le modèle hôte | `deploy/nginx-host.conf.example` | revue statique ; certificats absents par consigne | **CORRIGÉ MAIS NON VALIDÉ** |
| AUD-LCA-008 | P2/P2 | PATCH sans invariant final ; fusion logique et validation identité/contact | `crm.routes.ts` | test audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-009 | P2/P2 | scope après premier LIMIT ; parcours paginé déterministe jusqu'à 15 autorisés | `document-access.ts` | test audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-010 | P2/P2 | mutation et audit séparés ; transactions communes et audit version | `document.routes.ts` | GED + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-011 | P2/P2 | budget concession filtré sur agence nullable ; filtre `COALESCE(concession)` dédié | `financial-report.service.ts` | test audit/typecheck : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-012 | P2/P2 | permission facture contradictoire ; alignement sur `billing.invoice.view` | `document-access.ts` | GED + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-013 | P2/P2 | file DB illimitée ; queue 40 et timeout de connexion 10 s configurables. Timeout SQL métier non généralisé pour éviter une rupture transactionnelle | `env.ts`, `database.ts` | build/typecheck : OK ; charge non autorisée | **REPORTÉ AVEC JUSTIFICATION** |
| AUD-LCA-014 | P2/P2 | multipart entièrement en mémoire ; streaming exige un parseur et une requalification stockage/signature/abort disproportionnée dans cette intervention | `document-multipart.ts` | aucune modification | **REPORTÉ AVEC JUSTIFICATION** |
| AUD-LCA-015 | P2/P2 | JSON local non protégé ; parse validé et purge atomique | `authStore.ts` | session + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-016 | P2/P2 | modal sans piège/restauration ; focus, scroll et Tab gérés | `GlobalSearchModal.tsx` | test audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-017 | P2/P2 | fetch pièces direct/silencieux ; client central, abort et erreur visible | `SparePartsPage.tsx` | audit + typecheck : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-018 | P2/P2 | MIME avatar seul ; signatures JPEG/PNG/WebP vérifiées | `user-avatar.ts` | audit + GED sécurité : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-019 | P2/P2 | health public consommait SQL ; liveness sans DB | `app.ts` | audit + build : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-020 | P3/P3 | SQL NULL converti en chaîne ; conservation de `null` | `socket.ts` | NOTIF + audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-021 | P3/P3 | création session avant profil et écritures séparées ; profil préalable puis transaction session/last_login | `auth.service.ts` | test audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-022 | P3/P3 | tabs sans roving/flèches ; tabIndex et Arrow/Home/End | `Tabs.tsx` | test audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-023 | P3/P3 | route notifications sans garde ; `ModuleGuard` ajouté | `App.tsx` | audit : OK | **CORRIGÉ ET TESTÉ** |
| AUD-LCA-024 | P3/P3 | tags Docker sans digest ; les digests doivent être choisis et renouvelés par la chaîne de livraison, indisponible sans registre/SBOM approuvé | Dockerfiles/Compose | non modifié | **REPORTÉ AVEC JUSTIFICATION** |

Aucun faux positif ni constat non reproductible n'a été retenu. AUD-LCA-007 reste conditionnel à l'absence de terminaison externe, mais la référence livrée a été sécurisée.

## 10. Corrections RBAC

Résolution mono-rôle désormais déterministe et fail-closed sur données incohérentes ; aucun rôle ni donnée n'a été supprimé. Les métadonnées administratives ont été retirées de l'annuaire.

## 11. Corrections multi-agences

Le middleware aveugle ne bloque plus CONCESSION/GLOBAL. L'autorisation reste portée par les prédicats métier qui connaissent permission et ressource ; aucune agence existante n'est implicitement autorisée.

## 12. Corrections Socket.IO

Invalidation immédiate lors des événements RBAC et révocations sensibles ; changement d'agence notifié puis socket reconnectable avec un contexte neuf ; aucun compte NULL ne rejoint `agency:null`.

## 13. Corrections CRM

Transitions protégées par comparaison de l'ancien stage, conflit explicite 409, activité écrite uniquement par le gagnant. Les PATCH conservent identité et moyen de contact.

## 14. Corrections PDF

Les factures utilisent le mécanisme partagé de refresh, génération de session et rejet des réponses anciennes. Les autres téléchargements déjà centralisés sont inchangés.

## 15. Corrections TLS

La configuration hôte de référence redirige HTTP vers HTTPS, accepte TLS 1.2/1.3, fournit HSTS et conserve le proxy HTTP interne/API/WebSocket. Aucun certificat ni domaine réel n'a été créé.

## 16. Corrections P2

Onze P2 ont été corrigées ou significativement sécurisées ; AUD-LCA-013 reste partiellement mitigée et AUD-LCA-014 reportée. Nginx SPA ajoute aussi X-Frame-Options, Referrer-Policy et Permissions-Policy.

## 17. Corrections P3

Quatre P3 corrigées. Le pinning par digest (AUD-LCA-024) est reporté à la gouvernance des images.

## 18. Fichiers modifiés

22 fichiers existants : 13 backend, 2 configurations backend, 2 tests/configuration infrastructure, 7 frontend/configuration, plus deux nouveaux tests ciblés et ce rapport. Le détail exact est disponible via `git diff --stat` ; aucun fichier généré suivi n'a été ajouté.

## 19. Tests ajoutés ou adaptés

- `backend-node/test/audit-final-corrections.test.ts` : 10 contrôles ciblés.
- `frontend/test/audit-final-corrections.test.ts` : 6 contrôles ciblés.
- assertion Socket NULL adaptée dans `notifications-dynamic-reliability.test.ts`.

## 20. Résultats des tests

- Backend typecheck : **réussi**.
- Backend build : **réussi**.
- Backend ciblé : **44/44 réussis**, puis nouveau fichier **10/10**.
- Frontend typecheck : **réussi**.
- Frontend build Vite : **réussi**.
- Frontend ciblé session/API : **24/24 réussis**, puis nouveau fichier **6/6**.
- Campagne globale : tentative non retenue, car l'isolation native du runner est interdite par le sandbox (`EPERM` sur pipe IPC) et le mode sans isolation provoque une contamination des mocks entre fichiers. Elle a été interrompue ; ses échecs ne qualifient pas l'application.
- Un test historique Navigation isolé conserve un échec sans rapport avec cette mission sur le libellé NIU de Paramètres ; 22 autres assertions du fichier passent.
- Tests MySQL/Docker et charge : **non exécutés**, conformément à l'interdiction de réutiliser les environnements existants et faute d'environnement jetable autorisé/préparé.

## 21. Régressions détectées

Aucune régression causale détectée dans les tests ciblés, typechecks ou builds. L'échec historique NIU est indépendant des fichiers corrigés.

## 22. Régressions corrigées

Une assertion Socket a été adaptée au nouveau comportement correct `null`; aucune attente métier n'a été abaissée pour masquer un défaut.

## 23. Risques résiduels

Timeout des requêtes SQL longues non généralisé, buffering multipart GED, images Docker mobiles, validation dynamique multi-concession et certificats TLS réels.

## 24. Réserves de sécurité

L'exploitant doit monter les certificats, valider la chaîne HTTPS/WSS et confirmer l'absence d'un terminateur concurrent. La matrice RBAC multi-agence doit être rejouée sur une base jetable représentative.

## 25. Réserves de performance

La queue DB est désormais bornée et la connexion temporisée, mais les budgets de temps par requête restent à définir. GED doit migrer vers un parseur streaming après qualification dédiée.

## 26. État Git initial et final

Initial : seulement `?? docs/audit-final-erp-lca/`. Final : modifications listées ci-dessus, deux tests et ce rapport non suivis. `git diff --check` est réussi. Aucun index, commit, branche ou historique modifié.

## 27. Verdict technique

**FAVORABLE SOUS RÉSERVES** : P1 corrigées, builds et tests ciblés verts ; validation MySQL/multi-concession/TLS réelle encore humaine.

## 28. Verdict fonctionnel

**FAVORABLE POUR QUALIFICATION CONTRÔLÉE**, pas une autorisation de distribution. Les contrats principaux sont conservés ; l'annuaire retourne toujours les champs requis aux sélecteurs.

## 29. Verdict sécurité

**AMÉLIORÉ ET ACCEPTABLE POUR RECETTE ISOLÉE**, sous réserve d'instancier TLS et de rejouer les matrices RBAC/Socket sur données représentatives.

## 30. Recommandations avant livraison

1. Créer une base MySQL 8.4 jetable et exécuter intégrations RBAC, concurrence CRM, GED et reporting.
2. Valider `nginx -t`, HTTPS, HSTS, WSS et uploads avec les certificats réels.
3. Réaliser une charge contrôlée hors environnements existants sur pool/rapports/uploads.
4. Planifier le streaming multipart et le pinning digest/SBOM.
5. Rejouer la campagne complète avec isolation de processus disponible.

## Verdict final A–T

| Indicateur | Résultat |
|---|---|
| A. Anomalies corrigées | 21 (dont 1 TLS non validée dynamiquement) |
| B. P1 corrigées | 7/7 |
| C. P2 corrigées | 10/12 ; 1 partiellement mitigée, 1 reportée |
| D. P3 corrigées | 4/5 |
| E. Faux positifs | 0 |
| F. Anomalies restantes | 3 réserves : 013, 014, 024 |
| G. P0/P1 ouvertes | 0 dans le code livré ; activation TLS humaine requise |
| H. Tests backend | ciblés 44/44 + 10/10, typecheck/build OK |
| I. Tests frontend | ciblés 24/24 + 6/6, typecheck/build OK |
| J. Tests RBAC | statiques/ciblés OK ; matrice MySQL non exécutée |
| K. Tests concurrence | matrice/compare-and-swap statiques OK ; MySQL réel non exécuté |
| L. Tests sécurité | GED/notifications/session ciblés OK |
| M. Builds | backend et frontend réussis |
| N. Régressions découvertes | 0 liée aux corrections |
| O. Régressions corrigées | 0 ; une assertion adaptée au comportement voulu |
| P. Risques résiduels | SQL long, upload mémoire, digests, validation dynamique |
| Q. Fichiers modifiés | 22 existants + 2 tests + 1 rapport |
| R. Verdict technique | favorable sous réserves |
| S. Préparation livraison | prête pour qualification isolée, pas pour distribution/production |
| T. Actions humaines | MySQL jetable, TLS réel, campagne isolée, charge contrôlée, décision de livraison |

**Aucune autorisation de distribution ou de mise en production n'est donnée par ce rapport.**
