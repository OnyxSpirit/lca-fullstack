# Registre des anomalies linguistiques

| ID | Module / document | Avant | Après | Correction / preuve | Verdict |
|---|---|---|---|---|---|
| LCA04-001 | Pro forma, fiche véhicule | `Brand`, `Model`, clés avec `_` | Marque, Modèle et référentiel français | dictionnaire `documentFieldLabel`; PDF extrait | Corrigé |
| LCA04-002 | Pro forma, champ technique rare | clé brute `unknown_factory_code` | Caractéristique non référencée | clé masquée, valeur officielle conservée | Corrigé |
| LCA04-003 | Documents officiels | `PENDING`, `APPROVED`, `CANCELLED` | En attente, Approuvé, Annulé | présentation commune des champs/tableaux | Corrigé |
| LCA04-004 | Documents officiels | `BANK_TRANSFER`, `CASH`, `CARD` | Virement bancaire, Espèces, Carte bancaire | présentation contextuelle | Corrigé |
| LCA04-005 | Documents de stock | `entry`, `sale`, `repair_order` | Entrée de stock, Vente, Consommation atelier | référentiel des mouvements | Corrigé |
| LCA04-006 | Documents commerciaux | `18.9 %` | `18,9 %` | format numérique `fr-FR` | Corrigé |
| LCA04-007 | Valeur inconnue | retour silencieux de la valeur technique | `Valeur non reconnue (…)` | anomalie visible sans substitution métier | Corrigé |

Les marques, modèles commerciaux, VIN, références, textes libres et acronymes NIU/RCCM/TVA/XAF restent inchangés.
