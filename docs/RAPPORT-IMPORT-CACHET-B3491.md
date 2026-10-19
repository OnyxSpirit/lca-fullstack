# Rapport d'import du cachet — Lot B.3.4.9.1

## 1. État initial

Le formulaire **Paramètres de concession → Signatures et cachets → Cachets institutionnels** utilisait un champ fichier natif sans zone de dépôt. Au début du lot, l'arbre de travail ne contenait aucune modification suivie ou non suivie (`git status --short` vide). Les travaux antérieurs présents dans la base ont été conservés.

## 2. Composant concerné

- Formulaire du cachet : `frontend/src/modules/settings/DocumentMarksSettings.tsx`.
- Composant d'import réutilisé : `frontend/src/modules/documents/DocumentFileDropField.tsx`.
- Mutation et validation serveur existantes : inchangées.

## 3. Référence visuelle GED

La zone existante de la GED a été réutilisée plutôt que dupliquée. Ses conventions visuelles restent la référence : bordure en pointillés, coins arrondis, fond discret, icône d'import, états de survol et de dépôt actif, résumé du fichier et actions **Remplacer** / **Retirer**.

Les valeurs par défaut de la GED restent inchangées : PDF/PNG/JPEG, limite de 15 Mo, libellés et avertissements historiques. Le bouton GED **Aperçu** et le module Documents n'ont pas été modifiés.

## 4. Modifications réalisées

`DocumentFileDropField` accepte désormais des paramètres facultatifs pour les types MIME, l'attribut `accept`, la taille maximale, les libellés et le refus immédiat d'un fichier invalide. Les valeurs par défaut préservent le contrat GED existant.

Le formulaire du cachet utilise ce composant avec son contrat strict :

- `image/png` et `image/jpeg` uniquement ;
- taille maximale de 2 Mio ;
- refus immédiat des fichiers invalides ;
- message propre au format ou au dépassement de taille ;
- aucun enregistrement lors de la sélection ou du dépôt ;
- état de chargement conservé pendant la mutation de création.

La réinitialisation du formulaire intervient désormais seulement après une création réellement réussie. Une erreur de mutation conserve donc le fichier et les autres valeurs saisies.

## 5. Comportement de la zone

- Clic sur la zone ou sur **Sélectionner une image** : ouverture du sélecteur natif.
- Glisser-déposer : sélection locale de l'image, sans mutation API.
- Fichier valide : affichage du nom, du type et de la taille.
- **Remplacer** : nouvelle sélection avant validation.
- **Retirer** : suppression de la sélection locale uniquement.
- **Créer le cachet** : seul déclencheur de la mutation existante.

Le champ natif n'impose pas `required` dans ce formulaire piloté par l'état React. Cela évite qu'un dépôt valide soit bloqué par la validation HTML native ; le bouton reste désactivé tant qu'aucun fichier n'est sélectionné.

## 6. Validation des fichiers

Les règles existantes ont été conservées : PNG/JPEG, MIME explicite et 2 Mio maximum. Le validateur historique est toujours exécuté au moment de la soumission, en complément du refus ergonomique immédiat. Les contrôles backend, le stockage et les routes API n'ont pas été modifiés.

Un GIF ou tout autre type non autorisé est refusé avec un message de format. Une image PNG/JPEG dépassant 2 Mio est refusée avec un message de taille. Dans les deux cas, un éventuel fichier valide déjà sélectionné est conservé et aucune sauvegarde n'est déclenchée.

## 7. Prévisualisation et cachet existant

L'affichage protégé des cachets déjà enregistrés via `PrivateImage` est inchangé. Les actions existantes d'ajout de version, d'activation et de désactivation sont également inchangées. Ouvrir le formulaire ou sélectionner un nouveau fichier n'efface aucun cachet existant.

Le formulaire initial ne proposait pas de prévisualisation bitmap locale du nouveau fichier ; aucune fonctionnalité existante de ce type n'a donc été retirée.

## 8. Accessibilité

- Zone activable à la souris, au toucher, avec `Entrée` et avec `Espace`.
- Élément de dépôt doté d'un rôle bouton, d'un nom accessible et d'un `tabIndex`.
- Champ fichier doté du libellé accessible **Image du cachet**.
- Erreurs exposées avec `role="alert"`.
- Le glisser-déposer reste facultatif.

## 9. Responsive

La zone reprend les styles responsives GED. Le résumé utilise une largeur minimale nulle et tronque les noms longs. Les actions restent regroupées et accessibles. La grille générale du formulaire et la disposition globale des paramètres n'ont pas été modifiées.

## 10. Tests exécutés

### Tests ciblés et pertinents

Commande :

```text
npx tsx --test --test-concurrency=1 \
  test/stamp-file-drop-b3491.behavior.test.ts \
  test/stamp-file-drop-integration-b3491.test.ts \
  test/ged-ux-03.behavior.test.ts \
  test/settings-document-marks-separation-b349.test.ts \
  test/document-marks-lot13.behavior.test.ts
```

Résultat : **24 réussis, 0 échec, 0 ignoré**.

Les scénarios couvrent le clic, le clavier, une image valide, le dépôt, le nom affiché, le remplacement, le retrait, les formats interdits, la taille excessive, l'absence d'enregistrement automatique, la conservation de l'aperçu enregistré, les conventions responsives et la non-régression GED/cachets.

### Suite frontend complète

Commande : `npm test`

Résultat : **908 réussis, 0 échec, 0 ignoré**, durée Node rapportée : **92,429 s**.

### Contrôles statiques et compilation

- `npm run lint` : **PASS** (`tsc --noEmit`).
- `npm run build` : **PASS** (2 508 modules transformés).
- `git diff --check` : **PASS**, aucune erreur d'espace ou de patch.

### Test non exécuté

La recette navigateur réelle n'a pas été exécutée : aucun service ne répondait sur `127.0.0.1:3001` ni `127.0.0.1:4183`. Aucun serveur et aucun conteneur n'a été démarré, reconstruit ou redémarré afin de respecter le périmètre de la mission.

## 11. Non-régression

La suite complète et les tests GED, signatures/cachets et séparation des paramètres sont concluants. Aucun fichier backend, SQL, migration, RBAC, PDF, modèle documentaire ou workflow métier n'a été modifié. Les dimensions et le positionnement des signatures/cachets restent inchangés.

## 12. Fichiers modifiés

- `frontend/src/modules/documents/DocumentFileDropField.tsx`
- `frontend/src/modules/settings/DocumentMarksSettings.tsx`
- `frontend/test/stamp-file-drop-b3491.behavior.test.ts`
- `frontend/test/stamp-file-drop-integration-b3491.test.ts`
- `docs/RAPPORT-IMPORT-CACHET-B3491.md`

## 13. Réserve

Une recette visuelle et tactile dans un navigateur réel, sur ordinateur, tablette et téléphone, reste à réaliser dans un environnement applicatif autorisé. Les interactions correspondantes sont couvertes par les tests JSDOM et le build de production, mais cette couverture ne remplace pas une recette navigateur réelle.

## 14. Verdict final

**VALIDÉ AVEC RÉSERVES**

La zone d'import du cachet est harmonisée avec la GED, les règles de fichiers et le mécanisme de sauvegarde sont préservés, et toutes les validations automatisées passent. La réserve porte exclusivement sur l'absence de recette navigateur réelle.
