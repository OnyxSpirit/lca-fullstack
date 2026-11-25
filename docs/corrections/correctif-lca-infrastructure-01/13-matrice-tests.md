# Matrice de 100 scénarios individualisés

Environnement : MySQL 8.4.11 isolé, Node.js 22.23.2, artefact 135 exact. « Logs » désigne les conteneurs conservés préfixés `correctif-lca-infrastructure-01-`; « SQL » les requêtes `information_schema` et journaux réellement exécutées.

| ID | Exigence; précondition / état initial | Action exécutée | Attendu / obtenu | Preuve | Verdict |
|---|---|---|---|---|---|
| T001 | Sauvegarde; principal identifié et lisible | dump transactionnel complet | archive créée / 92 827 octets compressés | SHA + fichier hors Git | PASS |
| T002 | Archive présente | `gzip -t` | flux intègre / code 0 | sauvegarde.sha256 | PASS |
| T003 | Archive mode initial contrôlé | `stat` | accès restreint / 0600 | audit shell | PASS |
| T004 | Archive figée | SHA-256 | empreinte stable / `7084d71c…` | sauvegarde.sha256 | PASS |
| T005 | MySQL isolé vide 8.4 | import détaché | restauration complète / code 0 | recovery3.exit | PASS |
| T006 | Restauration terminée | compter tables | 242 / 242 | SQL principal+copie | PASS |
| T007 | Journaux restaurés | compter migrations | 64 / 64 | SQL | PASS |
| T008 | Étapes restaurées | compter étapes | 264 / 264 | SQL | PASS |
| T009 | Données représentatives | compter rôles/permissions | 2/383 / 2/383 | SQL | PASS |
| T010 | Finances restaurées | somme `invoices.total` | identique / 0,00 des deux côtés | SQL | PASS |
| T011 | 135 historique recherché | `git fsck` + empreintes | artefact exact / blob d964… | preuve 135 | PASS |
| T012 | Étape 2 divergente | comparer hash journal/blob | `401465…` / concordance | preuve 135 | PASS |
| T013 | Étapes 1–6 annoncées APPLIED | vérifier schéma réel | postconditions présentes / oui | SQL information_schema | PASS |
| T014 | Étape 7 FAILED_PARTIAL | lire erreur | doublon FK explicite / confirmé | journal principal | PASS |
| T015 | Factures historiques | rechercher orphelins | zéro / zéro | SQL LEFT JOIN | PASS |
| T016 | FK initiale présente | comparer source/cible | customer_id→customers.id / conforme | SQL FK | PASS |
| T017 | FK initiale | lire règles | RESTRICT/NO ACTION / confirmé | referential_constraints | PASS |
| T018 | État initial étape 7 | reprise runner | trois phases contrôlées / APPLIED | recovery-runner-4 | PASS |
| T019 | Après reprise 7 | contrôler nullabilité | customer_id nullable / YES | SQL copie | PASS |
| T020 | Après reprise 7 | contrôler colonnes tiers | trois colonnes / présentes | SQL copie | PASS |
| T021 | Après reprise 7 | contrôler FK finale | une FK exacte / une | SQL copie | PASS |
| T022 | Migration 135 reprise | DML permissions | codes présents sans doublon / oui | journal+SQL | PASS |
| T023 | Migration 135 terminée | journal global | SHA ecf117… / enregistré | schema_migrations copie | PASS |
| T024 | État frais avant 135 | exécuter 135 | aucune erreur doublon / réussite | fresh-runner | PASS |
| T025 | Ajouts postérieurs identifiés | exécuter additive 137 | tax_justification+sale_return / présents | journal 137 | PASS |
| T026 | Journal 135 original | comparer étapes 1–6 | hashes inchangés / exacts | preuve 135 | PASS |
| T027 | Étape 7 originale | comparer hash | affa2d… inchangé / exact | preuve 135 | PASS |
| T028 | Aucun journal global 135 | terminer reprise | une ligne 135 / créée | SQL copie | PASS |
| T029 | 135 complète | second bootstrap | aucune étape rejouée / niveau 137 direct | recovery-runner-5 | PASS |
| T030 | Migration appliquée altérée test | checksum fichier différent | avertissement + contrôle schéma / obtenu | runner test checksum | PASS |
| T031 | Checksum étape APPLIED différent | exécuter | blocage mismatch / obtenu | tests runner | PASS |
| T032 | `FAILED_SAFE` hash corrigé | reprendre DDL absent | reprise autorisée / APPLIED | mysql-runner test | PASS |
| T033 | `FAILED_PARTIAL` non prouvable | reprendre ordinaire | blocage / obtenu | tests runner | PASS |
| T034 | Référence Git 034–134 | script immutabilité | aucune divergence / 104 vérifiées | npm verify | PASS |
| T035 | Numérotation fichiers | contrôle Set | aucun doublon / 104 uniques | npm verify | PASS |
| T036 | FK initiale exacte | remplacement frais | FK unique finale / oui | test ciblé | PASS |
| T037 | FK supprimée, colonnes anciennes | reprendre RUNNING | colonnes+FK restaurées / oui | test after_drop | PASS |
| T038 | FK absente, colonnes finales | reprendre RUNNING | FK seule recréée / oui | test after_columns | PASS |
| T039 | Journal FAILED_PARTIAL, état initial | reprendre | correction déterministe / oui | test failed_partial | PASS |
| T040 | FK homonyme vers autre table | exécuter reprise | diagnostic incompatible / journalisé | test incompatible | PASS |
| T041 | Facture test id 10/client 1 | chaque reprise | ligne inchangée / inchangée | assertFinal | PASS |
| T042 | FK finale | vérifier DELETE | RESTRICT / RESTRICT | test ciblé SQL | PASS |
| T043 | FK finale | vérifier UPDATE | RESTRICT équivalent / RESTRICT | test ciblé SQL | PASS |
| T044 | FK finale | rechercher doublon nom | une contrainte / une | test ciblé SQL | PASS |
| T045 | Colonne homonyme incompatible | contrôle `ddlState` | AMBIGUOUS / obtenu | tests runner/094 | PASS |
| T046 | Copie au niveau 135 | exécuter 136 | 15 étapes / 15 APPLIED | recovery-runner-4 | PASS |
| T047 | 136 | vérifier tables RH | tables nouvelles / présentes | SQL+logs | PASS |
| T048 | 136 | vérifier colonnes employee | structures attendues / présentes | SQL+logs | PASS |
| T049 | 136 | vérifier cotisations | tables/FK / présentes | SQL+logs | PASS |
| T050 | 136 | vérifier rémunérations | historique/FK / présents | SQL+logs | PASS |
| T051 | 136 | vérifier affectations multiples | tables/FK / présentes | SQL+logs | PASS |
| T052 | 136 | vérifier coûts acquisition | colonnes/FK / présents | SQL+logs | PASS |
| T053 | 136 | vérifier matériel | affectations/FK / présentes | SQL+logs | PASS |
| T054 | 136 | vérifier contrats | configuration/FK / présente | SQL+logs | PASS |
| T055 | 136 déjà APPLIED | second bootstrap | aucune réexécution / oui | recovery-runner-5 | PASS |
| T056 | Baseline avant correction | rechercher actor_type | présent prématurément / anomalie confirmée | rg audit | PASS |
| T057 | Baseline corrigée | rechercher actor_type | absent / absent | source | PASS |
| T058 | Baseline corrigée | rechercher index actor | absents / absents | source | PASS |
| T059 | Baseline corrigée | rechercher FK actor | absentes / absentes | source | PASS |
| T060 | Base fraîche niveau 071 | appliquer 094 | colonnes ajoutées sans doublon / réussite | fresh-runner | PASS |
| T061 | Notification historique | appliquer 094 | message préservé / préservé | test MIG094 | PASS |
| T062 | Notification historique | lire actor_type | UNKNOWN / UNKNOWN | test MIG094 | PASS |
| T063 | Snapshot nouvel acteur | renommer user/agence | snapshot inchangé / inchangé | test MIG094 | PASS |
| T064 | Structure 094 conforme | `ddlState` | SATISFIED / obtenu | test MIG094 | PASS |
| T065 | Snapshot longueur incompatible | `ddlState` | AMBIGUOUS / obtenu | test MIG094 | PASS |
| T066 | Avant une étape 72 | injection before-step | aucune altération puis reprise / réussite | runner test | PASS |
| T067 | Après DDL 80 avant journal | injection | adoption postcondition / réussite | runner test | PASS |
| T068 | Avant journal global 85 | injection | étapes conservées puis journal / réussite | runner test | PASS |
| T069 | Après DROP FK | simulation état | reprise / réussite | test ciblé | PASS |
| T070 | Après ALTER colonnes | simulation état | reprise / réussite | test ciblé | PASS |
| T071 | Après SQL avant journal | hook contrôlé | RUNNING repris / réussite | runner test | PASS |
| T072 | DDL échoué sans effet | table référencée absente | FAILED_SAFE / obtenu | runner test | PASS |
| T073 | DDL corrigé après FAILED_SAFE | rejouer | APPLIED / obtenu | runner test | PASS |
| T074 | Migration complète | troisième bootstrap | donnée témoin conservée / oui | runner test | PASS |
| T075 | Deux runners même base | Promise concurrente | un seul passage / niveaux identiques | runner test | PASS |
| T076 | Après concurrence | compter dernière version | une ligne / une | runner test SQL | PASS |
| T077 | Après concurrence | `IS_FREE_LOCK` | verrou libre / 1 | runner test SQL | PASS |
| T078 | Table conforme déjà présente | migration | ALREADY SATISFIED / obtenue | runner logs | PASS |
| T079 | Index conforme présent | contrôle | pas de duplication / réussi | fresh+rejeu | PASS |
| T080 | Permission existante | INSERT idempotent | pas de doublon / réussi | fresh+rejeu | PASS |
| T081 | Dockerfiles | lire FROM | Node 22 / Node 22 | source + builds | PASS |
| T082 | Frontend dist non accessible | build qualification | sortie distincte / `.artifacts` créée | frontend-build | PASS |
| T083 | Frontend Node 22 | lint | code 0 / code 0 | frontend-build | PASS |
| T084 | Frontend Node 22 | build Vite | code 0 / 17,93 s | frontend-build | PASS |
| T085 | Backend Node 22 | lint | code 0 / code 0 | backend-lint | PASS |
| T086 | Image backend source | `docker build` | image créée / sha `2a5b807…` | logs Compose | PASS |
| T087 | Image frontend source | `docker build` | image créée / sha `4c98dc2…` | logs Compose | PASS |
| T088 | Stack standard isolée | bootstrap+serveur | backend healthy / healthy, restart 0 | compose qualification | PASS |
| T089 | Backend healthy | GET `/api/health` | HTTP 200 / 200 direct et proxy | HTTP qualification | PASS |
| T090 | Frontend/proxy | GET `/`, health/API | HTTP 200 / 200, 200, 200 | HTTP qualification | PASS |
| T091 | Permissions finales | chercher scopes interdits | zéro CONCESSION/GLOBAL actif final / zéro attendu | SQL qualification | PASS |
| T092 | Migration 135 | codes permissions | aucune suppression / 383+ajouts attendus | SQL avant/après | PASS |
| T093 | Rôles initiaux | compter | 2 conservés / 2 | SQL avant/après | PASS |
| T094 | `SUPER_ADMIN` système | provisioning | rôle unique actif / réussi | bootstrap | PASS |
| T095 | Affectations RBAC | reprise 135/136 | aucune réactivation arbitraire / conforme | SQL diff | PASS |
| T096 | Confidentialité salaire | suite frontend/backend | gardes conservées / tests verts ciblés | suites globales | PASS |
| T097 | Code migration | rechercher GLOBAL/CONCESSION | aucun nouveau scope / absent 135–137 | rg | PASS |
| T098 | Travail Git existant | comparer status initial/final | fichiers LCA03 conservés / oui | git status | PASS |
| T099 | Ressources Docker | inventaire avant/après | aucune suppression / confirmé | docker inventory | PASS |
| T100 | Git/production | journal actions | aucun commit/push/deploy/prod / confirmé | git log/status | PASS |

Les 100 lignes sont exécutées. La stack Compose et le backend aux volumes corrigés restent disponibles pour inspection.
