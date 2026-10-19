# Rapport de progression CRM — Lot B.3.4.6

## 1. Résumé exécutif

Le score historique d'une opportunité et sa progression commerciale sont désormais présentés comme deux indicateurs indépendants. Le score reste stocké dans `opportunities.probability`. La progression n'est pas persistée : elle est calculée côté backend à partir de l'étape canonique, puis ajoutée aux réponses API.

Aucune donnée, migration, permission, transition ou règle de vente n'a été modifiée.

## 2. Problème initial

Le CRM affichait `probability` sous les libellés courts **Score** et **Score opportunité**. Aucun indicateur distinct ne représentait l'avancement dans le pipeline. Un score élevé pouvait donc être interprété à tort comme une étape commerciale avancée.

## 3. Cartographie des champs

| Notion | Source | Type | Écriture | Présentation |
|---|---|---|---|---|
| Score de qualification | `opportunities.probability` | `DECIMAL(5,2) NULL` | création et `PATCH /leads/:id`, validation 0–100 | CRM et Client 360 |
| Étape commerciale | `opportunities.stage` | `ENUM` de neuf valeurs | transitions CRM et actions métier | CRM, Client 360, agrégats de pipeline |
| Progression commerciale | dérivée de `stage` | `number \| null` | aucune persistance | CRM et Client 360 |

Les routes de liste, détail, création et modification des prospects exposaient déjà `probability`. Client 360 exposait également ce champ. Aucun agrégat de tableau de bord ne calcule actuellement une moyenne de `probability` ; les taux de conversion et volumes existants ont une autre signification et restent inchangés.

## 4. Signification du score actuel

`probability` est un score/probabilité de qualification, indépendant du pipeline. Il peut être fourni à la création ou modifié avec `crm.prospect.update`. Sa modification ne touche pas `stage`. Le nom SQL, les valeurs historiques et le contrat `probability` ont été conservés.

L'interface utilise désormais le libellé explicite **Score de qualification**. Aucun recalcul historique n'est réalisé.

## 5. Étapes commerciales réelles

Les valeurs SQL existantes sont :

- `new` — Nouveau ;
- `contacted` — Contacté ;
- `qualified` — Qualifié ;
- `appointment` — Rendez-vous ;
- `test_drive` — Essai routier ;
- `offer` — Offre et devis ;
- `negotiation` — Négociation ;
- `won` — Vente gagnée ;
- `lost` — Vente perdue.

`won` et `lost` sont terminaux. Les étapes structurantes `appointment`, `test_drive`, `offer` et `won` restent produites par leurs actions métier respectives. Les transitions libres, préconditions, transactions et audits existants n'ont pas été modifiés.

## 6. Barème de progression

La fonction backend centrale `commercialProgressForStage` applique :

| Étape | Progression |
|---|---:|
| Nouveau | 0 % |
| Contacté | 10 % |
| Qualifié | 25 % |
| Rendez-vous | 40 % |
| Essai routier | 55 % |
| Offre et devis | 70 % |
| Négociation | 85 % |
| Vente gagnée | 100 % |

Une étape inconnue produit une progression `null` et l'état `UNAVAILABLE`. L'interface affiche alors **Indisponible** plutôt qu'une valeur inventée.

## 7. Traitement des ventes perdues

Une opportunité `lost` reçoit :

- `commercialProgress: null` ;
- `commercialProgressState: "LOST"` ;
- présentation : **Vente perdue**.

Elle n'est jamais présentée à 100 %. Faute d'historique garantissant la dernière étape significative, aucun ancien pourcentage n'est reconstitué. Le score historique, le motif, le statut terminal et l'historique restent inchangés.

## 8. Architecture retenue

La règle unique est placée dans `backend-node/src/modules/crm/crm-commercial-progress.ts`. Elle est réutilisée par :

- les DTO des routes CRM ;
- les opportunités de Client 360.

Le frontend ne recalcule pas le barème. Il formate uniquement la valeur et l'état transmis par l'API. Cette architecture évite une colonne SQL redondante et des barèmes divergents entre écrans.

## 9. Modifications backend

- Ajout du calcul central de progression.
- Enrichissement additif des réponses CRM.
- Enrichissement additif des opportunités Client 360.
- Aucun changement des requêtes d'écriture, transitions, permissions ou scopes.
- Aucune migration et aucune écriture sur une base métier.

## 10. Modifications frontend

- Ajout de `commercialProgress` et `commercialProgressState` au type `Lead`.
- Mapping des deux propriétés additives de l'API.
- Cartes Kanban : **Qualification** et **Progression** visuellement distinctes.
- Liste CRM : colonnes **Score de qualification** et **Progression commerciale**.
- Fiche prospect : affichage complet des deux indicateurs.
- Client 360 : libellés explicites pour les opportunités.
- Styles existants, responsive et états vide/chargement préservés.

## 11. Indépendance des indicateurs

