# LOT B.3.3 — Harmonisation du positionnement des signatures et cachets

## 1. Verdict

**VALIDÉ.** Les signatures et cachets sont désormais intégrés dans les zones de validation prévues par chaque modèle PDF, sans création d'une page générique supplémentaire. Les fichiers de signature et de cachet restent deux ressources PDF indépendantes. Le cachet est superposé à la signature en mode de fusion `Multiply`, avec un état graphique borné à la zone concernée.

La correction ne modifie ni les données métier, ni les migrations, ni les règles RBAC, ni la logique d'archivage historique. Aucun service préexistant, volume métier ou environnement de production n'a été touché.

## 2. Cause identifiée

La fonction historique `drawOfficialMarks` ajoutait systématiquement une nouvelle page intitulée « VALIDATION OFFICIELLE » dès qu'une signature ou un cachet était disponible. Ce comportement était indépendant de la structure du modèle alors que les documents commerciaux et les procès-verbaux de livraison possédaient déjà des zones de signature métier.

Conséquences :

- page artificielle ajoutée à la fin du document ;
- rupture entre le bloc de validation métier et les marques officielles ;
- présentation différente selon les documents ;
- identité du signataire affichée sans fonction fiable ;
- superposition non maîtrisée pour les images comportant un fond blanc.

## 3. Correction effectuée

### 3.1 Moteur de mise en page

`backend-node/src/modules/documents/document-layout.ts` expose désormais `drawOfficialMarksInZone`.

Cette fonction :

- reçoit une zone explicite du modèle courant ;
- ne crée jamais de page ;
- borne le dessin par découpage à la zone transmise ;
- dessine la signature en premier et le cachet en second ;
- conserve les proportions des images avec `fit` ;
- garde signature et cachet comme XObjects PDF distincts ;
- applique au cachet un `ExtGState` PDF `/BM /Multiply` ;
- isole cet état par `save`/`restore`, y compris en cas d'image illisible ;
- affiche l'identité et la fonction du signataire lorsqu'elles sont disponibles.

### 3.2 Résolution de la fonction du signataire

`backend-node/src/modules/document-marks/document-mark-policy.service.ts` récupère désormais une fonction fiable à partir de :

1. `users.job_title` lorsqu'il est renseigné ;
2. sinon `employee_profiles.position_title`.

Cette valeur est utilisée uniquement pour la présentation du PDF. Le schéma des snapshots, les règles de résolution, les autorisations et la sélection des versions de signature/cachet restent inchangés.

### 3.3 Positionnement par type de document

| Type de document | Zone retenue | Signature client | Signature/cachet entreprise |
| --- | --- | --- | --- |
| Devis | Bloc de signatures de la dernière page du document | Zone conservée libre | Zone « Pour l'entreprise » |
| Bon de commande | Bloc de signatures de la dernière page du document | Zone conservée libre | Zone « Pour l'entreprise » |
| Facture | Bloc de signatures de la dernière page du document | Zone conservée libre | Zone « Pour l'entreprise » |
| Reçu de paiement | Même page, bloc dédié sous les informations d'encaissement | Non attendue par le modèle actuel | Zone « Signature et cachet de l'entreprise » |
| Procès-verbal de livraison | Bloc « Remise du véhicule / Acceptation » de la page calculée | Image client uniquement dans « Le client » | Marques officielles uniquement dans « Pour la concession » |

Pour les devis, bons de commande et factures, le seuil de saut de page a été ajusté afin que le bloc récapitulatif et les deux zones de signature restent indivisibles. Pour les livraisons longues, le bloc d'acceptation demeure sur sa page métier réelle : aucun feuillet supplémentaire n'est ajouté.

## 4. Intégrité et historique

- Aucune migration n'a été créée ou modifiée.
- Aucune écriture n'a été effectuée dans la base métier.
- Les documents historiques archivés ne sont pas recalculés.
- Le mécanisme d'archive conserve son retour immédiat lorsqu'une archive existe déjà.
- Le stockage des snapshots de versions de signature/cachet reste inchangé.
- La signature client et les marques de l'entreprise restent des images indépendantes.
- Les empreintes et informations de traçabilité de livraison restent affichées.

## 5. Tests PDF ciblés

Commande finale :

```text
node --import tsx --test --test-concurrency=1 test/document-marks-b33-pdf.test.ts
```

