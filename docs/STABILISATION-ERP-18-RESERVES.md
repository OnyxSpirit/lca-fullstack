# ERP-18 — Réserves et décisions nécessaires

| ID | Réserve | Niveau | Condition de levée |
|---|---|---|---|
| R1 | aucun profil métier standard ne cumule `service.order.update` et réservation/consommation Pièces | P1 bloquant | décision du propriétaire métier sur l'opérateur, le scope et la séparation des tâches ; modification RBAC contrôlée puis recette |
| R2 | matrice navigateur multi-profils non exécutée | P1 | ouvrir des sessions officielles distinctes, idéalement profils Magasinier, Responsable pièces, Technicien, Chef atelier et SAV, sans injection de jeton |
| R3 | suite GED historique : 10 assertions désynchronisées | P2 | revue sécurité puis adaptation justifiée des tests aux prédicats actuels, sans affaiblir les contrôles |
| R4 | crash processus GED et réconciliation d'orphelin non testés | P2 | environnement jetable, crash contrôlé et procédure de réconciliation |
| R5 | une seule concession | P2 | seconde concession créée par workflow officiel, comptes et données dédiés, test négatif/positif inter-concessions |
| R6 | conversion Prospect → Client sans workflow officiel | Produit | décision métier sur données copiées, doublons, audit et droits |
| R7 | annulation Vente via `window.prompt` | P2 UX | formulaire accessible, motif obligatoire et test navigateur |
| R8 | MySQL recette conserve une provenance Compose fusionnée | Infrastructure | normalisation Compose lors d'une fenêtre dédiée avec sauvegarde et plan de retour arrière |

## Procédure sûre d'accès navigateur

Le responsable de recette ouvre chaque session via `/login` avec le compte métier existant et le secret de recette fourni hors rapport. Un profil par contexte de navigateur isolé ; aucune sauvegarde de mot de passe ; aucune modification de rôle. Capturer menus, accès direct et action refusée/autorisée, puis se déconnecter officiellement.
