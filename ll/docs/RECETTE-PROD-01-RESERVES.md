# RECETTE-PROD-01 — Registre final des réserves

| ID | Réserve | Gravité | Condition de levée | Test / preuve attendue | Statut |
|---|---|---:|---|---|---|
| PROD-RES-01 | Concurrence paiements RH non rejouée sur 076 | P0 | Rejouer le workflow réel sur MySQL 8.4 niveau 076 | Un seul effet financier, reliquat et réservation exacts | LEVÉE |
| PROD-RES-02 | Concurrence paiements fournisseurs non rejouée sur 076 | P0 | Rejouer deux paiements simultanés | 201/409, un mouvement, dette exacte | LEVÉE |
| PROD-RES-03 | Sortie libre pouvant entamer les réserves | P0 | Scénario 5 M / 4 M / 3 M et course | Refus 409, réserve inchangée, un seul succès concurrent | LEVÉE |
| PROD-RES-04 | Recette API inter-périmètres partielle | P1 | Exécuter la matrice complète sur les douze familles avec quatre scopes | Réponses et données prouvant chaque isolement/autorisation | OUVERTE — BLOQUANTE |
| PROD-RES-05 | Recette navigateur et responsive absente | P1 | Navigateur réel aux largeurs 1440/1280/1024/768 | Captures, clavier, focus, erreurs, exports et débordements | OUVERTE — BLOQUANTE |
| PROD-RES-06 | Dialogues natifs sur actions financières sensibles | P1 | Remplacer par la modale partagée sans changer les règles métier | Tests focus/Escape/Tab, motif conservé, anti-double clic | OUVERTE |
| PROD-RES-07 | Suite globale backend non verte | P1 | Restaurer un harnais compatible et obtenir zéro échec non ignoré | `npm test` vert sur la version Node cible | OUVERTE — BLOQUANTE |
| PROD-RES-08 | Suite globale frontend non verte | P1 | Corriger/mettre à jour les tests historiques sans masquer les régressions | `npm test` vert sur la version cible | OUVERTE — BLOQUANTE |
| PROD-RES-09 | Reconstruction historique FIN-06 imparfaite pour certains états annulés après `asOf` | P1 | Acceptation métier formelle ou modèle d'événements adapté | Décision signée et limitation documentée | ACCEPTÉE TECHNIQUEMENT, ACCEPTATION MÉTIER REQUISE |
| PROD-RES-10 | Assertions de version figées dans FIN-04/05 | P2 | Rendre l'attente compatible avec le niveau courant sans affaiblir le bootstrap | Tests sources directement exécutables sur 076 | OUVERTE |
| PROD-RES-11 | Statuts techniques et remise à zéro de filtres inégale | P2 | Recette UX et harmonisation ciblée | Libellés français, reset vérifié | OUVERTE |

