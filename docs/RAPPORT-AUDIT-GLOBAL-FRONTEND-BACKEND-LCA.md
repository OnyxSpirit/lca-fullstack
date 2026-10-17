# Rapport d'audit global frontend/backend — ERP LCA

Date : 17 octobre 2026

Nature : audit en lecture seule du code fonctionnel

Verdict global : **PARTIELLEMENT CONFORME — non qualifiable pour livraison en l'état**

## 1. Résumé exécutif

L'ERP est un produit substantiel et non une maquette : 23 domaines frontend, 24 domaines backend, 555 déclarations de routes Express, 57 migrations et une couverture fonctionnelle allant du CRM à la trésorerie, RH, SAV, GED, reporting et sécurité 2FA. Les quatre validations de compilation/lint réussissent. Les mécanismes sensibles utilisent couramment transactions, verrous, contrôles RBAC et audit.

La qualification finale reste bloquée par quatre faits : 34 tests frontend sur 172 échouent; la suite backend globale ne termine pas et présente plusieurs échecs; la gestion personnelle des appareils 2FA possède un contrat RBAC frontend/backend incompatible; aucun test HTTP ou navigateur réel n'a pu être exécuté sans environnement isolé explicitement établi. Des événements temps réel émis ne sont par ailleurs pas consommés.

Réponse explicite demandée : **« Faire confiance à cet appareil pendant 7 jours » est PARTIELLEMENT fonctionnel de bout en bout.** La création, le cookie, l'expiration absolue, la rotation et la connexion suivante sont implémentés et couverts par cinq tests backend 2FA réussis. Cependant la gestion personnelle peut échouer en 403, et aucun parcours HTTP/navigateur réel n'a validé la chaîne complète.

## 2. Méthodologie

L'audit a combiné inventaire statique exhaustif, rapprochement des routes/hooks/permissions, lecture ciblée des services SQL et Socket.IO, lint, builds et tests existants. Aucun endpoint réel, navigateur, Docker ou schéma métier n'a été sollicité. Les statuts signifient : `CONFORME` seulement lorsqu'une preuve adéquate réussit; `PARTIELLEMENT CONFORME` quand le code est cohérent mais la validation est incomplète ou une réserve existe; `NON CONFORME` lorsqu'un défaut est démontré; `NON VÉRIFIÉ` sans preuve suffisante.

## 3. Environnement

- Dépôt : `lca-fullstack`, branche observée `main`.
- Frontend : React 19, TypeScript, TanStack Query, Zustand, Socket.IO client.
- Backend : Node.js, Express 5, TypeScript, MySQL 8.4, Socket.IO, JWT/TOTP.
- Arbre de travail préexistant préservé; seuls le présent rapport et ses annexes ont été ajoutés.
- Aucun commit, push, reset, restore, stash, clean, changement de branche, migration, reconstruction Docker ou déploiement.

## 4. Inventaire exhaustif

L'inventaire détaillé se trouve dans [INVENTAIRE-MODULES.md](./audit-global/INVENTAIRE-MODULES.md), les 555 routes dans [CATALOGUE-ROUTES-API.md](./audit-global/CATALOGUE-ROUTES-API.md), et toutes les surfaces interactives détectées dans [INVENTAIRE-INTERACTIONS-FRONTEND.md](./audit-global/INVENTAIRE-INTERACTIONS-FRONTEND.md).

Les domaines backend supplémentaires `core`, `quotations`, `rbac` et `document-marks` sont consommés par des pages transversales plutôt que par un dossier frontend homonyme. Inversement `service`, `modules-portal` et `errors` sont des compositions frontend; `service` s'appuie principalement sur workshop/parts/billing/customers/documents.

## 5. Audit 2FA

### Chaîne appareil de confiance

