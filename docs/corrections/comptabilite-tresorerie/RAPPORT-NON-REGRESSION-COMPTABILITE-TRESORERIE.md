# Rapport de non-régression — Comptabilité & Trésorerie

## Synthèse

| Couche | Résultat |
|---|---|
| Frontend ciblé | 8/8 fichiers réussis |
| Backend ciblé | 7/7 fichiers réussis |
| TypeScript | lint frontend et backend réussis |
| Builds | Vite et backend TypeScript réussis |
| MySQL isolé | READY, niveau 124, 54 appliquées, 0 pending/warning/blocking |
| OCR dépendances | Poppler/Tesseract/fra+eng présents |

## Frontend

Commande : `node --import tsx --test --test-concurrency=1` sur :

- `accounting-treasury-global-corrections.test.ts`
- `fin08-financial-ux.test.ts`
- `lot1-treasury-modernization.test.ts`
- `lot2-accounting-ui.test.ts`
- `lot3-accounting-ui.test.ts`
- `lot4-accounting-automation-ui.test.ts`
- `treasury-foundation.test.ts`
- `treasury-functional-corrections.test.ts`

Résultat : 8 réussis, 0 échec. Le build Vite a transformé 2 546 modules et terminé avec succès.

## Backend

Commande Node test avec environnement factice et mocks de modules sur :

- `accounting-treasury-global-corrections.test.ts`
- `lot1-financial-dashboard.test.ts`
- `lot2-accounting-foundation.test.ts`
- `lot3-accounting-engine.test.ts`
- `lot4-accounting-automation.test.ts`
- `lot5-accounting-advanced.test.ts`
- `lot6-bank-reconciliation.test.ts`

Résultat : 7 réussis, 0 échec. Build et lint réussis.

## MySQL et migrations

La base `lca_compta_recette_isolee` a été créée séparément. Le mécanisme officiel a appliqué baseline/seeds et migrations jusqu'à 124. Le contrôle final retourne : connexion OK, `READY`, 54 appliquées, aucune en attente, aucun avertissement, aucun blocage. Aucune commande d'écriture n'a ciblé `concession_erp`.

## Couverture fonctionnelle

- RBAC : garde « au moins une permission comptable », onglets filtrés, validation d'import séparée, actions avancées permissionnées.
- Multi-agences : resynchronisation de l'onglet et scoping backend inspectés/testés par contrat. Le basculement navigateur avec deux identités reste manuel.
- Bancaire : CSV décimal, XLSX, PDF textuel, profils, groupes, allocations, écarts, annulations et limites de taille couverts par tests de contrat/unitaires.
- Comptable : équilibre, référentiels, automatisation, contrôles, clôture, préparation annuelle/report et exports couverts.
- Exports : MIME XLSX, extension `.xlsx`, CSV/PDF/XLSX génériques.
- OCR : image reconstruite et binaires/langues vérifiés. Le chemin PDF textuel est automatisé ; un PDF scanné réel n'a pas été OCRisé dans cette campagne.

## Échecs rencontrés et corrigés

- Quatre tests de contrat supplémentaires étaient périmés après l'alignement des textes/permissions ; leurs attentes ont été réorientées vers les contrats actuels.
- Le build Vite a détecté une expression JSX ambiguë dans les lignes de tableau ; les boutons de détail ont été rendus hors du tableau de valeurs.
- La première reconstruction Docker s'est bloquée sur un ownership récursif ; `COPY --chown` a corrigé le problème et la reconstruction suivante a réussi.
- Le premier bootstrap isolé a été refusé faute de privilège du compte applicatif ; un droit limité exclusivement à `lca_compta_recette_isolee.*` a été accordé.

## Scénarios non exécutés

- OCR bout en bout d'un PDF bancaire image réel.
- Parcours navigateur multi-agences avec deux comptes et permissions divergentes.
- Écritures métier complètes 1↔N et N↔1, annulation, clôture/réouverture et report sur données fictives riches.
- Ouverture visuelle des exports dans Excel/LibreOffice et contrôle PDF page par page.
- Sage et états officiels : bloqués par spécifications externes.

Ces scénarios sont proposés au propriétaire dans le guide manuel ; aucune recette globale finale n'a été lancée.

