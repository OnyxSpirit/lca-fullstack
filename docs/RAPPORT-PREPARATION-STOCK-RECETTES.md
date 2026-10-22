# Rapport de préparation du stock de recettes

## Synthèse

Date : 21 octobre 2026  
Environnement : Docker local `lca`, base MySQL `concession_erp`  
Verdict : **VALIDÉ**

Les 20 véhicules fictifs demandés ont été créés avec le formulaire officiel « Entrée en Stock ». Ils sont tous de type VN, millésime 2025, rattachés à l'Agence Brazzaville, placés au Parc Brazzaville et disponibles à la vente.

Le formulaire imposant une photo, l'utilisateur a explicitement autorisé la création d'au moins une image puis demandé d'utiliser la même photo pour tous les véhicules. Une image générique, sans marque, logo, immatriculation, personne ni texte, a donc été générée et associée une fois à chacun des 20 véhicules. Elle est conservée dans `docs/assets/MET-STOCK-2026-vehicle-generic.png` (SHA-256 `8e13603b8ee448fddba4cd306949000b0775a050c9fe59ec243a4887859d99da`).

## Véhicules créés

| ID | Marque | Modèle | Année | VIN | Prix XAF | Agence | Statut | Disponible | Images | Résultat |
|---:|---|---|---:|---|---:|---|---|---|---:|---|
| 6 | Toyota | Corolla | 2025 | LCA2025STK0000001 | 18 500 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 7 | Toyota | RAV4 | 2025 | LCA2025STK0000002 | 29 500 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 8 | Toyota | Hilux | 2025 | LCA2025STK0000003 | 35 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 9 | Toyota | Land Cruiser Prado | 2025 | LCA2025STK0000004 | 52 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 10 | Hyundai | Tucson | 2025 | LCA2025STK0000005 | 26 500 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 11 | Hyundai | Santa Fe | 2025 | LCA2025STK0000006 | 34 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 12 | Hyundai | i10 | 2025 | LCA2025STK0000007 | 11 500 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 13 | Kia | Sportage | 2025 | LCA2025STK0000008 | 27 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 14 | Kia | Sorento | 2025 | LCA2025STK0000009 | 36 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 15 | Kia | Picanto | 2025 | LCA2025STK0000010 | 12 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 16 | Mercedes-Benz | C200 | 2025 | LCA2025STK0000011 | 42 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 17 | Mercedes-Benz | GLC 300 | 2025 | LCA2025STK0000012 | 65 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 18 | Mercedes-Benz | GLE 450 | 2025 | LCA2025STK0000013 | 89 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 19 | BMW | Série 3 | 2025 | LCA2025STK0000014 | 44 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 20 | BMW | X5 | 2025 | LCA2025STK0000015 | 78 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 21 | Nissan | X-Trail | 2025 | LCA2025STK0000016 | 28 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 22 | Nissan | Navara | 2025 | LCA2025STK0000017 | 32 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 23 | Ford | Ranger | 2025 | LCA2025STK0000018 | 38 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 24 | Mitsubishi | L200 | 2025 | LCA2025STK0000019 | 33 500 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |
| 25 | Suzuki | Swift | 2025 | LCA2025STK0000020 | 14 000 000 | Agence Brazzaville | Disponible | Oui | 1 | PASS |

## Contrôles MySQL en lecture seule

- Enregistrements portant la référence `MET-STOCK-2026` : **20**.
- VIN distincts parmi ces enregistrements : **20**.
- Type `new` / VN : **20/20**.
- Année 2025 : **20/20**.
- Statut `available` : **20/20**.
- Agence Brazzaville : **20/20**.
- Véhicules avec une image : **20/20**.
- Images associées : **20**, soit exactement une par véhicule.
- Prix de vente : conformes aux 20 montants demandés.
- Références de stock générées : `STK-000006` à `STK-000025`.

## Absence d'effets de bord

| Domaine | Avant | Après | Écart |
|---|---:|---:|---:|
| Ventes | 5 | 5 | 0 |
| Factures | 4 | 4 | 0 |
| Livraisons | 1 | 1 | 0 |

Aucune réservation, commande, vente, facture, livraison ou écriture financière n'a été créée. Aucun véhicule existant n'a été modifié ou supprimé. Aucune écriture SQL directe, migration, modification de schéma, opération sur les volumes ou intervention distante n'a été effectuée.

## Résultats chiffrés

- Véhicules demandés : **20**.
- Véhicules créés : **20**.
- Véhicules disponibles : **20**.
- Échecs : **0**.
- Blocages restants : **aucun**.

## Conclusion

Le stock de recette `MET-STOCK-2026` est prêt pour les futures campagnes commerciales. La mission s'arrête ici : MET-01.2, MET-02 et les campagnes de vente n'ont pas été lancés.
