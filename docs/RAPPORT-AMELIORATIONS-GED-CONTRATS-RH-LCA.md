# Rapport — Améliorations GED et contrats RH

Date : 14 octobre 2026  
Périmètre : application locale, sans déploiement ni reconstruction Docker

## 1. Analyse de l’existant

### GED

Les catégories et types documentaires utilisent déjà les tables `document_categories` et `document_types`, les API `/settings/document-categories` et `/settings/document-types`, la permission `settings.update` et les hooks React Query communs. L’API autorise réellement la modification du code, du nom, de l’ordre d’affichage et, pour un type, de sa catégorie.

Les deux seuls `window.prompt()` du parcours Paramètres → Documents et GED se trouvaient dans `DocumentReferencesSettings.tsx`, pour modifier une catégorie ou un type.

### Contrats RH

Le référentiel dynamique était déjà complet depuis la migration 065 :

- table `employee_contract_types` par concession;
- table historique `employee_contracts`;
- permission `hr.contract.type.manage`;
- API de consultation, création et modification/statut;
- scopes CONCESSION et GLOBAL pour le référentiel collectif;
- rejet explicite des scopes OWN et AGENCY pour son administration;
- validation du type actif et de la concession dans les transactions de création, modification, activation et renouvellement;
- snapshots `type_code_snapshot` et `type_name_snapshot` dans chaque contrat;
- clé étrangère `ON DELETE RESTRICT`;
- audit central `writeAudit`.

Aucune table, permission ou migration supplémentaire n’était nécessaire.

## 2. Modifications GED

Les boîtes de dialogue natives ont été remplacées par deux modales React utilisant le composant `Modal` commun :

- « Modifier la catégorie documentaire » : code, nom et ordre d’affichage;
- « Modifier le type de document » : catégorie, code, nom et ordre d’affichage.

Les valeurs sont préremplies. Les formulaires fournissent des libellés accessibles, un focus initial explicite, une validation HTML, un état de chargement, une protection contre la double soumission, les boutons Annuler/Enregistrer et une erreur serveur visible avec `role="alert"`. La modale reste ouverte après une erreur, notamment un doublon HTTP 409. Après succès, les hooks existants actualisent le référentiel et les listes GED.

Aucun `window.prompt()` ou `prompt()` ne subsiste dans ce parcours. La création et l’activation/désactivation existantes ne sont pas modifiées.

## 3. Gestion des types de contrats

Le gestionnaire existant a été complété sans duplication fonctionnelle. Depuis la fiche employé, le responsable autorisé dispose de l’accès « Types de contrats » pour :

- consulter le catalogue et son état;
- créer un type avec code, libellé et description;
- modifier un type dans un formulaire prérempli;
- activer ou désactiver un type;
- voir si un type est déjà utilisé.

Lorsqu’un type est utilisé, son code est désactivé dans l’interface et également protégé par le backend. Un changement de libellé ne réécrit pas les snapshots des contrats existants. Les boutons sont neutralisés pendant une mutation et les erreurs ne ferment pas la modale.

Aucune suppression physique n’est exposée. Cette politique est plus stricte que le minimum demandé et privilégie la désactivation; la clé étrangère RESTRICT protège en plus tout type déjà utilisé.

## 4. Intégration dans « Nouveau contrat »

Le champ Type de contrat utilisait déjà `GET /hr/contract-types?active=true` et ne contient aucune liste CDI/CDD codée en dur. Il continue donc d’afficher uniquement les types actifs de la concession.

Les améliorations ajoutées sont :

- message explicite lorsqu’aucun type actif n’est disponible;
- désactivation de la création dans ce cas;
- focus initial cohérent;
- indicateur de chargement;
- prévention des doubles clics;
- fermeture uniquement après succès de l’API.

Le backend verrouille et vérifie toujours que le type existe, appartient à la concession de l’employé et est actif. Une erreur conserve la modale et les valeurs saisies.

## 5. Historique, RBAC et audit

Les contrats affichent `type_name_snapshot`, et non le libellé courant comme source historique. La désactivation ou le renommage d’un type ne modifie donc aucun contrat existant. Les créations et renouvellements prennent un nouveau snapshot dans la transaction.

L’administration reste gouvernée par `hr.contract.type.manage`. Aucun droit n’est accordé automatiquement et aucun bypass `SUPER_ADMIN` n’a été ajouté. Les opérations sensibles continuent d’utiliser `writeAudit`, avec la résolution territoriale centrale issue de la migration 081.

## 6. Migration et contrôle MySQL 8.4

Aucune migration 083 n’a été créée : le schéma existant suffit. Le contrôle en lecture seule de la base locale MySQL 8.4 confirme :

- version courante : 082;
- présence de `document_categories`, `document_types`, `employee_contract_types` et `employee_contracts`;
- permission active `hr.contract.type.manage` présente;
- aucune anomalie de snapshot détectée;
- actuellement aucun type ni contrat dans la base locale, donc aucune donnée métier n’a été créée pour la recette.

La base métier n’a subi aucune écriture.

## 7. Tests exécutés

| Test | Résultat |
|---|---|
| Build backend TypeScript | PASS |
| Build frontend Vite/React | PASS — 2 490 modules |
| Test ciblé `ged-contract-types-improvements` | PASS |
| Non-régression `hr-contract-lot11a` | PASS |
| Non-régression `ged-ux-02` | PASS |
| Absence de `prompt()` dans le parcours GED | PASS |
| Contrôle schéma MySQL 8.4 en lecture seule | PASS |
| `git diff --check` | PASS |

Les cas backend de doublon, type inactif, scope insuffisant, snapshot historique et restriction de suppression restent couverts par les validations et tests du module existant. Aucun test destructif n’a été lancé sur la base métier vide de types/contrats.

## 8. Fichiers modifiés

- `frontend/src/modules/settings/DocumentReferencesSettings.tsx`
- `frontend/src/modules/hr/ContractTypesManager.tsx`
- `frontend/src/modules/hr/EmployeeContractsSection.tsx`
- `backend-node/test/ged-contract-types-improvements.test.ts`
- `docs/RAPPORT-AMELIORATIONS-GED-CONTRATS-RH-LCA.md`

La modification préexistante non commitée de `frontend/src/modules/documents/DocumentsGedPage.tsx` a été conservée sans altération fonctionnelle par cette mission.

## 9. Anomalies restantes

Aucune anomalie bloquante identifiée dans le périmètre. Les autres usages de `window.prompt()` présents dans des modules sans rapport avec la modification des catégories/types GED sont hors mission et n’ont pas été modifiés.

## 10. Intégrité et verdict

- Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche.
- Aucun conteneur reconstruit ou redémarré.
- Aucun déploiement.
- Aucun volume ou donnée métier modifié.
- Archive officielle inchangée : `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

**Verdict : FAVORABLE.** Les deux évolutions sont implémentées en réutilisant les modèles, API, permissions, composants et mécanismes historiques existants.
