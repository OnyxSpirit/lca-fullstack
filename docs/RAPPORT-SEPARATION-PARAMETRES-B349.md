# Rapport de fin de lot B.3.4.9 — Séparation des paramètres documentaires

Date : 18 octobre 2026  
Projet : ERP / CRM — La Congolaise de l'Automobile

## 1. Résumé

La page Paramètres présente désormais deux sections distinctes : **Documents et GED**, puis immédiatement **Signatures et cachets** pour les utilisateurs autorisés. Les composants existants ont été déplacés sans duplication et sans modification de leur logique, de leurs hooks ou de leurs contrats API.

## 2. État initial

L'unique onglet technique `documents`, libellé « Documents / GED », montait successivement `DocumentMarksSettings` et `DocumentReferencesSettings`. Le guard de la route Paramètres reposait déjà sur `settings.view`; `DocumentMarksSettings` appliquait déjà les permissions granulaires de lecture et de gestion.

Une modification locale antérieure existait dans `frontend/src/modules/documents/DocumentsGedPage.tsx` : le bouton « Visionner » avait été renommé « Aperçu ». Elle est hors périmètre du lot et a été strictement préservée.

## 3. Modifications réalisées

- Ajout de la clé d'onglet `marks`.
- Libellé de l'onglet documentaire harmonisé en « Documents et GED ».
- Ajout de « Signatures et cachets » immédiatement après l'onglet documentaire.
- Maintien de l'unique instance de `DocumentReferencesSettings` dans `documents`.
- Déplacement de l'unique instance de `DocumentMarksSettings` dans `marks`.
- Présentation de `marks` seulement si `signature.view.self` ou `stamp.view` est accordée.
- Conservation du guard général `settings.view` et des contrôles d'écriture internes `signature.manage.self` et `stamp.manage`.
- Ajout de cinq tests ciblés de structure, navigation, unicité de montage et RBAC.

## 4. Fichiers modifiés par le lot

- `frontend/src/modules/settings/SettingsPage.tsx`
- `frontend/test/settings-document-marks-separation-b349.test.ts`
- `docs/RAPPORT-SEPARATION-PARAMETRES-B349.md`

Le rapport d'audit B.3.4.0 et la modification locale de `frontend/src/modules/documents/DocumentsGedPage.tsx` étaient déjà présents avant cette implémentation et n'ont pas été modifiés par le lot.

## 5. Comportement final

- Un utilisateur possédant `settings.view` et au moins une permission de consultation de marque voit les onglets dans l'ordre « Documents et GED », « Signatures et cachets ».
- « Documents et GED » affiche uniquement les références et paramètres documentaires existants.
- « Signatures et cachets » charge le composant autonome existant avec signatures, cachets, catégories, prévisualisations et politiques.
- Un utilisateur Paramètres sans `signature.view.self` ni `stamp.view` ne voit pas l'onglet et ne monte donc pas le composant ni ses queries.
- Le composant reste chargé paresseusement dans le même `Suspense`, avec le responsive horizontal existant.
- Aucune entrée de barre latérale, route ou fonctionnalité métier supplémentaire n'a été créée.

## 6. Permissions vérifiées

- Guard de route inchangé : `settings.view` dans `ModuleGuard`.
- Consultation de la section : `signature.view.self` ou `stamp.view`.
- Gestion de la signature : `signature.manage.self`, inchangée dans `DocumentMarksSettings`.
- Gestion des cachets et politiques : `stamp.manage`, inchangée dans `DocumentMarksSettings`.
- Consultation cachets : `stamp.view`, inchangée.
- Aucun rôle fixe, scope, backend RBAC ou permission nouvelle.
- Un droit de consultation seul ne rend aucune action d'écriture visible.

## 7. Tests exécutés

### Tests ciblés Paramètres et marques

Commande directe sur quatre fichiers de test :

- 22 tests exécutés.
- 22 réussis.
- 0 échec.

Ils couvrent notamment les cinq nouveaux scénarios B349, le guard Paramètres, la lecture seule, les imports paresseux, les signatures, cachets, politiques et permissions existantes.

### Qualification frontend

- `npm run lint` : **PASS** (`tsc --noEmit`).
- `npm run build` : **PASS**, 2 505 modules transformés.
- `git diff --check` : **PASS**.

### Suite frontend complète

- 881 tests exécutés.
- 880 réussis.
- 1 échec.

L'unique échec est `UI-DOC-01/02 Visionner ouvre le composant commun`. Il attend littéralement `>Visionner<`, alors que la modification locale préexistante et préservée affiche `Aperçu`. Cet échec n'est causé ni par `SettingsPage` ni par le nouveau test B349. Le lot ne modifie pas ce fichier ou ce test hors périmètre.

## 8. Résultats détaillés

| Contrôle | Résultat |
|---|---|
| Deux sections distinctes | PASS |
| Ordre Documents puis Signatures/cachets | PASS |
| Références uniquement dans Documents | PASS |
| Marques uniquement dans marks | PASS |
| Composant monté une seule fois | PASS |
| Guard `settings.view` conservé | PASS |
| Lecture et gestion séparées | PASS |
| Absence de requêtes marques sans permission de lecture | PASS par non-montage |
| Routes/API/hooks inchangés | PASS par inspection du diff |
| PDF, backend, SQL et migrations inchangés | PASS par inspection du diff |
| Lint | PASS |
| Build | PASS |
| Tests ciblés | 22/22 PASS |
| Suite frontend complète | 880/881 PASS, réserve préexistante documentée |

## 9. Tests non exécutés et raisons

- Recette navigateur authentifiée : non exécutée, car aucun environnement frontend isolé contenant ce nouveau build et aucun jeu de sessions multi-permissions n'ont été démarrés dans le cadre strict de cette mission.
- Tests backend documentaires : non exécutés ; aucun fichier backend, contrat API, PDF ou persistance n'a changé et aucune base n'était nécessaire.
- Docker/MySQL : non démarrés, reconstruits ou modifiés conformément aux contraintes.

## 10. Risques résiduels

- La recette visuelle réelle multi-rôles et mobile reste à effectuer lors d'une campagne autorisée.
- La suite complète reste rouge tant que le test historique attend « Visionner » alors que le changement local affiche « Aperçu ». La décision de conserver le nouveau libellé et d'adapter le test appartient au chantier ayant introduit cette modification.
- Si les permissions sont retirées dynamiquement pendant que l'utilisateur est déjà dans l'onglet `marks`, le contenu disparaît immédiatement ; un retour automatique vers un onglet visible pourrait être envisagé ultérieurement, mais n'est pas nécessaire à l'accès ni autorisé comme extension de ce lot.

## 11. Vérification des modifications locales

Le contrôle initial a trouvé :

- `M frontend/src/modules/documents/DocumentsGedPage.tsx` — changement préexistant `Visionner` → `Aperçu`.
- `?? docs/RAPPORT-AUDIT-FONCTIONNEL-B340.md` — rapport du lot d'audit précédent.

Les deux éléments sont préservés. Aucun reset, restore, stash, clean, changement de branche, commit ou push n'a été effectué.

## 12. Verdict

**VALIDÉ AVEC RÉSERVES.**

La séparation demandée est implémentée, le RBAC et les composants existants sont préservés, les 22 tests ciblés, le lint et le build passent. Les réserves sont limitées à l'absence de recette navigateur authentifiée et à l'unique échec de la suite complète provoqué par une modification locale préexistante hors périmètre.
