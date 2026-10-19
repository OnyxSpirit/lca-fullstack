# B.3.4.2.3 — Plan d’intégration des prestataires dans RH & Administration

## 1. Objet et périmètre de cette intervention

Cette première intervention couvre uniquement l’analyse et la planification demandées. Aucun fichier applicatif, test, schéma de référence ou migration n’a été modifié. Aucune migration n’a été appliquée. Le présent document est le seul nouveau livrable.

Sources vérifiées :

- `docs/RAPPORT-AUDIT-CYCLE-RH-PRESTATAIRES-B3422.md` ;
- baseline `backend-node/database/baseline/001_initial_schema.sql` ;
- migrations 064 à 096, dont 096 encore non appliquée à la base métier selon la mission ;
- routes et services RH sous `backend-node/src/modules/hr` ;
- `backend-node/src/modules/users/user.service.ts` et `hr-employee-sync.service.ts` ;
- GED sous `backend-node/src/modules/documents` ;
- dépenses/trésorerie sous `hr.routes.ts` et `treasury.service.ts` ;
- composants RH sous `frontend/src/modules/hr` et hooks associés ;
- runner résilient `backend-node/src/scripts/mysql-migration-runner.ts` ;
- tests RH, GED, migrations et finance existants.

## 2. Vérification de l’architecture actuelle

### 2.1 Identité salariée

`employee_profiles` est aujourd’hui à la fois identité Personnel et racine métier salariée. Son identifiant est référencé par `salary_history`, contrats, congés, primes et rémunérations. Le déplacer ou le renuméroter casserait les FK et l’historique. La migration 064 a rendu `user_id` facultatif et a introduit les snapshots identité/territoire. La migration 096 ajoute seulement `photo_path`.

Conclusion : les identifiants et FK salariés doivent rester en place. Une identité commune doit être ajoutée au-dessus du modèle existant, puis reliée en 1:1 à `employee_profiles`.

### 2.2 Personne simultanément salariée et prestataire

Le modèle actuel ne peut pas représenter deux relations métier sur une identité unique sans duplication. Il faut distinguer :

- identité commune : personne physique ou morale ;
- relation salariée existante : `employee_profiles` ;
- relation prestataire : nouveau profil prestataire ;
- rattachements prestataire/agence ;
- contrats et rémunérations propres à chaque rattachement.

Une identité physique pourra ainsi avoir à la fois une relation salariée et une relation prestataire. Les FK financières et contractuelles de chaque relation resteront distinctes.

### 2.3 Territoire

Le salarié a un territoire principal dans `employee_profiles`. Le prestataire doit être unique au niveau concession et posséder plusieurs rattachements agence. Le scope d’un objet prestataire ne doit donc jamais être déduit d’une agence principale sur son identité : il doit venir du rattachement ou du contrat concerné.

OWN ne s’applique pas automatiquement aux prestataires sans compte ERP. Si un compte est lié à l’identité, OWN pourra autoriser la consultation personnelle uniquement après définition explicite de la politique ; il ne doit jamais donner accès aux contrats d’une autre agence sans contrôle.

### 2.4 Contrats

`employee_contracts` est spécifiquement salarié, impose un employé et interdit les chevauchements. Il ne contient ni agence contractuelle, ni objet, ni montant, ni modalité. Le réutiliser directement obligerait à créer un faux salarié et modifierait ses invariants.

Le workflow et les composants sont réutilisables, mais les données prestataires doivent être dans des tables spécialisées. Les règles de chevauchement salariées restent inchangées. Les contrats prestataires pourront se chevaucher si leur objet est distinct.

### 2.5 GED

La GED accepte déjà des types d’entité extensibles, des versions, archives, hashes, scopes et politiques métier. Il suffit d’ajouter les entités prestataire, rattachement/contrat et rémunération au résolveur et au frontend. Aucun second stockage n’est nécessaire.

Les exigences documentaires doivent être modélisées par contrat et résolues contre des `document_type_id` actifs. Un simple comptage de fichiers ou un nom libre ne serait pas suffisamment fiable.

### 2.6 Salaires et rémunérations