Résultat : **9 tests PASS, 0 FAIL**. Les neuf tests matérialisent les dix scénarios B.3.3 suivants :

1. document de livraison sur une page, zones client et entreprise distinctes ;
2. livraison sur trois pages, validation sur la page 3 et absence de page 4 ;
3. modèle de quatre pages ciblant explicitement la zone de la page 3 ;
4. signature et cachet à fond blanc, deux ressources séparées et mode `Multiply` ;
5. images transparentes et proportions conservées ;
6. absence de signature : aucune signature fictive ;
7. absence de cachet : aucun cachet fictif ;
8. absence de signature client : zone client laissée libre ;
9. bloc proche d'un saut de page : bloc d'acceptation indivisible ;
10. livraison : trois images indépendantes et traçabilité conservée.

Campagne PDF élargie :

```text
node --import tsx --test --test-concurrency=1 \
  test/document-marks-b33-pdf.test.ts \
  test/document-marks-b32-pdf.test.ts \
  test/document-marks-lot2.test.ts \
  test/document-logo-delivery.test.ts
```

Résultat : **24 PASS, 0 FAIL**.

Contrôles structurels et visuels :

- `pdfinfo` confirme trois pages, et non quatre, pour le scénario de livraison longue ;
- `pdftotext` situe l'acceptation, l'identité et la fonction sur la page 3 ;
- `pdfimages -list` confirme deux objets image distincts pour une signature et un cachet à fond blanc ;
- inspection brute du PDF : présence de `/BM /Multiply` ;
- rendu Poppler inspecté pour les cas livraison une page, fonds blancs, transparence et document commercial ;
- identité et fonction lisibles sous les marques ;
- aucun titre « VALIDATION OFFICIELLE » dans le code de production.

## 6. Qualification MySQL 8.4 isolée

Une instance MySQL 8.4 temporaire, sans volume persistant et sur un réseau isolé propre au lot, a été utilisée. Elle a été initialisée par le mécanisme officiel jusqu'au niveau 092.

Résultats :

- bootstrap officiel : **PASS** ;
- `document-marks-lot13-mysql.integration.test.ts` : **11 PASS, 0 FAIL** ;
- `document-marks-b321-mysql.integration.test.ts` : **1 PASS, 0 FAIL**.

Cette campagne couvre notamment HTTP réel, GED temporaire, portée territoriale, RBAC, concurrence, historique immuable et rollback. Aucune base métier n'a été sollicitée.

## 7. Non-régression globale

| Domaine | Résultat |
| --- | --- |
| Backend — tests ordinaires complets | **1917 total : 1833 PASS, 84 SKIP opt-in, 0 FAIL** |
| Frontend — tests complets | **876 PASS, 0 FAIL** |
| Backend — lint | **PASS** |
| Backend — build | **PASS** |
| Frontend — lint | **PASS** |
| Frontend — build | **PASS** — 2505 modules |
| `git diff --check` | **PASS** |

Par rapport à la campagne B.3.2.1, les neuf nouveaux tests B.3.3 expliquent le passage de 1824 à 1833 tests backend ordinaires réussis.

## 8. Fichiers modifiés

- `backend-node/src/modules/documents/document-layout.ts`
- `backend-node/src/modules/documents/commercial-document.ts`
- `backend-node/src/modules/document-marks/document-mark-policy.service.ts`
- `backend-node/test/document-marks-lot2.test.ts`
- `backend-node/test/document-marks-b33-pdf.test.ts`
- `docs/RAPPORT-HARMONISATION-SIGNATURES-CACHETS-B33.md`

## 9. Réserves et risques résiduels

Aucune réserve bloquante n'est constatée dans le périmètre B.3.3.

Le rendu `Multiply` est une fonctionnalité standard PDF et a été validé structurellement ainsi que par rendu Poppler. Comme pour toute production PDF, un lecteur très ancien ou non conforme pourrait présenter une différence visuelle mineure de fusion, sans modifier les fichiers sources ni la traçabilité.

## 10. Opérations exclues

- aucun commit ni push ;
- aucun déploiement ni accès VPS ;
- aucune modification de production ou de base métier ;
- aucun arrêt de service préexistant ;
- aucune suppression de volume existant ;
- aucun changement de branche, reset, restore, stash ou clean.

