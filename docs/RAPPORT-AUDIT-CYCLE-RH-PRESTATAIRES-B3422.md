# Rapport d’audit B.3.4.2.2 — Cycle RH et préparation des prestataires

## Cadre, méthode et niveau de preuve

Audit réalisé en lecture seule sur l’état courant du dépôt. Aucun test, serveur, conteneur, script de migration ou accès à une base n’a été lancé pendant cette mission. Le dépôt était propre au contrôle initial (`git status --short` et `git diff --stat` sans sortie). Le seul fichier créé par l’audit est le présent rapport.

Les marqueurs utilisés sont :

- **[Code vérifié]** : comportement directement établi dans le code ou le SQL versionné ;
- **[Test existant]** : scénario couvert par un test identifié, mais non rejoué pendant cet audit ;
- **[Documenté]** : résultat rapporté par un document antérieur ;
- **[Non vérifié en exécution]** : code trouvé, mais aucune preuve d’exécution réelle produite par cette mission ;
- **[Absent]** : fonctionnalité recherchée mais non trouvée dans le périmètre audité.

Sources transversales : migrations `064_employee_profiles_independent_identity.sql`, `065_employee_contract_history.sql`, `066_employee_leaves.sql`, `067_employee_bonuses.sql`, `074_hr_remunerations_financial_integration.sql` et `096_hr_employee_photos.sql`; rapports `RAPPORT-REGRESSION-COLLABORATEURS-RH-B3420.md` et `RAPPORT-PHOTOS-EMPLOYES-RH-B3421.md`; routes RH sous `backend-node/src/modules/hr`; interface RH sous `frontend/src/modules/hr`.

## 1. Synthèse exécutive

**[Code vérifié]** Le dossier employé est désormais une identité RH autonome (`employee_profiles`) pouvant être liée facultativement à un compte ERP (`user_id`). Deux parcours alimentent la même table et la même fiche : création d’un collaborateur ERP déclaré employé, ou création directe dans Personnel. La liaison/dissociation ne reconstruit pas le dossier et les clés étrangères `RESTRICT` protègent les historiques.

**[Code vérifié]** Le cycle effectivement implémenté couvre : identité et photographie, liaison ERP, contrats, congés/absences, primes, salaire historisé, préparation/validation de rémunération, engagement budgétaire, approbation de dépense et décaissement par la trésorerie centrale. Les domaines sont reliés, mais ne forment pas une machine d’état unique : un départ n’arrête pas automatiquement un contrat actif et n’annule pas les objets déjà engagés.

**[Code vérifié]** Le paiement RH réutilise le circuit financier commun. Une rémunération validée produit une `budget_expense`, laquelle doit être approuvée avant de créer un `budget_expense_disbursement` et un mouvement de trésorerie `POSTED`. Le statut payé est calculé sur les décaissements postés, nets des extournes ; une validation ou une réservation ne vaut pas paiement.

**Conclusion d’architecture.** Les prestataires doivent être intégrés dans le domaine Personnel existant, sans nouveau module de navigation, GED, contrats ou décaissement parallèle. Il faut toutefois introduire une distinction explicite entre salarié et prestataire, puis entre personne physique et morale. Les fonctions strictement salariales (congés, primes salariales, `salary_history`, préparation mensuelle automatique) doivent rester interdites aux prestataires tant que leurs règles contractuelles, fiscales et de facturation ne sont pas décidées.

## 2. Cartographie complète du cycle de vie employé

| Étape | Entrée / API | Tables principales | Contrôle et effet |
|---|---|---|---|
| Création ERP | `UsersManagementPage.tsx` → service utilisateurs | `users`, `user_roles`, `employee_profiles` | Transaction unique, permissions utilisateurs + `hr.employees.manage`, scope agence, audit utilisateur/RH |
| Création RH | onglet Personnel → `POST /hr/employees` | `employee_profiles` | Profil autonome, matricule unique, scope territorial, audit |
| Liaison ERP | fiche employé → routes link/unlink | `employee_profiles.user_id` | `hr.employee.account.manage`, unicité, verrouillage, historique conservé |
| Contrat | `EmployeeContractsSection.tsx` → routes contrats | `employee_contract_types`, `employee_contracts` | DRAFT → ACTIVE → ENDED, ou DRAFT → CANCELLED ; renouvellement vers nouveau DRAFT |
| Congé/absence | sections congés → routes congés | `employee_leave_types`, `employee_leaves` | DRAFT/PENDING/APPROVED/REJECTED/CANCELLED, contrôle de pièces et chevauchement |
| Prime | sections primes → routes primes | `employee_bonus_types`, `employee_bonuses` | DRAFT/PENDING/APPROVED/REJECTED/CANCELLED ; consommation unique par rémunération |
| Salaire | onglet Salaires → routes salariés | `salary_history` | Ajout daté, append-only par API, salaire courant = dernière date effective applicable |
| Rémunération | onglet Rémunérations → routes rémunérations | `hr_remunerations`, `hr_remuneration_bonuses`, `hr_remuneration_history` | Préparation, soumission, validation, engagement et demande de paiement |
| Finance | routes RH + service trésorerie central | `budget_expenses`, historiques d’approbation, réservations, décaissements, mouvements | Approbation distincte, contrôles budget/liquidité, idempotence et écriture POSTED |
| GED | fiche et sections métier → `/documents` | `documents`, catégories/types | Import, versions, aperçu, téléchargement, archivage/restauration, audit et scope |