| Exigence | Preuve | Statut |
|---|---|---|
| Désactivé par défaut, activable | paramètres par défaut `false`; endpoints view/manage et step-up | Conforme statiquement + test ciblé |
| 7 jours par défaut, 30 jours maximum | defaults frontend/backend; `Math.min(duration,max,30)` | Conforme statiquement + test ciblé |
| Consentement explicite | booléen par défaut faux, envoyé seulement après choix | Conforme statiquement |
| Jeton opaque/hash seul | 32 octets aléatoires base64url; SHA-256 en base | Conforme statiquement |
| Cookie | HttpOnly, Secure en production, SameSite Strict, path `/api/auth`, date d'expiration | Conforme statiquement |
| Mot de passe maintenu | consommation du device après vérification du mot de passe | Conforme statiquement + test ciblé |
| Expiration absolue | `expires_at` conservé pendant rotation; aucune extension glissante | Conforme statiquement + test ciblé |
| Rotation transactionnelle | `SELECT ... FOR UPDATE`, hash remplacé conditionnellement | Conforme statiquement + test ciblé |
| Révocations | utilisateur/admin/mot de passe/reset/désactivation compte/2FA | Conforme statiquement + test ciblé |
| Step-up | appareil de confiance ne fixe pas artificiellement `strong_auth_at`; opérations sensibles le vérifient | Conforme statiquement + test ciblé |
| Recovery | le chemin recovery n'appelle pas la création d'appareil | Conforme statiquement + test ciblé |
| Gestion personnelle | UI sur `auth.2fa.view`, API sur `auth.2fa.devices.*` | **Non conforme — AUD-2FA-001** |

Le centre de sécurité conserve ses six espaces, est intégré à « Utilisateurs & RBAC », interprète `?section=mine`, affiche uniquement le panneau personnel dans cette section et nettoie les caches. L'overview est authentifié et son service refuse l'accès si aucune permission 2FA pertinente n'existe.

**Verdict 2FA : CONFORME AVEC RÉSERVES.** Code : implémenté. Tests automatisés ciblés : 5/5 PASS. HTTP réel : non vérifié. Navigateur : non vérifié. Fonction 7 jours : **PARTIELLEMENT**.

## 6. Audit module par module

Les pages, routes, interactions, permissions, tableaux et filtres complets sont dans les annexes. Ce tableau donne pour chaque domaine les fonctions, données majeures, risques et verdict.