- Modifier `probability` ne modifie pas `stage` et donc pas la progression.
- Modifier `stage` ne modifie pas `probability`.
- Un rendez-vous peut avoir un score de 85 % et une progression de 40 %.
- Une vente gagnée a une progression de 100 % sans réécriture du score.
- Une vente perdue conserve son score et affiche un état terminal sans faux 100 %.

Ces invariants sont couverts par les tests backend de contrat et les tests réels du composant CRM.

## 12. Tableaux de bord

Les tableaux de bord utilisent des volumes, montants, taux de conversion et agrégats par étape. Aucun ne présentait une moyenne de `probability`. Aucune formule ni aucun libellé de tableau de bord n'a donc été modifié. Les tests de scope et les tests frontend des tableaux de bord passent.

## 13. Contrats API

Les champs existants, formats de pagination, filtres et tris sont conservés. Deux champs sont ajoutés :

- `commercialProgress: number | null`, dérivé de l'étape courante ;
- `commercialProgressState: "ACTIVE" | "WON" | "LOST" | "UNAVAILABLE"`.

Le champ historique `probability` reste inchangé. Les consommateurs anciens peuvent ignorer les nouveaux champs.

## 14. Permissions et scopes

Aucune permission n'a été ajoutée. Le calcul s'effectue sur les opportunités déjà autorisées par les scopes `OWN`, `AGENCY`, `CONCESSION` et `GLOBAL`. Aucune requête supplémentaire ni exposition hors périmètre n'a été introduite.

## 15. Tests backend

Qualification backend CRM étendue : **63 réussis, 0 échec, 0 ignoré**.

Elle couvre notamment :

- le barème complet et les états terminal/inconnu ;
- l'indépendance score/étape ;
- les contrats CRM et Client 360 ;
- les 81 couples de transitions ;
- les rendez-vous B.3.4.1 ;
- pagination, négociation, devis, vente et Client 360 ;
- RBAC dynamique et les quatre scopes ;
- tableaux de bord CRM.

`npm run lint` backend : **PASS**.  
`npm run build` backend : **PASS**.

## 16. Tests frontend

Tests ciblés initiaux : **20 réussis, 0 échec, 0 ignoré**. Ils couvrent le rendu 85 % / 40 %, la vente gagnée, la vente perdue, l'inconnu, la vue liste, les rendez-vous et la négociation.

Suite frontend complète finale : **911 réussis, 0 échec, 0 ignoré**, durée Node rapportée : **101,875 s**.

Le premier passage complet avait détecté une attente historique de `colSpan=8` devenue obsolète après l'ajout des deux colonnes. Cette attente a été corrigée à 10, puis la suite complète a été rejouée avec succès.

`npm run lint` frontend : **PASS**.  
`npm run build` frontend : **PASS**, 2 508 modules transformés.

## 17. Non-régression

Les tests confirment la préservation :

- des rendez-vous B.3.4.1 ;
- des paginations CRM et Client 360 ;
- des devis, négociations et ventes ;
- du RBAC et des scopes ;
- des tableaux de bord ;
- des états de chargement et d'absence de données ;
- des lots signatures/cachets, GED et emplacements véhicules via la suite globale.

`git diff --check` : **PASS**.

## 18. Recette navigateur

La recette navigateur réelle n'a pas été exécutée. Aucun service ne répondait sur `127.0.0.1:3001` ni `127.0.0.1:4183`. Aucun serveur, conteneur ou volume n'a été démarré ou modifié.

Le rendu réel du composant `CrmPage` est couvert sous JSDOM, mais cela ne remplace pas une recette visuelle multi-écran et un parcours authentifié contre une API locale.

## 19. Fichiers modifiés

- `backend-node/src/modules/crm/crm-commercial-progress.ts`
- `backend-node/src/modules/crm/crm.routes.ts`
- `backend-node/src/modules/customers/customer.routes.ts`
- `backend-node/test/crm-commercial-progress-b346.test.ts`
- `frontend/src/types/index.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/customers/CustomerDetailPage.tsx`
- `frontend/test/crm-commercial-progress-b346.behavior.test.ts`
- `frontend/test/table-empty-states.test.ts`
- `docs/RAPPORT-PROGRESSION-CRM-B346.md`

## 20. Modifications locales préservées

Les fichiers des lots B.3.4.9, B.3.4.9.1, B.3.4.5, B.3.4.5.1, B.3.4.7, B.3.4.3 et B.3.4.1 n'ont pas été écrasés. La migration 093, le référentiel GARAGE, les signatures/cachets, la GED, les transferts véhicules et les workflows financiers n'ont pas été modifiés par ce lot.

## 21. Réserves

La seule réserve est l'absence de recette navigateur réelle et responsive contre un environnement local authentifié.

## 22. Verdict final

**VALIDÉ AVEC RÉSERVES**

Le score historique est conservé, la progression est exclusivement dérivée de l'étape, les deux indicateurs sont clairement séparés et une vente perdue n'est jamais assimilée à une vente gagnée. Toutes les validations automatisées finales sont concluantes. La réserve porte uniquement sur la recette navigateur non exécutée.