Références : `HrAdministrationPage.tsx`, `EmployeeRecordModal.tsx`, `hrHooks.ts`, `hr.routes.ts`, `hr-contract.routes.ts`, `hr-leave.routes.ts`, `hr-bonus.routes.ts`, `hr-remuneration.routes.ts`, `document.routes.ts`, `treasury.service.ts`. **[Code vérifié]**

## 3. Parcours de création ERP

`UsersManagementPage.tsx` affiche « Employé de la concession » uniquement à un acteur pouvant gérer les employés. Les champs RH sont matricule, fonction, date d’embauche et statut. Le compte fournit identité, coordonnées et agence. `user.service.ts:create` valide rôles/agence, crée `users` et appelle `syncEmployeeProfile` dans la même transaction. Le matricule par défaut est `EMP-` suivi de l’identifiant utilisateur sur six positions ; la date d’embauche par défaut est le jour courant ; le statut par défaut est `active`. **[Code vérifié]**

La synchronisation verrouille la fiche trouvée par `user_id`, met à jour la fiche existante plutôt que d’en créer une seconde, et contrôle l’unicité SQL du matricule. Un payload RH exige `hr.employees.manage` et un scope AGENCY, CONCESSION ou GLOBAL compatible ; OWN n’autorise pas cette gestion collective. Références : `hr-employee-sync.service.ts` (`hasEmployeeInput`, `assertEmployeeAgencyScope`, `syncEmployeeProfile`) et `user.service.ts` (`create`, `update`). **[Code vérifié]**

Passer Oui vers Non conserve `user_id` et marque la fiche `departed`. Repasser vers Oui réutilise la fiche et l’interface remplace par défaut `departed` par `active`. Les historiques restent attachés au même `employee_profiles.id`. **[Code vérifié] [Test existant]** `collaborator-hr-regression-b3420.test.ts` côté backend et frontend.

Point de vigilance : `user.service.ts:update` ne synchronise la fiche que si le payload contient un champ RH. L’interface actuelle en ajoute lorsque l’acteur a la permission ; un autre client API modifiant seulement l’agence ou l’identité peut donc laisser le snapshot RH inchangé. **[Code vérifié, risque]**

## 4. Parcours de création RH

L’onglet Personnel de `HrAdministrationPage.tsx` utilise `POST /hr/employees`. La création reçoit identité, coordonnées, matricule, fonction, date d’embauche, agence (ou concession selon le scope) et crée `employee_profiles.user_id = NULL`. Elle n’ajoute ni compte, ni rôle, ni accès ERP. **[Code vérifié]** `hr.routes.ts`.

La transaction verrouille/vérifie le territoire et l’unicité du matricule, journalise la création puis publie l’événement temps réel. La photo facultative est importée dans une seconde requête ; un refus de photo ne remet pas en cause la fiche créée. **[Code vérifié] [Documenté]** `RAPPORT-PHOTOS-EMPLOYES-RH-B3421.md`.

La différence essentielle est donc l’identité d’authentification : le parcours ERP crée compte + dossier lié ; le parcours RH crée seulement le dossier. Les champs métier finaux communs résident dans `employee_profiles`. **[Code vérifié]**

## 5. Apparition dans Personnel

`GET /hr/employees` alimente Personnel et Salaires. Toute ligne `employee_profiles` dans le scope demandé peut apparaître, liée ou autonome, sans condition de contrat ni de salaire. Filtres : recherche, statut, agence et état de liaison au compte ; pagination serveur et total ; tri défini par la route. **[Code vérifié]** `hr.routes.ts`, `HrAdministrationPage.tsx`, `hrHooks.ts`.

La visibilité repose sur `employeePredicate` : GLOBAL tous ; CONCESSION même concession que l’agence de l’acteur ; AGENCY même agence ; OWN uniquement la fiche dont `user_id` est l’acteur. La donnée salariale courante n’est ajoutée que si l’acteur possède `hr.salary.view`. **[Code vérifié]**

Il n’existe pas d’endpoint de suppression ou d’archivage du dossier. Les états `active`, `inactive`, `departed` sont des valeurs modifiables ; le « départ » n’est pas un archivage physique. **[Absent / Code vérifié]**

## 6. Fonctionnement de la fiche