| Module | Fonctions et données principales | RBAC/workflows | Anomalies ou limites | Verdict |
|---|---|---|---|---|
| Activité | journal, détails, filtres acteur/module/action/contexte/territoire/date, PDF | `activity.view`, scopes territoriaux | HTTP/PDF non vérifiés | Partiellement conforme |
| Auth/2FA | login, JWT/refresh, TOTP, recovery, step-up, policies, appareils | permissions `auth.2fa.*`; tables user/session/2FA | AUD-2FA-001/002, AUD-SEC-001 | Non conforme sur gestion personnelle; reste partiel |
| Facturation | factures, émission, paiement, avoir, remboursement, exports | `billing.*`; vente→facture→encaissement | tests financiers frontend en échec | Partiellement conforme |
| CRM | prospects, activités, rendez-vous, affectation, pipeline, essai, devis | `crm.*`, `quotations.*`; prospect→client→vente | tests endpoints CRM backend observés en échec | Partiellement conforme |
| Clients | liste, fiche 360, contacts, historique | `customers.*` plus droits GED/vente/SAV | test customers360 backend observé en échec | Partiellement conforme |
| Dashboard/core | indicateurs, raccourcis, recherche globale | `dashboard.view`, actions conditionnelles | données réelles non vérifiées | Partiellement conforme |
| Livraisons | préparation, checklist, services, autorisation financière, signature, documents | `delivery.*`; vente→livraison | tests candidats/documents en échec; RT non consommé | Partiellement conforme |
| Cachets/signatures | politiques, cachets, signature personnelle | `stamp.*`, `signature.*`, intégration documents/livraison | tests de marques frontend en échec | Partiellement conforme |
| GED | dépôt, aperçu, versions, archive/restauration, rattachements | `ged.*`, contrôles d'entité | plusieurs suites GED en échec; MIME/rendu non vérifiés | Partiellement conforme |
| RH | employés, contrats, congés, primes, salaires, rémunérations, budgets, dépenses, stock | riche matrice `hr.*`; RH→budget→trésorerie | nombreuses suites RH/finance en échec | Partiellement conforme |
| Notifications | liste, lu/non lu, archive/suppression, son temps réel | `notifications.*`, room utilisateur | livraison réelle non vérifiée | Partiellement conforme |
| Pièces | catalogue, stocks, emplacements, réservations, commandes, fournisseurs, factures | `parts.*`, `supplier.*`; atelier→réservation→consommation | RT fournisseurs non consommé; tests PO en échec | Partiellement conforme |
| Rapports | consolidé, atelier, financier, CSV/PDF | `reporting.*` et permissions sources | exports/rendus non vérifiés | Partiellement conforme |
| Ventes | création, affectation, remise, taxe, garantie, statut/annulation | `sales.*`; CRM/devis→vente→facture | `sales:updated` non consommé; tests garantie en échec | Partiellement conforme |
| SAV/service | OR, réception, diagnostic, devis, approbation, travaux, QC, facture, remise | backend workshop/parts/billing; `service.*`/`workshop.*` | suites SAV en échec; pas de HTTP réel | Partiellement conforme |
| Paramètres | agences, ressources, constructeurs, références, cachets, services | `settings.*` et permissions spécialisées | événements tarifs non consommés | Partiellement conforme |
| Showroom | file visiteurs, affectation, prise en charge, essai, conversion | `showroom.*`, `crm.test_drive.create` | multi-session non vérifiée | Partiellement conforme |
| Trésorerie | comptes, catégories, encaissements/décaissements, réservations, couverture, rapprochement, flux | `treasury.*`, scopes territoriaux, intégration RH/billing | nombreuses suites en échec; schéma réel non vérifié | Partiellement conforme |
| Utilisateurs/RBAC | collaborateurs, rôles, matrice, statuts, mots de passe, centre 2FA | `users.*`, `roles.*`, `auth.2fa.*` | tests dynamiques fragiles; appareil personnel non conforme | Partiellement conforme |
| Retours véhicule | demande, inspection, décision, résolution financière, réception et remise stock | séquence transactionnelle `vehicle.return.*` | événements RT non consommés | Partiellement conforme |
| Véhicules | stock, fiche, images, transferts, affectations, statut, garantie | `vehicles.*`; stock→vente/atelier | tests cycle garantie en échec | Partiellement conforme |
| Atelier/planning | ressources, techniciens, baies, rendez-vous, sessions, productivité | `workshop.*`, verrous sessions | événements rendez-vous/pause/reprise non consommés | Partiellement conforme |
| Portail/erreurs | navigation modules, accès refusé, 404 | gardes dynamiques de modules | test navigation en échec | Partiellement conforme |

## 7. Matrice frontend/backend

Voir [MATRICE-API-FRONTEND-BACKEND.md](./audit-global/MATRICE-API-FRONTEND-BACKEND.md). Les familles d'API ont un routeur correspondant. L'écart contractuel démontré est AUD-2FA-001. Les suites en échec interdisent de qualifier globalement les contrats comme conformes.

## 8. Audit des tableaux

Voir [MATRICE-TABLEAUX-FILTRES.md](./audit-global/MATRICE-TABLEAUX-FILTRES.md). Les listes majeures exposent chargement, erreur, vide, pagination et actions. Les compteurs/paginations sont généralement issus du serveur; leur exactitude avec données réelles est non vérifiée. Les échecs des tests de pagination, trésorerie, RH, GED, livraisons et SAV constituent les réserves prioritaires.

## 9. Audit des filtres

La matrice annexe recense recherches, sélecteurs, dates et pagination. Les composants réinitialisent le plus souvent la page à 1 lors d'un changement de filtre. Les filtres territoriaux/activity et financiers sont transmis au serveur; aucune preuve HTTP/SQL réelle ne confirme ici leur résultat. Statut transversal : partiellement conforme.

