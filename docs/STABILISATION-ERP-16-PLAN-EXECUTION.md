# ERP-16 — Plan d'exécution préalable

## P0

| Scénario | Objectif | Préconditions | Acteurs / périmètre | Preuves attendues | Risque | Statut initial |
|---|---|---|---|---|---|---|
| ISO-01 | Prouver 4176→3004→33321 et préserver REC02–REC15 | volumes et base attendus | lecture seule | IDs conteneurs, ports, volumes, compteurs exacts | perte de données | VALIDÉ |
| GAR-01 | Garantie couverte neuve | isolation et historique intègres | Vente/SAV/Atelier A2/A3 | API/UI/MySQL/GED | écritures financières | NON EXÉCUTÉ |
| GED-01/02/03 | archive Atelier, échec, rejeu | backend corrigé et base sûre | SAV/Finance | document exploitable, reprise | facture orpheline | NON EXÉCUTÉ |
| UI-VENTE/UI-SAV | parcours navigateur réels | ressources REC16 sûres | profils métier | navigateur 4176 | mutations terminales | NON EXÉCUTÉ |
| SOCKET-01 | deux sessions et reconnexion | comptes isolés | destinataire/non-destinataire | événements et persistance | fuite | NON EXÉCUTÉ |

## P1/P2

Concurrence Vente/Paiement/Livraison/Pièces/OR, idempotence, RBAC UI, PDF, notifications, multi-agences, audits et performance seront exécutés uniquement après levée de `ISO-01`. Multi-concessions reste BLOQUÉ (une concession, aucun workflow officiel).

Règle : aucune commande Docker mutante sans ciblage explicite du projet `lca-recette`, du fichier vérifié, de `.env.recette` et du service concerné.