`EmployeeRecordModal.tsx` regroupe identité, photo, statut, coordonnées, rattachement territorial, liaison/dissociation ERP, lien vers l’activité, impressions PDF standard/complète, GED employé, contrats, congés/absences et primes. La version PDF complète exige la permission salariale. **[Code vérifié]**

L’édition directe porte sur identité, coordonnées, matricule, fonction, date d’embauche et statut ; elle ne propose pas de changement d’agence/concession. La fiche liée affiche l’avatar ERP ; la fiche autonome utilise `employee_profiles.photo_path`. La liaison conserve la photo RH historique mais l’avatar ERP devient la source visible ; aucune copie n’est faite. **[Code vérifié]** `hr.routes.ts`, `hr-employee-photo.ts`, migration 096.

Une fiche autonome peut être liée à un utilisateur éligible de la même concession, non SUPER_ADMIN et non déjà lié ; la dissociation met seulement `user_id` à NULL. Verrouillage transactionnel et permission `hr.employee.account.manage`. **[Code vérifié]**

## 7. Contrats

Les types sont un catalogue par concession. Un type utilisé conserve un code immuable et peut être désactivé. Un contrat contient type et snapshots, référence, dates de début/fin contractuelle, fin effective, motif, statut et lien de renouvellement ; aucun montant n’est présent. **[Code vérifié]** migration 065.

Transitions : création en DRAFT ; modification seulement en DRAFT ; activation seulement pour un employé actif, un type actif et sans chevauchement ; fin seulement depuis ACTIVE ; annulation seulement depuis DRAFT ; renouvellement depuis ACTIVE ou ENDED vers un nouveau DRAFT lié par `previous_contract_id`. Les écritures sont transactionnelles, verrouillent employé/contrat, écrivent l’audit et publient un événement. **[Code vérifié]** `hr-contract.routes.ts`.

Le contrat influence l’éligibilité à la rémunération : la préparation exige un contrat ACTIVE couvrant la période. Il ne définit pas le salaire, car aucun montant contractuel ne rejoint `salary_history`. **[Code vérifié]** `hr-remuneration.routes.ts: POST /hr/remunerations/prepare`.

Réemploi prestataire : types, dates, états, renouvellement, non-chevauchement, audit, scope et GED sont réutilisables après généralisation du rattachement. Un consultant ou une société peut utiliser ce cycle. Les clauses financières, livrables, facturation et contreparties ne sont pas modélisées ; elles nécessitent une décision métier, pas un second gestionnaire. **[Analyse]**

Tests identifiés : `hr-contract-lot11a.test.ts`, `hr-contract-lot11a-mysql.mjs`, `hr-contract-lot11a.behavior.test.ts`. **[Test existant, non rejoué]**

## 8. Primes

Les types sont configurés par concession. Une prime porte montant, devise, référence, date/période, motif, snapshots de type/agence et états DRAFT, PENDING, APPROVED, REJECTED, CANCELLED. Création et modification sont possibles selon l’état ; soumission puis décision sont séparées. **[Code vérifié]** migration 067 et `hr-bonus.routes.ts`.

Une prime approuvée dont la date de référence appartient à la période est incorporée une seule fois à une rémunération par `hr_remuneration_bonuses`; la contrainte unique sur `employee_bonus_id` empêche sa consommation multiple. Avant cette préparation, elle ne génère aucune dépense ni écriture de trésorerie. **[Code vérifié]** migration 074 et route de préparation.

La protection d’auto-approbation compare l’approbateur au `user_id` du bénéficiaire. Pour une fiche autonome, elle ne démontre pas une séparation créateur/approbateur. Ce mécanisme est moins strict que celui des rémunérations, qui compare préparateur et soumetteur. **[Code vérifié, risque]**

Les primes salariales ne doivent pas représenter par défaut des honoraires ou factures prestataires. Le catalogue et le workflow pourraient servir à un supplément contractuel seulement après clarification fiscale/comptable. **[Analyse]**

Tests : `hr-bonus-lot11c.test.ts` et test comportement frontend associé. **[Test existant, non rejoué]**

## 9. Congés et absences

Les types, demandes et décisions sont rattachés à l’employé. Un type peut exiger une pièce et une approbation. Les états sont DRAFT, PENDING, APPROVED, REJECTED, CANCELLED. L’approbation contrôle pièce requise et chevauchement. Le salarié lié peut demander pour lui-même (`hr.leave.request`), tandis que RH peut créer/gérer dans son scope. **[Code vérifié]** migration 066 et `hr-leave.routes.ts`.

Aucun impact automatique sur salaire, rémunération, budget ou trésorerie n’a été trouvé. Le champ `requires_approval` existe, mais l’audit n’a pas établi un chemin d’auto-approbation lorsque sa valeur est fausse. **[Code vérifié / fonctionnalité non démontrée]**

