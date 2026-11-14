# Rapport de tests E2E

## Réalisé sur `lca_recette`

- Construction et démarrage sain du couple frontend/backend sur `http://127.0.0.1:4176`.
- Connexion avec un utilisateur métier temporaire non privilégié, permissions d’agence explicites et deux agences temporaires ; aucun contournement 2FA et aucun rôle SUPER_ADMIN.
- Stock : véhicule visible, prix minimum à 13 000 000 donnant zéro résultat puis 12 000 000 donnant un résultat, tri « Prix décroissant » sélectionné.
- Transfert : parcours distinct de l’emplacement local, initiation A vers B, expédition, état `IN_TRANSIT` sans emplacement, bascule sur B, choix du parc destination et réception `RECEIVED`.
- Client 360° : édition client, création du contact, désactivation/réactivation confirmées et historique complet.
- CRM : archivage motivé, filtre des archives, verrouillage de la fiche archivée, activité visible et réactivation.

## Nettoyage

La fixture suffixée `4acb1429`, toutes ses dépendances et les deux PDF GED générés ont été supprimés. Contrôle avant/après : 7→6 clients, 2→1 prospect, 3→2 véhicules, soit retour exact aux volumes préexistants.
