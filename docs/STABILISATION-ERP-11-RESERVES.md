# ERP-11 — Réserves

- Test historique `super-admin-system.test.ts` à fermer explicitement côté test pour éviter l’échec du worker après 5 s.
- Couverture multi-concessions non complète : une seule concession possède le jeu REC11.
- Notifications dédiées aux mutations d’habilitation non testées.
- Responsive, lecteur d’écran et clavier exhaustif non testés.
- Sept refresh tokens REC11 non expirés subsistent pour les comptes de recette ; les jetons explicitement déconnectés ou désactivés sont bien révoqués.