`salary_history` et `hr_remunerations` sont strictement salariés : la préparation exige une ligne salariale, un contrat salarié actif et calcule salaire + primes. Ces tables ne conviennent pas aux prestations.

La section d’interface « Salaires » peut devenir une vue à deux sous-sections clairement nommées « Salaires employés » et « Rémunérations prestataires ». Les API et tables restent séparées. Les congés et primes ne sont jamais proposés aux prestataires.

### 2.7 Finance et trésorerie

Le point de réutilisation fiable commence à `budget_expenses` : validation, approbation, réservations, décaissements, idempotence, mouvements postés et extournes existent déjà. Une rémunération prestataire validée doit créer une dépense centrale liée, puis suivre ce circuit. Aucune écriture réelle ne doit être créée avant l’approbation et le décaissement.

### 2.8 Utilisateurs ERP

La création d’un prestataire restera indépendante de `users`. Le compte éventuel est créé dans Utilisateurs & Habilitations. Le champ « Employé de la concession » conserve exclusivement sa sémantique salariée. Une liaison facultative compte–identité commune devra être explicite ; elle ne créera ni relation salariée ni relation prestataire.

## 3. Architecture cible proposée

### 3.1 Principe

Architecture additive à trois niveaux :

1. `personnel_identities` : identité commune physique/morale, compte ERP facultatif, informations de contact et statut d’identité ;
2. `employee_profiles` : relation salariée existante, reliée 1:1 à l’identité commune, sans changer ses identifiants ni ses FK actuelles ;
3. `provider_profiles` : relation prestataire, reliée 1:1 à l’identité commune, avec état global et nature des prestations.

Les relations spécialisées sont indépendantes. Une même identité peut posséder les deux.

### 3.2 Modèle additif indicatif à confirmer au LOT 1

Tables envisagées :

- `personnel_identities` : type INDIVIDUAL/COMPANY, noms individuels ou raison sociale, nom commercial, contacts, adresse, référence de photo/logo, compte ERP optionnel, timestamps et acteurs ;
- `provider_profiles` : code prestataire, nature des prestations, état ACTIVE/SUSPENDED/ENDED, suspension motivée/auditée ;
- `provider_agency_assignments` : prestataire, agence, état, dates ; unicité prestataire/agence ;
- ajout de `personnel_identity_id` unique dans `employee_profiles`, avec backfill 1:1 ;
- tables d’audit métier ou historique dédiées lorsque l’audit générique ne suffit pas aux transitions.

Contraintes impératives : contrôles de forme physique/morale, unicité du lien compte, FK `RESTRICT` pour les historiques, aucune suppression en cascade des contrats/finances, index de scope, références métier uniques et XAF uniquement dans les objets monétaires.

Le backfill devra conserver chaque `employee_profiles.id`, créer exactement une identité par employé historique et recopier sans altération les snapshots. `employee_profiles.user_id` reste temporairement la compatibilité de la synchronisation actuelle ; toute suppression future de duplication est hors de cette mission et ne pourra intervenir qu’après une migration dédiée démontrée.

### 3.3 Contrôles de doublons

Les e-mails, téléphones et noms ne sont pas des clés fiables. Le backend doit :

- empêcher les doublons exacts sur les identifiants administratifs lorsqu’ils sont renseignés ;
- proposer des correspondances probables sur nom/contact à l’utilisateur sans fusion automatique ;
- permettre de sélectionner une identité existante avant de créer la relation prestataire ;
- journaliser toute liaison ou décision de création malgré une alerte.

Cette approche est indispensable pour représenter une personne déjà salariée qui devient aussi prestataire.

## 4. Séquencement retenu

Le découpage recommandé en sept lots est conservé, avec une séparation stricte entre socle, identité, contrat, rémunération et finance. Chaque lot doit être autorisé séparément.

## 5. LOT 1 — Socle de données et migrations additives

### Objectif

Introduire l’identité commune, la relation prestataire et les rattachements agence sans changer le comportement des écrans ni des API existants.

### Fichiers prévus

- nouvelle migration `097_...sql` uniquement après confirmation que 097 reste libre ;
- baseline `001_initial_schema.sql`, mis à jour pour les installations vierges ;
- tests de continuité de baseline/migrations ;
- nouveau test MySQL isolé de migration 097 ;
- éventuellement types backend internes, sans route publique dans ce lot.

