# Rapport — suppression des fenêtres natives du frontend LCA

Date de qualification : 15 octobre 2026.

## Synthèse et verdict

L'audit du code actif `frontend/src` a identifié **36 appels natifs métier** dans **18 fichiers** : **27 `window.prompt`**, **8 `window.confirm`** et **1 appel direct au `confirm` global**, et **0 `window.alert`**. Ils ont tous été remplacés. La recherche finale ne retourne plus aucun appel à `window/globalThis.prompt`, `confirm` ou `alert` dans les sources actives.

Un appel `deferredPrompt.prompt()` demeure dans le hook d'installation PWA : il s'agit de l'API standard `BeforeInstallPromptEvent`, pas d'une fenêtre métier native. Une fonction locale nommée `confirm` dans `TreasuryFlowMappingsTable` a également été examinée et conservée : elle pilote une modale React déjà existante.

Verdict technique : **conforme pour la suppression des dialogues natifs**, sous réserve d'une recette navigateur authentifiée des parcours métier listés plus bas.

## Inventaire initial

| Module / fichier | Prompt | Confirm | Données et action métier | Annulation / risque |
|---|---:|---:|---|---|
| `components/layout/Header.tsx` | 2 | 0 | Mot de passe actuel et nouveau | Aucune mutation si fermeture ; donnée sensible |
| `billing/InvoiceDetailPage.tsx` | 1 | 0 | Notes de facture | Conservation de la note existante |
| `crm/CrmPage.tsx` | 2 | 0 | Notes et motif d'annulation d'un devis | Mutation uniquement après saisie |
| `deliveries/DeliveryChecklistTemplates.tsx` | 2 | 0 | Renommage d'étape et de contrôle | Valeur existante préremplie |
| `deliveries/DeliveryDetailPage.tsx` | 4 | 0 | Annulation, report (date + motif), retour | Motifs obligatoires, aucune mutation à l'annulation |
| `hr/BudgetExpenseDisbursement.tsx` | 0 | 1 | Décaissement budgétaire | Action financière sensible et permission existante |
| `hr/EmployeeBonusesSection.tsx` | 1 | 0 | Refus/annulation de prime | Workflow et séparation des permissions conservés |
| `hr/EmployeeContractsSection.tsx` | 5 | 0 | Fin, annulation, renouvellement, référence et dates | Valeurs par défaut et validations existantes conservées |
| `hr/EmployeeLeavesSection.tsx` | 2 | 0 | Refus/annulation d'absence | Aucune mutation sans motif |
| `parts/SparePartsPage.tsx` | 1 | 1 | Confirmation et motif d'annulation fournisseur | Réceptions antérieures et reliquat préservés |
| `sales/SaleDetailPage.tsx` | 4 | 1 | Garantie, durée, kilométrage, notes, annulation | Décision de garantie explicite ; fermer ne choisit aucun état |
| `service/RepairOrderDetailPage.tsx` | 1 | 0 | Motif d'annulation d'OR | Mutation conditionnelle aux droits existants |
| `service/WarrantyCard.tsx` | 0 | 1 | Envoi de demande de garantie | Confirmation avant mutation |
| `settings/ManufacturersSettings.tsx` | 0 | 1 | Désactivation constructeur | Confirmation avant action sensible |
| `settings/VehicleLocationsSettings.tsx` | 1 | 0 | Renommage emplacement | Nom actuel prérempli |
| `users/UsersManagementPage.tsx` | 0 | 1 | Désactivation d’un utilisateur | Historique conservé ; confirmation avant mutation |
| `vehicles/VehicleDetailPage.tsx` | 1 | 1 | Motif de statut et suppression d'image | Transitions/RBAC inchangés |
| `workshop/WorkshopPlanningPage.tsx` | 0 | 2 | Démarrage et fin d'affectation | Confirmation avant mutation |
| **Total** | **27** | **9** | **36 occurrences** | |

Les appels API, mutations TanStack Query, gardes `can(...)`, états `isPending`, invalidations, messages de succès/erreur et transitions existants n'ont pas été déplacés ni modifiés.

## Remplacement effectué

Le composant partagé `BusinessDialogHost` a été ajouté au système UI existant et monté une seule fois dans `App.tsx`. Il réutilise le composant `Modal` et le composant `Button` du projet, donc la palette, la typographie, le responsive, le scroll, le piège à focus, Échap et la restitution du focus restent ceux de l'ERP.

