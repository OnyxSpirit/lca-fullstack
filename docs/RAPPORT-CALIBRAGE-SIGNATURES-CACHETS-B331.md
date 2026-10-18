# LOT B.3.3.1 — Calibrage des dimensions des signatures et cachets

## 1. Résumé exécutif

**Verdict : VALIDÉ.**

Les marques officielles sont désormais dimensionnées à partir de mesures physiques centralisées, et non plus en pourcentage arbitraire des zones PDF. Le contenu visible d'une signature d'entreprise vise une largeur de **4 cm**. Le cachet utilise une zone de référence de **4 × 4 cm** et son empreinte visible est ajustée proportionnellement dans un carré de **3,8 × 3,8 cm** au maximum.

Les images originales ne sont ni modifiées, ni remplacées, ni fusionnées. Signature et cachet restent deux ressources PDF indépendantes ; le cachet conserve le mode de composition `Multiply`. Les archives historiques, la signature client, les règles RBAC et les données métier sont inchangées.

## 2. Diagnostic des dimensions initiales

Avant B.3.3.1, `drawOfficialMarksInZone` calculait les dimensions ainsi :

- signature : `min(zone.width × 0,67, 132 pt)` ;
- cachet : `min(zone.width × 0,48, 96 pt)` ;
- hauteur : espace restant dans la zone après une réserve textuelle variable.

Ces valeurs dépendaient donc du modèle et ne démontraient aucune dimension physique stable. Les zones existantes mesuraient :

| Modèle | Zone B.3.3 | Équivalent approximatif | Diagnostic |
| --- | ---: | ---: | --- |
| Devis / bon de commande / facture | 203 × 70 pt | 7,16 × 2,47 cm | hauteur insuffisante pour un cachet de 4 cm |
| Reçu de paiement | 220 × 115 pt | 7,76 × 4,06 cm | hauteur insuffisante pour cachet + identité |
| Livraison | 220 × 66 pt | 7,76 × 2,33 cm | hauteur insuffisante |

## 3. Valeurs physiques retenues

| Élément | Centimètres | Points PDF |
| --- | ---: | ---: |
| Signature entreprise — largeur cible | 4,0 cm | 113,3858 pt |
| Signature entreprise — largeur maximale | 4,5 cm | 127,5591 pt |
| Zone cachet de référence | 4,0 × 4,0 cm | 113,3858 × 113,3858 pt |
| Empreinte visible maximale du cachet | 3,8 × 3,8 cm | 107,7165 × 107,7165 pt |
| Chevauchement signature/cachet | 0,7 cm | 19,8425 pt |

La largeur par défaut de la signature reste strictement 4 cm. La limite de 4,5 cm est centralisée mais n'est pas utilisée pour agrandir systématiquement les signatures.

## 4. Conversion centimètres / points PDF

La fonction réutilisable `cmToPdfPoints` applique :

```text
points = centimètres × 72 / 2,54
```

Toutes les valeurs physiques sont regroupées dans `officialMarkDimensions` au sein de `document-layout.ts`. Aucun générateur documentaire ne porte sa propre conversion.

## 5. Gestion des proportions

Le moteur calcule un facteur d'échelle unique à partir des limites visibles de l'image. La largeur et la hauteur du fichier complet utilisent le même facteur :

- aucune déformation de la signature ;
- aucun étirement du cachet ;
- les cachets rectangulaires restent rectangulaires ;
- un cachet rond occupe environ 3,8 cm de diamètre ;
- une image exceptionnellement haute est réduite proportionnellement pour ne pas déborder.

## 6. Gestion des marges

Une mesure virtuelle des PNG est effectuée au rendu avec `pngjs` 5.0.0, désormais déclaré comme dépendance directe.

La détection :

- ignore les pixels périphériques transparents presque totalement invisibles ;
- pour une image opaque, ignore les marges périphériques presque blanches ;
- ne supprime aucun pixel du fichier original ;
- ne reconstruit aucune image ;
- conserve les zones blanches internes, puisque seule la boîte englobante du contenu est utilisée ;
- utilise des seuils prudents afin de préserver les traits fins et l'anticrénelage.

Le recadrage est virtuel : l'image source complète reste l'XObject PDF. Son placement est décalé et mis à l'échelle de façon que sa boîte visible atteigne la dimension cible, puis le dessin est borné par la zone métier. Pour les JPEG, dont le décodage de pixels n'est pas ajouté au périmètre, les dimensions natives sont lues et le fichier complet est traité comme visible ; aucune suppression hasardeuse de fond blanc n'est effectuée.

## 7. Superposition des calques

- calque 1 : signature entreprise ;
- calque 2 : cachet entreprise ;
- chevauchement nominal : 0,7 cm ;
- composition du cachet : `/BM /Multiply` ;
- états graphiques isolés par `save` / `restore` ;
- deux XObjects distincts confirmés par `pdfimages -list`.

Le nom et la fonction sont placés sous la zone physique des marques. Le cachet ne recouvre ni l'identité, ni la zone client.

## 8. Adaptation des zones documentaires

| Modèle | Zone finale | Adaptation |
| --- | ---: | --- |
| Devis / commande / facture | 203 × 140 pt | bloc de signature allongé ; seuil de saut ajusté pour garder le bloc indivisible |
| Reçu de paiement | 220 × 145 pt | zone entreprise prolongée avant le pied de page |
| Livraison | 220 × 138 pt | bloc d'acceptation agrandi ; cartes supérieures et lignes vides compactées sans retirer de donnée |