### Migration

Création additive des tables d’identité/profil/rattachement, ajout de la FK 1:1 à `employee_profiles`, backfill idempotent et contrôlable. Aucun `DROP`, aucune renumérotation, aucune modification des migrations 064–096. La migration 097 doit fonctionner après 096, même si 096 n’est appliquée qu’au moment autorisé du déploiement séquentiel.

Le runner découpe et journalise chaque instruction ; la migration doit donc être testée en installation vierge, reprise partielle et divergence réelle, notamment autour du backfill DML et des DDL non transactionnels MySQL.

### Permissions

Aucune nouvelle permission opérationnelle nécessaire tant qu’aucune route prestataire n’est exposée. Si des permissions sont préparées, elles doivent rester inactives/non attribuées hors SUPER_ADMIN jusqu’au lot qui les consomme.

### Risques

Backfill en doublon, identité manquante, collision de compte ERP, reprise partielle, incompatibilité avec 096, divergence baseline/versionnée.

### Tests ciblés

- baseline vierge jusqu’à 097 ;
- base conforme 096 → 097 ;
- reprise après chaque DDL et après le backfill ;
- comptages avant/après et unicité 1:1 ;
- FK historiques inchangées ;
- divergence structurelle détectée, pas masquée ;
- suites de continuité des migrations et tests RH existants liés au schéma.

### Critères d’acceptation

Tous les employés historiques ont exactement une identité commune ; leurs ID/FK/données restent identiques ; aucune route existante ne change de résultat ; aucune relation prestataire n’est créée artificiellement ; migration non appliquée à la base métier.

## 6. LOT 2 — Identités et profils prestataires

### Objectif

Créer/consulter/modifier/suspendre une identité prestataire physique ou morale, gérer photo/logo, doublons et liaison facultative à une identité existante.

### Fichiers prévus

- nouveaux service/routes/types prestataires sous `backend-node/src/modules/hr` ;
- montage des routes dans l’application ;
- extension des hooks/types RH ;
- formulaire « Nouveau prestataire » dans `HrAdministrationPage.tsx` ;
- fiche spécialisée intégrée à `EmployeeRecordModal` ou renommage contrôlé vers une fiche Personnel commune ;
- réutilisation de `DocumentFileDropField` et du stockage photo privé ;
- tests backend/frontend ciblés.

### Migration éventuelle

Uniquement si le LOT 1 révèle un champ d’identité strictement nécessaire ; sinon aucune.

### Permissions

Permissions dédiées proposées : `hr.providers.view`, `hr.providers.manage`, `hr.provider.account.manage`, toutes scopées. Aucun rôle fixe ; attribution dynamique, SUPER_ADMIN global selon la convention actuelle.

### Risques

Fusion abusive, fuite de données sensibles, création implicite de compte, régression de la synchronisation utilisateur/employé, confusion photo/logo/avatar.

### Dépendances

LOT 1 validé ; règle de résolution des doublons approuvée.

### Tests ciblés

Physique/morale, champs conditionnels, création sans compte, liaison à identité salariée existante, doublon administratif, alerte de correspondance, scopes complets, suspension motivée, audit, fichiers falsifiés/trop volumineux, non-régression B.3.4.2.0/2.1.

### Critères d’acceptation

Deux actions distinctes dans Personnel ; aucune création de `users` ni `employee_profiles` pour un prestataire seul ; même identité réutilisable pour salarié + prestataire ; données sensibles absentes des réponses non autorisées.

## 7. LOT 3 — Rattachements agence et liste Personnel unifiée

### Objectif

Afficher salariés et prestataires dans Personnel, avec catégorie et filtres, et gérer plusieurs rattachements agence sans dupliquer l’identité.

### Fichiers prévus

- service/predicates de scope prestataire ;
- routes de rattachement et endpoint de liste Personnel unifiée ou agrégateur typé ;
- `HrAdministrationPage.tsx`, hooks et types ;
- fiche Personnel et sélecteur de contexte agence ;
- tests RBAC/API/frontend.