Congés et absences sont non applicables par défaut aux prestataires. Une indisponibilité contractuelle éventuelle doit être distinguée du droit salarié. Tests identifiés : `hr-leave-lot11b.test.ts`, `hr-leave-lot11b-mysql.integration.ts` et test frontend. **[Test existant, non rejoué]**

## 10. GED

La fiche utilise la GED commune avec les entités `employee`, `employee_contract`, `employee_leave` et `employee_bonus`. `document-access.ts` résout leur territoire depuis l’employé et impose, en plus des droits GED, les droits métier correspondants (`hr.employees.view`, `hr.contract.view`, `hr.leave.view`, `hr.bonus.view`). **[Code vérifié]**

Fonctions présentes : import multipart, validation de type/taille, hash SHA-256, détection de doublon, catégories/types, référence/date/expiration, liste, détail, aperçu PDF/image avec signature binaire, téléchargement, ajout d’une nouvelle version liée par `parent_document_id`, archivage logique et restauration. Il n’existe pas de suppression physique exposée : DELETE archive. Chaque import/version/archive/restauration est audité ; aperçu et téléchargement tentent également une trace sans bloquer la lecture si l’audit échoue. **[Code vérifié]** `document.routes.ts`, `document-storage.ts`, `documentHooks.ts`.

Le stockage nouveau est privé sous une clé `ged:` ; les chemins sont confinés et l’intégrité est vérifiée à la lecture. Les documents archivés sont conservés et requièrent `ged.archive`. **[Code vérifié]**

Réemploi prestataire : conserver exactement ce moteur, ajouter les nouveaux types de rattachement au résolveur d’entités et aux unions de recherche, puis appliquer le scope Personnel. Contrat signé, identité, RCCM/NIU et attestations doivent être des catégories/types, pas un nouveau stockage. **[Analyse]**

## 11. Apparition dans Salaires

L’onglet Salaires réutilise `GET /hr/employees`, avec les mêmes filtres, compteurs, pagination et scopes. Un employé apparaît donc dès sa création, quel que soit son statut et même sans contrat/salaire, sauf filtre explicite. Lié et autonome sont traités de la même façon. **[Code vérifié]**

Le salaire courant est la dernière ligne `salary_history` dont `effective_date <= CURDATE()`, triée par date puis identifiant décroissants. Sans ligne applicable, l’interface affiche une absence de valeur ; l’employé n’est pas masqué. La donnée n’est sélectionnée que pour `hr.salary.view`. **[Code vérifié]** `hr.routes.ts`, `HrAdministrationPage.tsx`.

Un prestataire ne doit pas entrer dans cette liste salariale par simple création. La future distinction de nature doit exclure les prestataires de Salaires ou renommer/généraliser explicitement l’écran après décision métier. **[Recommandation]**

## 12. Définition des salaires

`POST /hr/employees/:id/salaries` exige `hr.salary.manage`, un montant strictement positif et une date d’effet valide. La route ajoute une ligne ; elle ne modifie aucune ligne passée et ne requiert ni statut actif ni contrat actif. L’unicité employé/date empêche deux valeurs au même jour. **[Code vérifié]** `hr.routes.ts`, table `salary_history` du baseline.

Le salaire initial est donc la première ligne ; une augmentation ou réduction est une nouvelle ligne datée, sans type explicite d’évolution. Une valeur inférieure positive est techniquement acceptée. La référence applicable à une date est la dernière ligne effective. **[Code vérifié]**

Les validations contractuelles ne surviennent qu’au moment de préparer la rémunération. Il existe donc un risque de saisir un salaire pour une fiche inactive ou sans contrat, même si elle ne sera pas préparée. **[Code vérifié, risque fonctionnel]**

## 13. Historique salarial

L’API expose `GET /hr/employees/:id/salaries` sous `hr.salary.view`, tri décroissant. Aucune route d’édition ou suppression d’une ligne de salaire n’a été trouvée : l’historique est append-only au niveau applicatif audité. **[Code vérifié]**

Les rémunérations conservent `salary_history_id` et un snapshot `salary_amount`; une évolution ultérieure ne réécrit donc pas une rémunération déjà préparée. La FK `RESTRICT` interdit la suppression de la référence utilisée. **[Code vérifié]** migration 074.

La concurrence est partiellement couverte par l’unicité employé/date ; la route salariale ne présente pas un verrouillage global de séquence comparable à la préparation de rémunération. **[Code vérifié]** Test identifié : `hr-salary-scope-mysql.integration.test.ts`. **[Test existant, non rejoué]**

## 14. Parcours de rémunération

Ordre réel :

