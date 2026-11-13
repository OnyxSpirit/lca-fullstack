# Audit global du VIN et de la documentation LCA

## Synthèse

Audit statique exhaustif du code courant, de son historique Git et des tests, sans modification applicative ni donnée. Le modèle documentaire officiel existe et est techniquement solide pour les documents transactionnels : `commercial-document.ts`, `document-layout.ts`, `setting-resolver.ts`, archivage GED immuable et snapshots de marques. Il n'est toutefois pas utilisé par les PDF analytiques/comptables, ni par les exports tabulaires.

Le défaut VIN signalé a une cause historique confirmée et une correction déjà présente dans la branche auditée. Avant `af4414d`, `maxLength={17}` limitait l'affichage DOM, mais `onChange` stockait la valeur brute en majuscules ; l'état React et le payload pouvaient donc dépasser 17 caractères. Depuis ce commit, `normalizeVinInput()` applique `trim()`, majuscules et `slice(0,17)` avant `setForm`, et le payload utilise la même source de vérité. Un second champ VIN, dans la réception Atelier d'un véhicule extérieur, n'utilise pas cette normalisation : il reste un écart UX distinct.

## Périmètre et méthode

- Recherche de tous les champs VIN, endpoints véhicules, contraintes SQL et tests.
- Recherche de `PDFDocument`, PDFKit, ExcelJS, MIME PDF/XLSX/CSV, téléchargements, impressions et archivages GED.
- Relevé des routes, permissions, services, templates, identité, pied légal, marques officielles et sécurité CSV.
- Distinction entre document généré, export brut, pièce GED et fonctionnalité absente.

## VIN : architecture actuelle

### Formulaires réellement saisissables

1. Entrée en stock VN/VO : `frontend/src/modules/vehicles/NewVehicleModal.tsx`.
2. Réception Atelier d'un véhicule extérieur : `frontend/src/modules/service/NewRepairOrderModal.tsx`.

Le formulaire de modification affiche le VIN mais ne l'autorise pas à être changé. Les devis, pro-formas, ventes, livraisons, retours et recherches ne font que sélectionner ou afficher un VIN. Aucun import de véhicules avec VIN n'a été trouvé.

### Contrats de validation

- Frontend principal : `VIN_PATTERN=/^[A-HJ-NPR-Z0-9]{17}$/`, majuscules, troncature à 17.
- Backend stock : même alphabet et longueur exacte, normalisation `trim().toUpperCase()`, doublon relayé par la contrainte unique.
- Backend Atelier : suppression des espaces et tirets, majuscules, longueur exacte ; VIN facultatif mais valide s'il est fourni.
- MySQL : `vehicles.vin VARCHAR(50) NULL UNIQUE`. La base protège l'unicité, mais pas la longueur métier de 17 ; l'autorité finale est donc le backend.

### Matrice VIN

| Scénario | Stock courant | Atelier courant | Conclusion |
|---|---|---|---|
| Vide | invalide | accepté car facultatif | règles métier différentes |
| Incomplet | bloqué | bloqué s'il fourni | cohérent backend |
| 17 valides | accepté | accepté | conforme |
| 18/40 saisis ou collés | tronqué à 17 dans l'état | état trop long puis 400 backend | écart UX Atelier |
| Suppression et ressaisie | erreur effacée à `onChange` | pas d'erreur locale persistante | stock conforme |
| Modification VIN | non autorisée | non applicable | choix métier explicite |
| Espaces | bords supprimés ; espaces internes invalides | espaces internes supprimés | divergence de normalisation |
| I, O, Q ou symbole | refusé | refusé | conforme ISO attendu |
| Doublon | 409 + focus conservé | 409 + proposition de réutilisation | conforme |
| Minuscules | majuscules | backend majuscules, UI non normalisée | résultat valide mais UX divergente |
| VN/VO | même règle | non applicable | conforme |
| Réouverture | état initial rétabli après succès ; fermeture avant succès conserve l'état monté | état local du modal | à tester en interaction réelle |

## Architecture documentaire de référence

La référence LCA est constituée de :

- `getBusinessIdentity()` : raison sociale, forme juridique, RCCM, NIU, RIB, site, adresse, agence, logo, devise et fuseau.
- `document-layout.ts` : identité, en-tête, sections, pied paginé, signature/cachet et placement visuel.
- `commercial-document.ts` : devis, pro-forma, facture, bon de commande, OR/devis SAV, livraison, véhicule et planning.
- `business-document.service.ts` : génération officielle, archivage GED, clés immuables et snapshots.
- Tests visuels et fonctionnels : `document-visual-standard`, `document-logo-delivery`, `document-identity-footer`, `document-marks-*`, `warranty-document-context`.

## Pied légal

Les champs requis existent et sont récupérés dynamiquement. L'en-tête utilise déjà `legalName + legalForm`. Le pied `documentFooterLines()` commence cependant directement par RCCM, NIU, RIB et site : la nouvelle exigence « dénomination sociale + forme juridique en premier » n'est pas satisfaite. Les PDF analytiques/comptables indépendants n'appellent même pas ce pied central.

## Signatures, cachets et GED

Le mécanisme de marques officielles est robuste : versions de signatures/cachets, permissions `document.signature.apply`, `stamp.use`, compatibilité par type documentaire, hash, snapshot et rendu borné. Sa couverture effective est principalement la livraison ; les documents commerciaux prévoient une zone mais ne chargent pas systématiquement des marques. La livraison contient encore une capture client PNG obligatoire, en contradiction avec l'exigence de ne pas réintroduire cette obligation. Les OR enregistrent explicitement `signature=null` pour les restitutions.

## Exports

Les CSV partagés utilisent BOM UTF-8, point-virgule, guillemets et neutralisation des formules. Les intitulés principaux sont français. Risques : clés techniques non traduites dans le rapport financier dynamique, dates parfois ISO, feuilles Excel génériques, absence de styles monétaires XAF sur plusieurs classeurs et PDF analytiques construits indépendamment du modèle LCA.

## État par domaine

- Commercial/facturation/livraison : couverture PDF importante et centralisée, partiellement conforme à la nouvelle règle de pied.
- Comptabilité/trésorerie : bons exports CSV/XLSX ; grand livre et balance PDF rudimentaires, sans identité ni pied légal ; pas de PDF officiel du journal, des écritures ou du rapprochement.
- SAV : OR et devis SAV partagent le modèle central ; contrôle qualité, restitution et bons de travaux n'ont pas de documents autonomes.
- Magasin : aucune génération officielle de bons de demande, commande, réception, sortie, retour, transfert ou inventaire ; reporting CSV seulement.
- Avoirs/reçus : PDF officiels archivés ; aucun document autonome de remboursement ou d'annulation.
- Administration/CRM/Showroom/RH : fiche activité et fiche employé existent ; nombreux documents listés par le métier sont absents.

## Chiffres consolidés

- 2 formulaires saisissent réellement un VIN.
- 69 lignes inventoriées : 51 artefacts existants et 18 documents attendus mais absents.
- Existant : 22 PDF, 6 exports Excel, 21 exports CSV et 2 familles de pièces jointes originales.
- Conformité à la nouvelle cible : 0 totalement conforme, 19 partiellement conformes, 30 non conformes, 2 non applicables (pièces GED).
- Anomalies recensées, y compris le défaut VIN historique traçable : P0 0, P1 10, P2 11, P3 3.

## Verdict

**AUDIT COMPLET AVEC RÉSERVES**. La cartographie du code est exhaustive, mais aucun rendu live avec données réelles ni vérification visuelle de toutes les variantes archivées n'a été effectué, conformément à l'audit non destructif.
