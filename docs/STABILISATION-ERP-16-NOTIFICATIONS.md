# ERP-16 — Notifications persistantes et Pièces

- Deux sessions Socket.IO distinctes ont été ouvertes.
- Un prospect temps réel a créé la notification 105 : persistence API, événement `notifications:created`, compteur non lu `103 → 104`, aucune fuite vers l'utilisateur tiers.
- Après déconnexion, la notification 106 a été créée ; la reconnexion l'a récupérée via l'API.
- Deux marquages successifs de la notification 105 comme lue sont idempotents.
- L'ajustement de la pièce 8 a émis `parts:stock-changed` pour l'agence 2, sans fuite vers le commercial d'une autre agence.
- Le contrat Pièces est temps réel uniquement : aucune notification persistante de type `part` n'est créée.

Statut : **VALIDÉ**.

