# Corrections frontend

- Ajout de `ServerPagination`, composant visuel sans API, RBAC ni logique métier.
- Adaptation de `ClientPagination` au même rendu et aux tailles 10/20/50/100.
- Valeur initiale 10 et retour page 1 lors du changement de taille.
- Navigation complète, intervalle, total, état de chargement et attributs ARIA.
- Raccordement des écrans Activité, CRM, facturation, ventes, livraisons, RH, pièces, proformas, SAV, véhicules, comptabilité, trésorerie et utilisateurs.
- Conservation des filtres, recherches, tris, onglets et gardes de permissions existants.
- Conservation du chargement progressif Kanban, mieux adapté à ses colonnes indépendantes.