### Migration éventuelle

Index de recherche/scope uniquement si les mesures SQL le justifient ; migration additive séparée.

### Permissions

`hr.providers.view/manage`; la gestion d’un rattachement exige un scope autorisant l’agence cible. GLOBAL/CONCESSION/AGENCY sont calculés sur le rattachement ; OWN reste désactivé pour les données collectives tant que sa politique n’est pas explicitée.

### Risques

Exposition croisée entre agences, mauvais compteur/pagination dans une union, double identité, agence retirée alors que contrats/historiques existent.

### Dépendances

LOTS 1–2.

### Tests ciblés

Pagination/recherche/filtres mélangés, catégories, multi-agence, ajout idempotent, retrait avec historique, AGENCY/CONCESSION/GLOBAL, interdiction interterritoriale, non-régression de la liste salariés et des données salariales masquées.

### Critères d’acceptation

Une identité apparaît une fois avec ses relations et rattachements ; le contexte agence sélectionné borne toutes les données contractuelles/financières ; les employés existants conservent leur présentation et pagination.

## 8. LOT 4 — Contrats prestataires et GED

### Objectif

Réutiliser le workflow contractuel et la GED pour des contrats prestataires propres à chaque agence, avec modalités, exigences documentaires, suspension et historique.

### Fichiers prévus

- migration additive des contrats, échéances et exigences documentaires ;
- service/routes prestataires inspirés de `hr-contract.routes.ts`, sans modifier les règles salariées ;
- extension `document-access.ts`, `document.routes.ts` et types frontend ;
- adaptation/réutilisation de `EmployeeContractsSection.tsx`, gestionnaires et upload GED ;
- tests backend/frontend/MySQL.

### Modèle prévu

`provider_contracts` porte assignment/agence, objet, conditions, dates, montant total ou périodique, modalité PERIODIC/FIXED/INSTALLMENTS, XAF, statut, suspension, acteurs et snapshots. Les échéances sont des lignes immuables une fois dues. Une table d’exigences relie contrat et type documentaire avec indicateur obligatoire et étape requise.

Les états doivent reprendre DRAFT/ACTIVE/ENDED/CANCELLED et ajouter SUSPENDED avec historique motivé. Le chevauchement n’est contrôlé que sur les règles prestataires décidées, jamais en modifiant `assertNoOverlap` salarié.

### Permissions

`hr.provider.contract.view/manage` et gestion éventuelle des types/exigences au niveau CONCESSION/GLOBAL. Les droits GED existants restent cumulés.

### Risques

Chevauchement mal interprété, contrat d’une agence visible ailleurs, génération après échéance, document attaché au mauvais contrat, expiration non clôturée.

### Dépendances

LOTS 1–3 ; décision sur prorata/périodicité avant activation de la génération.

### Tests ciblés

Tous états/transitions, contrats simultanés à objets distincts, multi-agence, suspension isolée, fin/expiration, exigences GED, versions/archives/scopes, conservation de sommes déjà dues, non-régression contrats salariés.

### Critères d’acceptation

Chaque contrat est agence-spécifique et indépendant ; aucune rémunération postérieure non autorisée ; justificatifs consultables via la GED existante ; aucune modification des contraintes salariées.

## 9. LOT 5 — Rémunérations prestataires dans la section Salaires

### Objectif

Générer et suivre des rémunérations contractuelles périodiques, forfaitaires ou par échéances, sans `salary_history`, primes ou paie salariée.

### Fichiers prévus

- migration additive rémunérations/historique/lien contrat-échéance ;
- nouveaux service/routes de rémunération prestataire ;
- adaptation de `HrAdministrationPage.tsx` et `RemunerationsAdministration.tsx` en vues clairement séparées ;
- hooks/types/tests ciblés.

### Modèle prévu

Chaque dette conserve prestataire, contrat, assignment/agence, période ou échéance, brut XAF, retenue explicite éventuelle, net payable, justification, statut, snapshots et clé d’unicité de génération. Aucun taux n’est calculé automatiquement.

### Permissions

`hr.provider.remuneration.view/prepare/submit/validate`, scopées, sans rôle fixe. Séparation préparateur/soumetteur/validateur identique ou plus stricte que la rémunération salariée.