1. `POST /hr/remunerations/prepare` : période mensuelle ; sélection des employés actifs, contrat actif couvrant la période, salaire applicable, absence de rémunération déjà préparée ; snapshot salaire + primes approuvées non consommées ; création DRAFT. Permission `hr.remuneration.prepare` et transaction avec verrous. Aucun effet financier.
2. `PATCH /hr/remunerations/:id` : correction du montant payable positif avec motif, DRAFT seulement. Aucun effet financier.
3. `POST .../submit` : DRAFT ou REJECTED vers SUBMITTED. Permission `hr.remuneration.submit`.
4. `POST .../validate` ou `/reject` : SUBMITTED vers VALIDATED ou REJECTED ; le décideur ne peut être ni préparateur ni soumetteur. Permission `hr.remuneration.validate`.
5. `POST .../engage` : VALIDATED sans dépense vers création d’une `budget_expense` DRAFT compatible en territoire, devise, dates et disponible. Permissions `hr.remuneration.engage` et `hr.expense.create`.
6. Circuit central de dépense : soumission puis approbation via permissions `hr.expense.submit` et `hr.expense.approve`.
7. `POST .../payments` : rémunération VALIDATED + dépense approuvée ; délégation à `budgetExpenseDisburse`. Permissions cumulées `hr.remuneration.pay`, `hr.expense.disburse`, `treasury.disbursement.create`.

**[Code vérifié]** `RemunerationsAdministration.tsx`, `hr-remuneration.routes.ts`, `remuneration-separation.ts`, routes RH centrales et `treasury.service.ts`.

Le calcul automatique est `salaire snapshot + primes approuvées de la période`. Aucun prorata, cotisation, retenue, impôt ou avantage non monétaire automatique n’a été trouvé. **[Absent]**

## 15. Approbations

Trois décisions distinctes existent : validation de la rémunération, approbation de la dépense budgétaire, puis autorisation technique/permissionnelle du décaissement. La validation RH ne réserve ni ne sort de liquidité. **[Code vérifié]**

La rémunération interdit au préparateur et au soumetteur de valider. Le circuit des dépenses applique ses propres règles d’approbation et d’historique. Les permissions sont dynamiques et aucune fonction d’approbateur n’est codée comme rôle fixe ; SUPER_ADMIN reçoit les droits globaux par migrations. **[Code vérifié]** migrations 072/074.

Pour une future rémunération prestataire, ces séparations doivent être conservées et complétées par les règles de réception de service/facture à décider. **[Recommandation]**

## 16. Décaissements

`budgetExpenseDisburse` verrouille dépense, compte et objets d’idempotence ; vérifie dépense approuvée, scope, compte actif, territoire, devise, solde disponible, montant restant, catégorie, moyen de paiement et réservation optionnelle. Il crée `budget_expense_disbursements`, puis un `treasury_movements` OUT, `event_type='POSTED'`, `source_type='BUDGET_EXPENSE_DISBURSEMENT'`. **[Code vérifié]** `treasury.service.ts`.

L’idempotence est fondée sur `(created_by, client_request_id)` et la conformité du payload ; un doublon n’est reconnu valide que s’il retrouve son mouvement posté. Les paiements partiels sont autorisés. Une rémunération est UNPAID si le net posté vaut 0, PARTIAL s’il est inférieur au payable, PAID s’il est supérieur ou égal. Les extournes identifiées par `reversal_of_id` sont retranchées. **[Code vérifié]** `hr-remuneration.routes.ts` (`paymentSql`, `select`).

Une réservation de liquidité peut être fournie et consommée, mais le parcours de rémunération n’en crée pas automatiquement. « Montant prévu » = `payable_amount`; « approuvé » = dépense approuvée ; « réservé » = réservation active éventuelle ; « payé » = somme nette effectivement postée. **[Code vérifié]**

## 17. Interactions financières

Le domaine RH réutilise les budgets, rallonges, dépenses, historiques d’approbation, réservations et comptes de trésorerie communs. Le lien unique `hr_remunerations.budget_expense_id` empêche deux engagements pour la même rémunération ; la dépense est elle-même la source des décaissements et mouvements. **[Code vérifié]** migrations 059, 072 et 074.

Les contrats, congés et primes n’écrivent pas directement en trésorerie. Seule une prime approuvée intégrée à une rémunération affecte ensuite le montant engagé. Les justificatifs peuvent être attachés par la GED à l’employé, au bonus ou à la dépense ; aucun justificatif spécifique n’est rendu obligatoire par la route de paiement de rémunération. **[Code vérifié / absence de contrainte spécifique]**

La concurrence est traitée aux étapes critiques par transactions, `FOR UPDATE`, contraintes uniques, contrôle du solde restant et clé d’idempotence. **[Code vérifié]** Tests identifiés : `fin04-remunerations.test.ts`, `remuneration-separation.test.ts`, `remuneration-compatible-budgets.test.ts` et tests financiers du service trésorerie. **[Test existant, non rejoué]**

## 18. Statuts et transitions

