# Plan de corrections VIN et documentation

Ce plan ne constitue pas une autorisation de modification.

## 1. VIN

1. Reproduire la version déployée avec saisie, collage, suppression et réouverture ; vérifier qu'elle contient `af4414d` et exclure un cache frontend obsolète.
2. Appliquer le helper commun au champ Atelier, avec valeur contrôlée et payload tronqué.
3. Décider une seule politique pour espaces/tirets et l'appliquer aux deux backends sans affaiblir la validation.
4. Conserver regex backend et unicité ; évaluer un CHECK SQL additif après audit des VIN historiques.
5. Tests : 0/1/16/17/18/40 caractères, collage, suppression/ressaisie, minuscules, I/O/Q, espaces, doublon, VN/VO et modal rouvert.

## 2. Socle documentaire

1. Geler `document-layout.ts` comme couche visuelle unique.
2. Introduire des renderers par famille (transaction, état comptable, rapport, bon logistique), tous alimentés par `getBusinessIdentity()`.
3. Ne pas fusionner les contenus métier ; partager seulement identité, grille, typographie, pied, pagination, montants et marques.
4. Étendre l'archivage canonique aux nouveaux documents officiels avec clés de version et snapshots.

## 3. Pied légal

Ajouter dans le pied central, avant RCCM/NIU, `legalName` puis `legalForm`, en omettant proprement les champs absents. Valider “NU” contre “NIU”. Ajouter tests unitaires et rendus multi-pages avec valeurs longues.

## 4. Signatures et cachets

1. Définir une matrice document/type de marque/permission.
2. Réutiliser versions, hash, snapshots et zones existantes.
3. Supprimer l'obligation de capture client dans l'application après arbitrage de migration du workflow Livraison ; conserver emplacement manuscrit et GED externe.
4. Ne jamais imposer de marque aux exports statistiques.

## 5. Excel/CSV

Créer deux helpers centraux : CSV français sécurisé et classeur Excel LCA. Imposer dictionnaires exhaustifs, feuilles françaises, dates `JJ/MM/AAAA`, colonnes monétaires numériques avec devise, totaux, gel d'en-tête, largeur et neutralisation des formules. Conserver BOM et `;` pour CSV.

## 6. Comptabilité et trésorerie

Ordre recommandé : journal comptable PDF, grand livre, balance, pièce comptable, journal trésorerie, rapprochement. Ajouter identité, période, périmètre, totaux débit/crédit, reports, pagination et mentions légales. Supprimer la limite silencieuse de 200/1500 lignes ou l'annoncer explicitement.

## 7. SAV

Conserver l'OR/devis SAV central. Ajouter, selon validation métier, fiche diagnostic, contrôle qualité et bon de restitution comme vues officielles archivables. Lier facture/reçu SAV au même moteur sans dupliquer les documents financiers.

## 8. Magasin

Modéliser les documents à partir des événements existants : demande, commande, réception, sortie, retour, transfert, inventaire. Chaque document doit avoir numéro, agence, auteur, lignes, quantités, états, zones de validation et archive GED.

## 9. Avoirs et remboursements

Conserver l'avoir officiel existant. Ajouter justificatif de remboursement et annulation avec numéro, document d'origine, motif, montants, moyen/destination, auteur, date, empreinte et archive. Vérifier les variantes commerciale, SAV et retour véhicule.

## 10. Non-régression

- Tests contractuels de permissions et isolation multi-agences.
- Tests PDF texte + rendu PNG pour chaque famille, pages courtes/longues et données manquantes.
- Tests d'archives immuables et de fallback historique.
- Tests signatures/cachets sans capture client obligatoire.
- Tests Excel par réouverture ExcelJS et formules neutralisées.
- Tests CSV BOM, séparateur, accents, injection, valeurs nulles, XAF et dates.
- Recette UI preview/print/download sur Chrome/Edge.

## Dépendances et lots

1. Lot A : validation métier (NU/NIU, documents réellement officiels, signatures).
2. Lot B : VIN déployé + champ Atelier.
3. Lot C : pied légal et helpers documentaires.
4. Lot D : migration des PDF comptables/reporting.
5. Lot E : documents SAV/Magasin/financiers absents.
6. Lot F : harmonisation Excel/CSV et recette transversale.

Chaque lot doit rester additif, versionné et compatible avec les archives antérieures. Aucun PDF historique ne doit être régénéré silencieusement.