### Risques

Double génération, prorata ambigu, montant après fin, confusion brut/net, prestataires injectés dans les indicateurs de masse salariale.

### Dépendances

LOT 4 et décisions de calcul listées en section 13.

### Tests ciblés

Trois modalités, concurrence/idempotence, début/fin de contrat, suspension globale/locale, sommes déjà dues, retenue explicite, scopes, séparation des acteurs, aucun accès à `salary_history`, aucun bonus/congé, non-régression rémunérations salariés.

### Critères d’acceptation

Vue « prestations » distincte dans Salaires ; dette unique et traçable par période/échéance ; aucun effet financier avant validation/engagement ; masse salariale salariée inchangée.

## 10. LOT 6 — Dépenses, justificatifs, règlement et trésorerie

### Objectif

Relier une rémunération validée au circuit financier central, vérifier les justificatifs avant chaque paiement et gérer les instruments de règlement du prestataire.

### Fichiers prévus

- migration additive pour instruments de règlement chiffrés/masqués et liens immuables aux dépenses/décaissements ;
- extension contrôlée des services rémunération, dépenses et appel à `budgetExpenseDisburse` ;
- vérificateur GED des exigences contractuelles ;
- interface de choix du budget, de l’instrument et du moyen réellement utilisé ;
- tests finance/RBAC/concurrence.

### Permissions

Permission distincte de consultation/gestion des coordonnées sensibles, plus les permissions existantes de création/approbation/décaissement. Une exception documentaire requiert une permission dédiée et ne peut être auto-attribuée.

### Risques

Secret en clair, facture absente, exception abusive, double paiement, instrument modifié rétroactivement, incohérence brut/net, espèces non autorisées.

### Dépendances

LOT 5 ; stratégie de chiffrement et règles d’exception approuvées.

### Tests ciblés

Facture obligatoire personne morale, exigences personne physique, paiement partiel, vérification à chaque décaissement, exception motivée/auditée, instrument actif et snapshot historique, budget/devise/territoire, idempotence, concurrence, extourne, solde et réservation, aucun mouvement avant approbation.

### Critères d’acceptation

Chaque dépense et décaissement retrouve prestataire/contrat/agence/budget/justificatifs ; références historiques immuables ; comptes sensibles masqués ; mouvements exclusivement créés par le service central.

## 11. LOT 7 — Régression et qualification finale

### Objectif

Démontrer l’intégration complète et l’absence de régression salariés/finance.

### Travaux

- suites frontend/backend complètes, lint et builds ;
- MySQL 8.4 isolé : baseline, migrations 096/097+, reprise partielle et scénarios réels ;
- tests API et navigateur multi-rôles/multi-agences ;
- vérification GED, fichiers privés, audit, notifications et temps réel ;
- parcours financiers complets, partiels, concurrents et extournés ;
- `git diff --check` et rapport final.

### Critères d’acceptation

Tous les critères des lots précédents sont prouvés ; aucun test masqué/supprimé ; création et cycle salarié inchangés ; aucune donnée métier/VPS touchée ; limites restantes explicitement documentées.

## 12. Matrice de dépendances

```text
LOT 1 Socle
  └─ LOT 2 Identités
       └─ LOT 3 Personnel + agences
            └─ LOT 4 Contrats + GED
                 └─ LOT 5 Rémunérations
                      └─ LOT 6 Finance
                           └─ LOT 7 Qualification
```

Les lots 2 à 6 ne doivent pas être développés en parallèle avant stabilisation de leurs contrats SQL/API. Les tests de non-régression peuvent être ajoutés à chaque lot ; LOT 7 reste la qualification transversale, pas le premier moment où les régressions sont recherchées.

## 13. Véritables blocages nécessitant une décision

Les règles déjà validées ne sont pas rouvertes. Les seuls points qui empêchent une implémentation sûre de certaines étapes sont :