| Objet | Transitions prouvées | Effets ou absences notables |
|---|---|---|
| Employé | création `active` par défaut ; édition vers active/inactive/departed ; Oui→Non = departed ; Non→Oui peut réactiver | aucun arrêt automatique de contrat, congé, prime ou rémunération déjà engagée |
| Contrat | DRAFT→ACTIVE→ENDED ; DRAFT→CANCELLED ; renouvellement→nouveau DRAFT | activation exige employé actif ; départ ultérieur ne clôt pas automatiquement |
| Congé | DRAFT→PENDING→APPROVED/REJECTED ; annulation selon règles | aucun effet salarial/financier automatique |
| Prime | DRAFT→PENDING→APPROVED/REJECTED/CANCELLED | APPROVED peut être consommée une fois par rémunération |
| Rémunération | DRAFT→SUBMITTED→VALIDATED/REJECTED ; REJECTED→SUBMITTED ; engagement et paiements sans changement de validation | état de paiement calculé séparément sur trésorerie |
| Document | actif→archivé→restauré ; nouvelle version crée une nouvelle ligne | conservation physique et historique |

**[Absent]** Pas de workflow global d’activation, suspension, départ, réactivation ou archivage orchestrant tous les sous-domaines. Pas de suppression d’employé. Le changement de fonction modifie le snapshot Personnel ; il ne réécrit pas les contrats/historiques. Le changement territorial direct d’une fiche autonome n’est pas exposé. **[Code vérifié]**

## 19. RBAC et scopes

Permissions principales : `hr.employees.view/manage`, `hr.employee.account.manage`, `hr.salary.view/manage`, `hr.contract.view/manage/type.manage`, `hr.leave.view/request/create/manage/approve/type.manage`, `hr.bonus.view/manage/approve/type.manage`, `hr.remuneration.view/prepare/submit/validate/engage/pay`, `hr.expense.create/submit/approve/disburse/view`, `treasury.disbursement.create`, `ged.view/upload/archive`. **[Code vérifié]** migrations et `requirePermission` des routes.

OWN est fondé sur `employee_profiles.user_id`, donc une fiche autonome n’est jamais « own ». AGENCY et CONCESSION suivent les snapshots territoriaux de la fiche ; GLOBAL traverse les territoires. Les catalogues de contrats exigent CONCESSION ou GLOBAL. Les montants salariaux sont masqués sans `hr.salary.view`, y compris dans la liste et le PDF complet. **[Code vérifié]**

Les droits métier GED s’ajoutent aux droits GED. Les validations ne reposent pas sur un rôle fixe. Aucune modification de SUPER_ADMIN n’est recommandée ; toute future permission doit suivre le même modèle scope + attribution dynamique. **[Code vérifié / recommandation]**

## 20. Cartographie frontend / API / services / tables SQL

| Domaine | Frontend / hooks | API / service | Tables |
|---|---|---|---|
| Collaborateurs | `UsersManagementPage.tsx`, `userHooks.ts` | `user.service.ts`, `hr-employee-sync.service.ts` | `users`, `user_roles`, `employee_profiles`, `audit_logs` |
| Personnel/Salaires | `HrAdministrationPage.tsx`, `EmployeeRecordModal.tsx`, `hrHooks.ts` | `hr.routes.ts`, `hr-employee-photo.ts` | `employee_profiles`, `salary_history` |
| Contrats | `EmployeeContractsSection.tsx`, `ContractTypesManager.tsx` | `hr-contract.routes.ts` | `employee_contract_types`, `employee_contracts` |
| Congés | sections fiche + hooks RH | `hr-leave.routes.ts` | `employee_leave_types`, `employee_leaves` |
| Primes | sections fiche + hooks RH | `hr-bonus.routes.ts` | `employee_bonus_types`, `employee_bonuses` |
| Rémunérations | `RemunerationsAdministration.tsx` | `hr-remuneration.routes.ts`, `remuneration-separation.ts` | `hr_remunerations`, `hr_remuneration_bonuses`, `hr_remuneration_history` |
| GED | `DocumentsGedPage.tsx`, `DocumentPreview.tsx`, `DocumentFileDropField.tsx`, `documentHooks.ts` | `document.routes.ts`, `document-access.ts`, `document-storage.ts` | `documents`, `document_categories`, `document_types` |
| Finance | écrans budgets/dépenses/trésorerie | routes RH centrales, `treasury.service.ts` | `budgets`, `budget_expenses`, `budget_approval_history`, `treasury_reservations`, `budget_expense_disbursements`, `treasury_movements` |

Toutes les écritures sensibles citées sont transactionnelles ; la simple consultation et certains audits de preview/download ne le sont pas par nature. **[Code vérifié]**

## 21. Composants réutilisables

