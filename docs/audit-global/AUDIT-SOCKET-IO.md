# Annexe — Audit Socket.IO

## Architecture observée

- Namespace : `/realtime`, transport frontend forcé à WebSocket.
- Authentification : JWT HS256 et session de refresh active vérifiés à la connexion.
- Isolation : rooms `user:<id>`, `agency:<id>`, `global`, `treasury:global`, `treasury:agency:<id>`, `hr:global` et `hr:agency:<id>`.
- Les rooms financières et RH sont déterminées par les permissions et scopes effectifs.
- Le frontend invalide les caches TanStack Query et nettoie ses listeners au démontage.
- `rbac:updated` entraîne une resynchronisation des permissions et une déconnexion serveur de la socket concernée.

## Correspondance

Les événements principaux ventes, véhicules, showroom, atelier, pièces, livraisons, facturation, documents, utilisateurs, paramètres, trésorerie, RH, CRM, notifications et RBAC sont écoutés dans `AppBootstrap.tsx`. Les émissions utilisent les rooms, jamais un broadcast global non filtré dans les helpers examinés.

## Émissions backend sans listener frontend explicite

| ID | Événements | Producteur | Risque |
|---|---|---|---|
| AUD-RT-001 | `quotation:created`, `sales:updated` | quotations, sales | Devis/vente possiblement obsolètes jusqu'au refetch suivant |
| AUD-RT-002 | `delivery-services:catalog`, `delivery:checklist-config`, `delivery:financial-authorization` | deliveries | Paramètres et autorisations de livraison non rafraîchis immédiatement |
| AUD-RT-003 | `suppliers:changed`, `settings:workshop-labor-rates-updated` | parts, settings | Catalogues/paramètres possiblement obsolètes |
| AUD-RT-004 | `vehicle-return:created`, `vehicle-return:updated` | vehicle-returns | Retour véhicule non actualisé en direct |
| AUD-RT-005 | `workshop:appointment-created`, `workshop:appointment-status`, `workshop:session-paused`, `workshop:session-resumed` | workshop | Planning/session possiblement obsolète pour d'autres utilisateurs |

Ces événements sont bien émis dans le code backend mais absents des ensembles de listeners de `AppBootstrap.tsx`. Gravité P2 : une mutation locale invalide généralement son propre cache, mais les autres sessions peuvent afficher des données anciennes.

## Limites

La reconnexion et l'isolation des rooms ont été inspectées statiquement. Aucune connexion Socket.IO réelle multiutilisateur n'a été exécutée; la livraison réseau et l'absence de fuite interagence restent `NON VÉRIFIÉES` en conditions réelles.