1. **Identification d’une personne physique existante.** Quel identifiant administratif, s’il existe, permet une correspondance certaine salarié/prestataire ? Sans identifiant fiable, la liaison doit rester un choix manuel après alerte, jamais une fusion automatique. Ce point n’empêche pas le LOT 1 si le schéma accepte des identifiants facultatifs.
2. **Périodes partielles des contrats périodiques.** Un mois commencé/terminé en cours de période est-il payé intégralement, proratisé au jour, ou défini manuellement ? Bloquant avant le LOT 5.
3. **Exigibilité d’une prestation forfaitaire.** Quel événement rend la somme due : activation, fin, validation du service fait ou saisie manuelle ? Bloquant avant le LOT 5.
4. **Échéances.** Sont-elles toutes définies à l’activation du contrat, et une échéance peut-elle être modifiée après génération d’une dette ? Recommandation : définition préalable et immutabilité après génération. Bloquant avant le LOT 4/5.
5. **Exception à la facture obligatoire.** Quelle permission autorise l’exception, pour quels motifs et faut-il une seconde approbation ? Bloquant avant le LOT 6.
6. **Retenue explicite.** Doit-elle être un montant ou un taux saisi avec base/justification, et qui la valide ? Aucun calcul automatique ne sera introduit. Bloquant avant le LOT 5.
7. **Espèces.** Quel paramètre existant ou quelle politique autorise ce moyen pour une agence/contrat ? Bloquant avant le LOT 6.
8. **Protection des coordonnées de règlement.** Une clé de chiffrement dédiée hors Git est recommandée ; il faut confirmer son mode d’injection/exploitation et la politique de rotation avant le LOT 6.

Les sujets suivants ne sont pas des blocages du LOT 1 : menu unique Personnel, XAF exclusif, absence de compte automatique, multi-agence, séparation salarié/prestataire, GED/finance centrales et absence de primes/congés prestataires sont déjà décidés.

## 14. Risques transversaux et mesures

| Risque | Mesure obligatoire |
|---|---|
| Régression des IDs/FK salariés | modèle additif, lien 1:1, aucun déplacement des lignes historiques |
| Migration 096 non appliquée | ordre strict 096 puis 097+, tests sur état 096 et installation vierge |
| Reprise DDL partielle | test du runner étape par étape et postconditions structurelles |
| Duplication d’une personne ou société | identifiants administratifs facultatifs mais uniques, détection souple, fusion manuelle |
| Désynchronisation user/employee/identity | service unique de double écriture transactionnelle et tests B.3.4.2.0 |
| Fuite inter-agence | scope calculé depuis assignment/contrat, tests négatifs systématiques |
| Prestataire traité comme salarié | tables/API séparées et gardes backend ; aucune ligne `salary_history` |
| Modification des contrats salariés | aucun changement de leur table ni de `assertNoOverlap` |
| Document mal associé | nouvelles entités GED résolues côté serveur avec politique métier |
| Double dette/paiement | contraintes uniques, verrouillage, idempotence client et circuit financier central |
| Paiement sans justificatif | contrôle backend avant chaque décaissement, y compris partiel |
| Coordonnées sensibles exposées | chiffrement au repos, réponses masquées, permission dédiée, audit |
| Historique de paiement réécrit | snapshots d’instrument/référence et FK `RESTRICT` |
| Indicateurs RH faussés | séparer masse salariale et prestations dans requêtes/reporting |

## 15. Décision technique proposée

L’option B est compatible avec le schéma réel à condition de rester additive : identité commune nouvelle, relation salariée conservée, relation prestataire nouvelle. La réutilisation doit porter sur les services transversaux et les patterns éprouvés, non sur un détournement des tables salariées.

Le premier développement autorisable est donc exclusivement le LOT 1. Il devra préparer une migration 097 et ses tests isolés, sans l’appliquer à la base métier et sans exposer encore de fonctionnalité prestataire. Les LOTS 2 à 7 restent interdits tant qu’ils ne sont pas explicitement autorisés.

## 16. État de validation

- Analyse B.3.4.2.2 : terminée.
- Architecture actuelle : vérifiée au niveau code et SQL versionné.
- Plan de développement : établi.
- Développement : non commencé.
- Migration : aucune créée, aucune appliquée.
- Tests : aucun exécuté pendant cette phase de planification.
- Autorisation attendue : **LOT 1 uniquement**, si le plan est validé.