- **Sans modification métier substantielle** : navigation RH, liste/pagination/recherche, modale de fiche, moteur GED et ses composants, catalogue/types et machine d’état des contrats, audit, temps réel, predicates de scope, circuit budget/dépense/trésorerie, idempotence de décaissement.
- **Après adaptation** : identité Personnel, liaison facultative à un compte, photographie, libellés et filtres, rattachement de contrat/GED à un sujet plus général, préparation d’une dette contractuelle, bénéficiaire et justificatifs.
- **Non applicable par défaut** : congés salariés, primes salariales, `salary_history`, paie mensuelle salaire + primes, statut « Employé de la concession ».
- **Décision métier obligatoire** : honoraires forfaitaires ou à jalon, périodicité, facture préalable, fiscalité/retenues, réception du service, personne morale et contacts, droits d’accès éventuels.

## 22. Écarts pour les prestataires

Le schéma impose actuellement prénom/nom, matricule, date d’embauche et statut d’emploi. Une personne morale ne peut y entrer sans valeurs artificielles. Les contrats pointent exclusivement vers `employee_profile_id` et ne portent ni montant, ni échéancier, ni livrable. La rémunération exige `salary_history` et un contrat actif couvrant tout le mois. **[Code vérifié]**

Écarts minimaux : discriminant salarié/prestataire ; forme physique/morale ; identité légale adaptée ; identifiants administratifs et contacts ; règles de territoire ; critères d’éligibilité aux écrans salariés ; source de montant contractuel ; preuve de service/facture ; bénéficiaire du paiement ; régime fiscal ; transitions de fin/suspension propres au contrat. **[Analyse]**

La table `suppliers` existe et la GED sait l’adresser, mais utiliser exclusivement Suppliers créerait une fiche et un parcours distincts, contrairement à l’objectif Personnel unifié, et fragmenterait contrat/historique. Elle peut rester une source comptable à relier, pas le modèle RH principal sans décision. **[Code vérifié / analyse]**

## 23. Comparaison des options d’architecture

### Option A — Étendre directement `employee_profiles`

Ajouter nature et forme juridique, rendre certains champs conditionnels, garder les FK actuelles. Avantages : migration et interface limitées, réemploi maximal. Inconvénients : nom/table/permissions salariés trompeurs, nombreuses colonnes nullables, risque d’envoyer un prestataire dans Salaires/paie et difficulté pour les personnes morales.

### Option B — Supertype Personnel + sous-types salarié/prestataire

Créer une identité commune (territoire, identité, contact, photo, compte optionnel), avec détails salarié et prestataire séparés ; généraliser les rattachements contrats/GED au sujet commun, tout en conservant salaire/congés/primes sur le sous-type salarié. Avantages : intégrité sémantique, fiche/navigation uniques, extension durable aux personnes morales. Inconvénients : migration et adaptation de FK plus importantes, besoin d’une compatibilité soigneuse pour les employés existants.

### Option C — Prestataire physique dans Personnel, société dans Suppliers

Réemploi rapide des tables existantes. Inconvénients : deux cycles, contrats et recherches fragmentés, règles différentes selon forme juridique, fort risque de doublon ; ne satisfait pas réellement l’unification demandée.

**Choix recommandé : Option B, livrée progressivement.** L’Option A peut sembler minimale mais transfère le coût dans toutes les validations futures. L’Option C doit être écartée comme architecture principale. **[Analyse motivée par le schéma audité]**

## 24. Risques de régression

| Risque | Cause | Impact | Prévention |
|---|---|---|---|
| Employés historiques altérés | migration de supertype/backfill incorrect | perte de liaison/historique | migration additive, correspondance 1:1 vérifiée, FK et comptages avant/après |
| Doublons utilisateur/RH | création concurrente ou deux identités | dossiers multiples | unicité de liaison, verrouillage, clé métier et tests concurrence |
| Prestataire dans Salaires | liste commune sans discriminant | exposition/calcul erroné | filtre serveur obligatoire sur nature, tests négatifs |
| Salaire appliqué au prestataire | réemploi direct de `salary_history` | comptabilité/fiscalité fausse | source contractuelle distincte et garde backend |
| Contrats incohérents | généralisation sans invariants | chevauchement/rupture d’historique | conserver snapshots, transitions, RESTRICT, tests reprise |
| Documents mal associés | mauvais type/id ou scope | fuite documentaire | étendre le résolveur GED, jamais accepter le territoire client |
| Accès hors scope | forme morale ou agence NULL mal traitée | fuite inter-agence | règle explicite de rattachement et tests OWN/AGENCY/CONCESSION/GLOBAL |
| Rémunérations exposées | permissions salariées réutilisées sans distinction | confidentialité | permissions et predicates au niveau backend, pas seulement UI |
| Double décaissement | second circuit ou idempotence perdue | perte financière | circuit central unique, clés idempotentes et contraintes uniques |
| Historique perdu | conversion destructrice/ON DELETE | audit incomplet | migrations additives, aucune suppression, conservation des snapshots |
| Cycle de départ incohérent | absence d’orchestrateur | contrats actifs après sortie | définir les effets métier avant automatisation |
| Régression 095/096 | modification identité/photo | photo inaccessible ou mauvaise source | préserver priorité avatar ERP/photo RH et tester lié/autonome |
| Territoire désynchronisé | client API modifie user sans payload RH | mauvais scope | rendre la synchronisation backend indépendante de la présence des champs RH |
| Auto-approbation de prime autonome | contrôle par bénéficiaire lié absent | séparation insuffisante | conserver explicitement créateur/soumetteur et vérifier acteur |

