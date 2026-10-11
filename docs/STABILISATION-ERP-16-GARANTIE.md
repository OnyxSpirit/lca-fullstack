# ERP-16 — REC16-GAR-01 Garantie constructeur

## Verdict

`REC16-GAR-01` est **VALIDÉ** sur un cycle métier neuf et persistant. Le parcours a été exécuté par les API officielles de `lca-recette`, puis contrôlé séparément par API, navigateur et MySQL. Aucune écriture SQL directe n'a été utilisée.

## Ressources créées et conservées

| Ressource | Identifiant / référence | État final |
|---|---|---|
| Client | `9` — `CLI-000009` — `rec16.gar.client@example.test` | persisté, agence 3 |
| Véhicule | `12` — VIN `REC16VN0000000001` | `delivered`, 55 km |
| Vente | `9` — `V-20261011-D1D3B0EB` | `delivered`, 29 725 000 XAF |
| Livraison | `5` — `LIV-20261011-795595` | `delivered`, 45 km |
| Fournisseur garantie | `2` — `REC16-GAR` | actif pour Hyundai |
| OR | `7` — `OR-1791745796584` | `delivered` |
| Garantie OR | `2` — autorisation `REC16-GAR-AUTORISATION` | `APPROVED`, `FULL`, `CONFIRMED` |
| Facture client Atelier | `16` — `FAC-REC01A3-2026-000004` | `issued`, total et solde 0 XAF |
| Créance constructeur | `2` — `GAR-REC01A3-2026-000002` | `paid`, solde 0 XAF |
| Restitution | `5` | 55 km |

## Contrat et parcours observés

- contrat véhicule : `ACTIVE`, durée 36 mois, limite 100 000 km ;
- éligibilité à 50 puis 55 km : `ELIGIBLE_CONTRACTUALLY` ;
- diagnostic : « Défaut de calibrage électronique couvert REC16 » ;
- intervention réelle : recalibrage électronique, 35 000 XAF HT, TVA 6 615 XAF ;
- allocation : 35 000 XAF HT au constructeur, 0 XAF au client ;
- prise en charge TTC constructeur : 41 615 XAF ;
- dette client : 0 XAF ;
- créance constructeur encaissée : 41 615 XAF, solde 0 XAF ;
- facture client obligatoire mais à total nul, sans paiement client artificiel ;
- restitution officielle après facturation et règlement constructeur.

## Preuves

- API : `/tmp/stabilisation-erp-16-warranty-evidence.json` ;
- PDF OR : `/tmp/stabilisation-erp-16-warranty-or-7.pdf`, `application/pdf`, signature `%PDF-`, 4 679 octets ;
- MySQL : comptes exacts `1` client, `1` véhicule, `1` vente et `1` OR pour les clés REC16 ;
- navigateur 4176 : liste SAV et détail `/service/repair-orders/7` contrôlés ; la page expose le diagnostic, la garantie active, la couverture totale, les montants, le solde, le statut livré et l'historique complet ;
- notifications API : 12 notifications corrélées aux références du cycle ;
- audit : transitions visibles de `planned` à `delivered`, activité globale persistée (350 entrées au moment du contrôle).

## Exécutables de recette

- `scripts/stabilisation-erp-16-warranty.mjs` : création/reprise du cycle ;
- `scripts/stabilisation-erp-16-warranty-evidence.mjs` : contrôles API/PDF strictement en lecture.