## 10. Audit des formulaires

Les formulaires utilisent contraintes HTML, validations React, contrôles backend, messages d'erreur et invalidations Query. Les workflows financiers emploient des confirmations et protections serveur. Les 34 échecs frontend incluent toutefois plusieurs formulaires critiques; leur qualification exige des tests isolés puis navigateur. Aucun bouton n'a été déclaré fonctionnel sur la seule présence d'un `onClick` : leur inventaire indique handler/hook/API quand détectable.

## 11. Audit des workflows

| Workflow | Constat statique | Statut |
|---|---|---|
| CRM→prospect→client→devis→vente | Routes/services présents, transactions et notifications; tests CRM en échec | Partiel |
| Stock→réservation→vente→facture→paiement→livraison | États et contrôles présents; tests garantie/livraison/finance en échec | Partiel |
| Showroom→affectation→essai→conversion | Chaîne présente et événements CRM | Partiel, HTTP non vérifié |
| SAV→OR→atelier→pièces→facturation | Chaîne riche, permissions et transitions | Partiel, suites SAV en échec |
| RH→rémunération→budget→dépense→trésorerie | Services interdomaines et événements présents | Partiel, nombreuses suites en échec |
| Retours→résolution financière→stock | Séquence transactionnelle, verrous et idempotence visibles | Partiel, non testé réellement |

## 12. Audit RBAC

Voir [MATRICE-RBAC.md](./audit-global/MATRICE-RBAC.md). Le backend applique largement `requirePermission`, `assertPermission`, prédicats de scope et contrôles de ligne; le frontend masque ou désactive selon les permissions. Les scopes OWN/AGENCY/CONCESSION/GLOBAL sont matérialisés côté serveur. L'écart confirmé est le vocabulaire personnel des appareils 2FA. L'isolation réelle interagence n'a pas été testée par HTTP et reste une réserve P1.

## 13. Audit Socket.IO

Voir [AUDIT-SOCKET-IO.md](./audit-global/AUDIT-SOCKET-IO.md). Authentification de socket et rooms territoriales sont présentes. Treize familles d'événements émises ne déclenchent aucune invalidation frontend explicite; risque P2 de données obsolètes pour les autres sessions.

## 14. Audit SQL/migrations

Voir [AUDIT-SQL-MIGRATIONS.md](./audit-global/AUDIT-SQL-MIGRATIONS.md). Les migrations et requêtes sont riches en FK/index/transactions/verrous. Aucune base active n'a été interrogée et aucune migration exécutée; conformité du schéma réel non vérifiée.

## 15. Résultats des tests

Voir [RESULTATS-TESTS.md](./audit-global/RESULTATS-TESTS.md). Synthèse : lint/build backend et frontend PASS; tests 2FA ciblés 5/5 PASS; frontend global 138/172 PASS; backend global non terminé avec échecs observés; HTTP et navigateur non exécutés.

## 16. Anomalies détaillées

Voir [CATALOGUE-ANOMALIES.md](./audit-global/CATALOGUE-ANOMALIES.md). Aucun P0 démontré. Trois P1 principaux : appareil 2FA personnel, stockage JWT localStorage, suites automatisées non qualifiées. Les événements temps réel orphelins sont P2; le libellé 2FA obsolète est P3.

## 17. Fonctionnalités manquantes

Aucune grande famille métier annoncée n'est totalement absente du code. Les manques démontrés concernent surtout la consommation frontend de certains événements temps réel et l'alignement d'autorisation des appareils personnels. L'absence de preuve dynamique ne doit pas être reformulée comme absence d'implémentation.

## 18. Risques de sécurité

1. **P1 — JWT dans localStorage** : impact XSS élevé, en particulier pour le refresh token.
2. **P1 — contrat 2FA personnel** : blocage fonctionnel, pas une élévation démontrée; la route reste plus restrictive que l'UI.
3. **Réserve P1 — territorialité** : code de scopes présent, mais aucune campagne HTTP multi-rôle/interagence fraîche.
4. **Réserve P2 — fichiers/PDF** : contrôles présents mais MIME, rendu et téléchargement réel non rejoués.

