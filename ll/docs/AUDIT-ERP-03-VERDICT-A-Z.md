# AUDIT-ERP-03 — Verdict A–Z

Verdict général : **VALIDÉ AVEC RÉSERVES**.

| Lettre | Domaine | Verdict synthétique |
|---|---|---|
| A | Authentification | Sessions requises et recette authentifiée validée. |
| B | Base de données | MySQL 8.4.11 jetable, migrations jusqu’à 079 après build. |
| C | Création | Validée; idempotence, agence, client et véhicule contrôlés. |
| D | Double vente | Corrigée; 201/409 sous concurrence réelle. |
| E | Écritures | Transactions et verrous pessimistes utilisés. |
| F | Facturation | Cohérente; facture après annulation refusée. |
| G | Garanties | Choix explicite et snapshot conservé. |
| H | Historique | Changements, auteur, motif et audit présents. |
| I | Idempotence | Clé vérifiée; répétition cohérente. |
| J | Journalisation | Audit métier présent sur mutations sensibles. |
| K | KPI/stock | Stock reflète réservation puis libération. |
| L | Livraison | Gardes financières et finalisation dans le module dédié. |
| M | Montants | HT/TTC, TVA, remise et total recalculés côté serveur. |
| N | Notifications | Événements de création/statut présents; dette globale hors périmètre. |
| O | Ownership | Portée OWN appliquée au commercial connecté. |
| P | Permissions | RBAC dynamique vérifié; pas de rôle nominal implicite. |
| Q | Qualité build | Lint et builds réussis. |
| R | Réservation | Créée atomiquement avec la vente. |
| S | Statuts | Machine réelle documentée; terminaux protégés. |
| T | Traçabilité | Références vente/client/véhicule/facture conservées. |
| U | UI | Parcours réel validé; réserve sur `window.prompt`. |
| V | VENTE-01 | Annulation terminale partout après correction. |
| W | VENTE-02 | Confirmation commerciale distincte de la garde financière. |
| X | VENTE-03 | Remise vide par défaut, zéro seulement au calcul/envoi. |
| Y | VENTE-04 | Véhicule libéré après annulation admissible, jamais après refus. |
| Z | VENTE-05 | Concurrence double vente validée sur MySQL 8.4. |

La réserve bloquant un verdict sans réserve est la suite globale rouge, complétée par les réserves d’accessibilité et de discipline de build détaillées dans `AUDIT-ERP-03-RESERVES.md`.