## 25. Questions métier restantes

1. Un prestataire est-il payé sur facture, échéance fixe, jalon, temps passé ou combinaison ?
2. Une facture et une réception/attestation de service sont-elles obligatoires avant engagement ou paiement ?
3. Quelles retenues, taxes et devises s’appliquent aux personnes physiques et morales ?
4. Les montants appartiennent-ils au contrat, à une annexe, à un bon de prestation ou à une facture ?
5. Une société possède-t-elle plusieurs contacts ou comptes ERP ?
6. Un prestataire peut-il être global concession, rattaché à plusieurs agences, ou sans agence ?
7. Un prestataire individuel peut-il également devenir salarié sans dupliquer son identité ?
8. Quels états : candidat, actif, suspendu, terminé, résilié, blacklisté ? Quels effets automatiques ?
9. Les contrats prestataires peuvent-ils se chevaucher et comporter plusieurs missions ?
10. Quels justificatifs sont obligatoires selon la forme juridique et avec quelles expirations ?
11. Quel acteur constate le service fait, qui soumet, qui valide et qui paie ?
12. Les primes/avantages, congés et absences sont-ils toujours interdits ou certains contrats prévoient-ils des équivalents distincts ?
13. Faut-il relier un prestataire personne morale à `suppliers` pour la comptabilité fournisseur ?
14. Quelle politique de conservation après fin du contrat et quel droit d’accès aux archives ?

## 26. Recommandation technique motivée

Créer à terme un **sujet Personnel commun** portant identité, forme, territoire, coordonnées, photo, compte ERP optionnel et état général ; conserver les attributs exclusivement salariés dans un sous-type employé et introduire un sous-type prestataire. L’écran et la fiche Personnel restent uniques avec sections conditionnelles. Les employés existants gardent leurs identifiants ou une correspondance 1:1 stable, sans réécriture des historiques. **[Recommandation]**

Généraliser le rattachement des contrats et de la GED au sujet commun en conservant leurs workflows actuels. Ne pas réutiliser `salary_history` pour les honoraires. Introduire, après décision métier, une source contractuelle/facture qui produit une demande de rémunération compatible avec le workflow de validation existant, puis obligatoirement une dépense et un décaissement par les services financiers actuels. **[Recommandation]**

Toutes les gardes doivent être serveur : nature autorisée, territoire, contrat applicable, justificatifs, séparation des acteurs, devise, budget, compte et idempotence. L’interface ne doit être qu’une représentation de ces règles. Aucun nouveau rôle fixe, module de navigation, GED, moteur de contrats ou système de paiement n’est justifié par l’audit. **[Recommandation]**

## 27. Proposition de découpage de l’implémentation

1. **Décisions métier et contrats d’API** : trancher les 14 questions, définir états/invariants et matrice salarié/prestataire.
2. **Socle de données additif** : sujet commun et sous-types, backfill 1:1 des employés, contrôles de comptage/FK, compatibilité avec migrations 095/096 ; aucune suppression historique.
3. **Personnel unifié** : liste, filtres, fiche, créations physique/morale, liaison ERP, photo et scopes ; exclusion serveur de Salaires.
4. **Contrats et GED** : généraliser les FK/résolveurs, réutiliser transitions, versions, archivage, catégories et audit ; ajouter seulement les champs contractuels décidés.
5. **Rémunération prestataire** : source montant/facture/service fait, préparation et validation adaptées ; aucune utilisation forcée de `salary_history`, primes ou congés.
6. **Intégration financière** : produire la dépense centrale, conserver approbations, réservations optionnelles, décaissement idempotent et statut net des extournes.
7. **Qualification** : migrations vierges et reprises, non-régression employés, personnes physiques/morales, scopes complets, concurrence, séparation, double paiement, GED, migration/photo 095/096, frontend/API/MySQL/navigateur.

## Verdict final

L’existant fournit un socle réutilisable solide pour Personnel, contrats, GED, audit, scopes et finance. Il ne fournit pas encore un modèle de prestataire ni une rémunération contractuelle : les assimiler à un employé et à un salaire créerait des erreurs métier et financières. La voie sûre est une généralisation additive du sujet Personnel avec sous-types, suivie d’une adaptation contrôlée des contrats et de la source de rémunération, tout en conservant intégralement le circuit financier central. **Audit terminé ; aucune implémentation ni validation en exécution n’a été réalisée.**