## 19. Régressions potentielles

Les échecs automatisés se concentrent sur la finance, RH, GED, SAV, livraisons, garantie, navigation et isolation de session. Ils peuvent inclure des tests obsolètes, comme prouvé pour une assertion textuelle de permissions dynamiques, mais doivent être triés individuellement. Les invalidations temps réel manquantes peuvent produire des écarts uniquement en multi-session, invisibles lors d'une recette mono-utilisateur.

## 20. Recommandations techniques

1. Aligner les permissions des endpoints personnels 2FA et ajouter une matrice de tests de scope.
2. Rétablir une suite backend terminante, puis trier les 34 échecs frontend sans relâcher les règles métier.
3. Normaliser le catalogue d'événements Socket.IO partagé frontend/backend.
4. Planifier la migration des JWT hors de localStorage.
5. Mettre à disposition une base MySQL 8.4 et une application de recette isolées pour HTTP, navigateur, PDF, uploads et multi-session.

## 21. Priorisation des corrections

| Ordre | Priorité | Travail | Dépendances | Validation |
|---:|---|---|---|---|
| 1 | P1 | AUD-2FA-001 | décision de modèle permission personnel/admin | unitaires + API 200/403 + navigateur |
| 2 | P1 | Stabiliser suite backend | mocks/handles/environnement de test | exécution complète répétable |
| 3 | P1 | Requalifier 34 échecs frontend | contrats métier actuels | suite complète PASS |
| 4 | P1 | Stratégie session HttpOnly | architecture auth/CSRF | sécurité, refresh, logout, multi-onglets |
| 5 | P2 | Catalogue Socket.IO | conventions événements/cache keys | tests multi-session |
| 6 | P3 | Libellé paramètres 2FA | après validation lot appareil | test UI |

## 22. Plan de finalisation

Phase A : corriger et tester les P1 sans modifier les données métier. Phase B : obtenir lint/build/suites complètes verts. Phase C : déployer uniquement sur une recette isolée avec migration contrôlée. Phase D : exécuter matrice HTTP RBAC/scopes, workflows financiers et 2FA. Phase E : recette navigateur multi-fuseau et multi-session, PDF/CSV/uploads/notifications. Phase F : vérifier schéma, index, FK et migrations en lecture seule puis produire un procès-verbal de livraison.

## 23. Verdict global

**PARTIELLEMENT CONFORME.** L'architecture et la couverture métier sont avancées, les builds sont sains et le cœur 2FA trusted-device est sérieusement implémenté. Mais une incohérence RBAC bloque potentiellement « Mes appareils », les suites automatisées ne sont pas vertes, le backend global ne termine pas et aucune preuve HTTP/navigateur récente n'existe. Le produit ne doit donc pas être déclaré entièrement fonctionnel ni prêt à livrer sur la seule base de cet audit statique.

## Annexes

- [Inventaire des modules](./audit-global/INVENTAIRE-MODULES.md)
- [Inventaire des interactions frontend](./audit-global/INVENTAIRE-INTERACTIONS-FRONTEND.md)
- [Catalogue des routes API](./audit-global/CATALOGUE-ROUTES-API.md)
- [Matrice API frontend/backend](./audit-global/MATRICE-API-FRONTEND-BACKEND.md)
- [Matrice tableaux/filtres](./audit-global/MATRICE-TABLEAUX-FILTRES.md)
- [Matrice RBAC](./audit-global/MATRICE-RBAC.md)
- [Audit Socket.IO](./audit-global/AUDIT-SOCKET-IO.md)
- [Audit SQL/migrations](./audit-global/AUDIT-SQL-MIGRATIONS.md)
- [Catalogue des anomalies](./audit-global/CATALOGUE-ANOMALIES.md)
- [Résultats des tests](./audit-global/RESULTATS-TESTS.md)