Trois contrats asynchrones sont disponibles :

- `confirmAction` pour une confirmation sans saisie ;
- `promptAction` pour une saisie avec valeur initiale et type adapté, notamment `password` ;
- `choiceAction` pour une décision métier à deux issues, avec fermeture neutre.

Le cas garantie a reçu un traitement spécifique : « applicable » et « non applicable » sont deux choix explicites, tandis qu'Échap ou la fermeture renvoient `null` et ne déclenchent aucune mutation. Les deux mots de passe sont rendus avec des champs `type=password`. Les autres champs gardent leurs valeurs par défaut et validations métier historiques.

Le composant partagé n'introduit aucune dépendance et reste dans le chunk applicatif commun ; les pages métier demeurent chargées via `React.lazy` et le découpage Vite est conservé.

## Tests et résultats

| Contrôle | Résultat |
|---|---|
| TypeScript (`npm run lint`, soit `tsc --noEmit`) | Réussi |
| Tests ciblés `no-native-browser-dialogs.test.ts` | 3/3 réussis |
| Build Vite production (`npm run build`) | Réussi, 2 495 modules transformés |
| `git diff --check` | Réussi |
| Recherche finale explicite `window/globalThis.(prompt|confirm|alert)` | 0 occurrence dans `frontend/src` |
| Suite frontend complète | Exécutée ; nombreux échecs historiques hors périmètre déjà présents dans les tests de modules RH/GED/Trésorerie et assertions source devenues obsolètes |
| Recette navigateur authentifiée | Non exécutée : aucune session/identifiants de recette n'ont été fournis et aucune reconstruction Docker n'était autorisée |

Les nouveaux tests couvrent la présence du host partagé, les trois comportements (confirmation, saisie, choix neutre), le focus initial déclaré, le typage protégé des mots de passe et surtout l'absence exhaustive d'appel natif explicite dans tous les fichiers `.ts`, `.tsx`, `.js` et `.jsx` actifs.

La suite complète n'est pas verte indépendamment de ce lot. Les échecs observés concernent notamment des assertions textuelles anciennes sur RH, GED, Trésorerie et d'autres lots ; ils ne constituent donc pas une preuve de régression induite. Le build et la vérification TypeScript restent verts.

## Exceptions et limites

- `deferredPrompt.prompt()` est conservé : il déclenche l'installation PWA et ne correspond pas à `window.prompt()`.
- La fonction locale `confirm()` de `TreasuryFlowMappingsTable` est conservée : elle exécute l'action d'une modale React contrôlée avec protection `isPending`.
- Les mutations continuent à utiliser leurs indicateurs de chargement sur les boutons métier existants. Le dialogue partagé collecte/confirme la donnée puis se ferme avant la mutation, comme le contrat natif précédent ; la conservation de saisie après une erreur API dépend donc du composant métier appelant. Une refonte transactionnelle de chaque workflow dépasserait la correction ciblée et modifierait leur architecture.
- Aucun test navigateur multi-rôle n'a été possible dans cette mission sans environnement authentifié autorisé.

## Risques et recette manuelle recommandée

Le risque résiduel principal est ergonomique : libellé trop générique sur certains anciens prompts très compacts. Aucun risque identifié sur les calculs, la base, les permissions ou les transitions puisque les mutations et payloads sont inchangés.

À vérifier manuellement sur ordinateur et mobile :

1. mot de passe : masquage des deux valeurs, annulation et erreur serveur ;
2. décaissement : RBAC, double clic, annulation et succès ;
3. contrats/absences/primes : saisies obligatoires et erreurs API ;
4. garantie : trois sorties (applicable, non applicable, fermeture neutre) ;
5. annulations Vente, OR, Livraison, Devis et Pièces ;
6. navigation Tab/Maj+Tab, Échap et retour du focus ;
7. affichage mobile et contenus longs ;
8. pages chargées dynamiquement après navigation directe et rechargement.

## Fichiers techniques ajoutés

- `frontend/src/components/ui/BusinessDialog.tsx`
- `frontend/test/no-native-browser-dialogs.test.ts`

Aucune migration, modification de données, reconstruction Docker, modification d'archive, installation de dépendance, opération Git destructive, commit ou push n'a été effectué.