La zone commerciale de 203 pt accepte les deux marques grâce au chevauchement centralisé de 19,84 pt. La zone client reste strictement séparée.

## 9. Documents multipages

Les marques sont toujours dessinées dans la zone transmise par le modèle courant. Aucun appel ne sélectionne automatiquement la dernière page et aucune page « VALIDATION OFFICIELLE » n'est créée.

Les essais couvrent :

- livraison courte conservée sur une page ;
- livraison longue dont le bloc d'acceptation et les marques restent sur la page 3 ;
- modèle explicite de quatre pages dont les marques restent sur la page 3.

## 10. Tests PDF ciblés

Le fichier `document-marks-b331-pdf.test.ts` ajoute **12 tests, tous réussis** :

1. largeur physique de signature à 4 cm ;
2. signature très large sans déformation ;
3. signature avec marges transparentes ;
4. cachet rond, zone 4 cm et empreinte 3,8 cm ;
5. cachet rectangulaire proportionnel ;
6. cachet avec grandes marges blanches ;
7. cachet transparent centré ;
8. superposition, XObjects séparés et `Multiply` ;
9. identité et fonction sous les marques ;
10. livraison multipage ;
11. zone client d'un document commercial préservée ;
12. absence d'une marque sans ressource fictive.

La mesure exacte repose sur les placements calculés en points PDF, avec une tolérance de 0,02 pt. Les vrais PDF sont ensuite inspectés avec `pdfinfo`, `pdftotext`, `pdfimages` et Poppler.

## 11. Contrôles visuels

Des PNG à 120 DPI ont été produits depuis les PDF réels et inspectés pour :

- facture avec signature, cachet rond, identité et fonction ;
- livraison courte avec signature client distincte ;
- superposition des deux marques ;
- cas avec marges transparentes et fonds blancs.

Résultat : proportions cohérentes, identité lisible, absence de débordement, zone client intacte et pied de page dégagé. Une première version de la livraison courte réduisait excessivement l'espace avant le pied de page ; la densité des cartes d'en-tête et des lignes vides a été ajustée, puis le rendu et les tests ont été rejoués avec succès.

## 12. Contrôles structurels

- campagne PDF B.3.3.1 + B.3.3 + élargie : **36 PASS, 0 FAIL** ;
- campagne finale livraison + calibrage : **28 PASS, 0 FAIL** ;
- XObjects signature/cachet séparés : confirmé ;
- `/BM /Multiply` : confirmé ;
- proportions : confirmées par calcul des boîtes visibles ;
- page artificielle : absente ;
- `git diff --check` : PASS.

## 13. Tests MySQL 8.4

Une instance MySQL **8.4.11** temporaire a été créée sans volume persistant, sur un réseau dédié. Le gestionnaire officiel l'a initialisée jusqu'à la migration 092.

Résultat final : **12 PASS, 0 FAIL** :

- `document-marks-lot13-mysql.integration.test.ts` : 11 PASS ;
- `document-marks-b321-mysql.integration.test.ts` : 1 PASS.

Une première tentative a utilisé par erreur `DOCUMENT_STORAGE_ROOT` au lieu de `GED_STORAGE_DIR`. Dix scénarios avaient réussi, puis le test de compensation GED a refusé le chemin attendu. La base temporaire a été supprimée/recréée logiquement dans le même conteneur, le bootstrap officiel a été rejoué, puis les 12 scénarios ont réussi avec la variable correcte. Ce premier échec ne provenait ni du code B.3.3.1 ni de MySQL.

## 14. Non-régression globale

| Campagne | Résultat |
| --- | --- |
| Backend complet | **1929 total : 1845 PASS, 84 SKIP opt-in, 0 FAIL** |
| Frontend complet | **876 PASS, 0 FAIL** |
| Backend lint | PASS |
| Backend build | PASS |
| Frontend lint | PASS |
| Frontend build | PASS — 2505 modules |
| `git diff --check` | PASS |

L'écart avec B.3.3 est exact : **+12 tests backend réussis**, correspondant aux 12 nouveaux scénarios B.3.3.1. Le frontend et le nombre de tests opt-in ignorés sont inchangés.

## 15. Exceptions et risques résiduels

- Aucun agrandissement à 4,5 cm n'est actuellement nécessaire.
- Les JPEG conservent leur cadre complet : le moteur ne tente pas d'identifier leurs marges blanches sans décodeur raster dédié. Ce choix conservateur évite de supprimer des éléments blancs utiles. Les PNG, format courant des signatures et cachets avec transparence, bénéficient de la mesure de contenu visible.
- Une image sans aucun pixel détectable revient à son cadre complet plutôt que de provoquer une division par zéro ou une marque fictive.

Aucune réserve bloquante n'est constatée.

## 16. Fichiers modifiés

- `backend-node/src/modules/documents/document-layout.ts`
- `backend-node/src/modules/documents/commercial-document.ts`
- `backend-node/test/document-marks-b331-pdf.test.ts`
- `backend-node/package.json`
- `backend-node/package-lock.json`
- `docs/RAPPORT-CALIBRAGE-SIGNATURES-CACHETS-B331.md`

Les modifications B.3.3 antérieures restent présentes et n'ont pas été écrasées.

## 17. Contraintes respectées

- aucun commit, push ou déploiement ;
- aucun accès VPS ;
- aucune modification de production ou de base métier ;
- aucune migration SQL ;
- aucun changement de branche, reset, restore, stash ou clean ;
- aucun fichier original de signature/cachet modifié ;
- aucune archive historique recalculée ;
- aucun service ou volume préexistant touché.

