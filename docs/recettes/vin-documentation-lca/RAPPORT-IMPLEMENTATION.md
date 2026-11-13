# Rapport d’implémentation — VIN et documentation LCA

Date de recette : 13/11/2026. Périmètre réellement livré dans cette passe : VIN transversal, identité légale commune, remise client sans PNG obligatoire, grand livre/balance et exports comptables associés.

## Corrections réalisées

- Le helper unique `normalizeVinInput()` met en majuscules, retire espaces et tirets, puis tronque à 17 caractères avant toute écriture dans l’état React.
- Les formulaires Stock VN/VO et Atelier véhicule extérieur utilisent ce helper. Le payload Atelier provient donc d’un état déjà borné.
- Le backend Stock applique la même politique et conserve l’expression VIN stricte, l’unicité SQL et les erreurs métier. Le backend Atelier possédait déjà cette normalisation.
- Le pied commun commence désormais par `legalName`, puis `legalForm`, avant RCCM, NIU, RIB et site. Les coordonnées restent en seconde ligne.
- La finalisation Livraison n’exige plus de dessin PNG. Nom du signataire, consentement explicite, kilométrage, checklist, documents remis, garantie, contrôle financier, permissions, empreinte et archive restent obligatoires. Un PNG fourni reste validé et conservé.
- Grand livre et balance ont quitté le renderer PDFKit sommaire. Ils utilisent le socle LCA, l’identité de l’agence active, la pagination et les totaux.
- La coupe silencieuse à 1 500 lignes est supprimée. Le grand livre collecte les pages de 200 jusqu’au total annoncé et échoue si la collecte devient incomplète.
- Les noms de fichiers et feuilles de ces exports sont français ; les XLSX ont en-tête stylé, filtre et ligne figée. Les CSV conservent `financialCsv()` (BOM, `;`, guillemets et neutralisation des formules).

## Réserves assumées

Les 18 documents ABS ne sont pas implémentés dans cette passe. Les créer correctement implique, pour chaque objet, un endpoint avec le scope RBAC métier existant, une entrée UI, un renderer spécialisé, une règle d’archive et des tests d’intégration sur base isolée. Un routeur générique fondé uniquement sur un identifiant aurait affaibli l’isolation multi-agences et est donc volontairement exclu. Le reporting financier PDF local et les autres XLSX/CSV non comptables restent également à migrer.

Les archives historiques n’ont été ni régénérées ni modifiées. Aucune migration n’a été créée. Aucune base métier n’a été écrite.

## Verdict

**MISSION VALIDÉE AVEC RÉSERVES**
