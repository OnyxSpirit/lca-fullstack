# Rapport E2E

| Scénario | Statut | Preuve/limite |
|---|---|---|
| A véhicule extérieur | BLOQUÉ | Aucun véhicule externe ; session 2FA requise |
| B véhicule connu | PARTIEL | 1 OR clôturé existant ; pas de parcours rejoué |
| C pièces disponibles | PARTIEL | tests intégration réussis |
| D pièces insuffisantes | PARTIEL | tests reliquat/réception réussis |
| E pièces non utilisées | PARTIEL | tests retour/réintégration réussis |
| F pièce défectueuse | PARTIEL | workflow de décision présent, pas E2E réel |
| G encaissement/transit | ÉCHOUÉ/BLOQUÉ | défaut SAV-001 et aucune facture atelier |
| H RBAC | PARTIEL | tests scopes réussis ; profils absents |
| I journal/reporting | ÉCHOUÉ | scope Super Admin rejeté |

Aucun scénario PARTIEL n'est présenté comme E2E réussi.

