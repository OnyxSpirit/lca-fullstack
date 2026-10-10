# RECETTE-PROD-01 — Matrice PROD01-01 à PROD01-50

Légende : RÉUSSI = preuve exécutée; PARTIEL = preuve réelle mais incomplète; NON EXÉCUTÉ = aucune preuve dynamique suffisante; ÉCHEC = attendu non atteint.

| ID | Scénario | Preuve / résultat | Statut |
|---|---|---|---|
| PROD01-01 | État Git initial | `main`, `8bcbadb`, propre | RÉUSSI |
| PROD01-02 | Dernière migration | 076 confirmée | RÉUSSI |
| PROD01-03 | Bootstrap MySQL vierge | baseline 071 + 072–076 | RÉUSSI |
| PROD01-04 | Seed permissions dynamiques | Super Admin provisionné en base jetable | RÉUSSI |
| PROD01-05 | Aucun bypass par nom de rôle | Contrats et tests existants | RÉUSSI |
| PROD01-06 | Lecture Treasury AGENCY | API/service authentifié | RÉUSSI |
| PROD01-07 | Treasury inter-agence | Tests de scopes ciblés, pas toute la matrice HTTP | PARTIEL |
| PROD01-08 | Treasury inter-concession | Prédicats contrôlés, scénario exhaustif absent | PARTIEL |
| PROD01-09 | Treasury sans permission | Double permission et refus 403 ciblés | RÉUSSI |
| PROD01-10 | Treasury sans JWT | Suite applicative | RÉUSSI |
| PROD01-11 | Réservations lecture/mutation | Création, lecture, libération, concurrence | RÉUSSI |
| PROD01-12 | Réservations hors scope | Contrats présents, matrice HTTP incomplète | PARTIEL |
| PROD01-13 | Budgets et dépenses | Workflow réel et contrôles de scope ciblés | RÉUSSI |
| PROD01-14 | Budget inter-agence | Refus compte/agence ciblé | RÉUSSI |
| PROD01-15 | Budget inter-concession | Refus ciblé existant, non exhaustif | PARTIEL |
| PROD01-16 | Facture fournisseur lecture | Workflow authentifié réel | RÉUSSI |
| PROD01-17 | Facture fournisseur mutation | Création/validation/avoir réels | RÉUSSI |
| PROD01-18 | Fournisseur hors périmètre | Prédicats serveur, appels exhaustifs absents | PARTIEL |
| PROD01-19 | Paiement fournisseur concurrent | 201/409, un mouvement | RÉUSSI |
| PROD01-20 | Rémunération lecture/préparation | Snapshot réel sur 076 | RÉUSSI |
| PROD01-21 | Validation RH séparée | Auto-validation refusée 403 | RÉUSSI |
| PROD01-22 | Paiement RH partiel | 200 k payés, 250 k restants | RÉUSSI |
| PROD01-23 | Concurrence préparation RH | Une seule rémunération | RÉUSSI |
| PROD01-24 | Primes | Prime approuvée incluse une fois | RÉUSSI |
| PROD01-25 | RH hors périmètre | Suites de scope disponibles, matrice financière incomplète | PARTIEL |
| PROD01-26 | Rapports six sections | API authentifiée | RÉUSSI |
| PROD01-27 | Rapports multi-devises | Agrégats séparés | RÉUSSI |
| PROD01-28 | Export autorisé | CSV avec BOM et filtres | RÉUSSI |
| PROD01-29 | Export sans permission | Contrats statiques, appel complet non rejoué | PARTIEL |
| PROD01-30 | Relevé bancaire import | Aperçu puis validation | RÉUSSI |
| PROD01-31 | Rapprochement exact | Mouvement choisi explicitement | RÉUSSI |
| PROD01-32 | Rapprochement concurrent | Un seul gagnant | RÉUSSI |
| PROD01-33 | Annulation rapprochée motivée | Historique et état cohérents | RÉUSSI |
| PROD01-34 | Immutabilité Treasury banque | Aucun mouvement modifié/créé implicitement | RÉUSSI |
| PROD01-35 | Compte 5 M / réserve 4 M | Solde inchangé à la réservation | RÉUSSI |
| PROD01-36 | Sortie libre 3 M | Refus 409 | RÉUSSI |
| PROD01-37 | Sorties concurrentes 800 k | Un succès, un 409 | RÉUSSI |
| PROD01-38 | Réservation intacte après refus | 4 M protégés | RÉUSSI |
| PROD01-39 | Consommation liée | Réservation diminuée avec décaissement | RÉUSSI |
| PROD01-40 | Idempotence financière | Clés et doublons vérifiés dans les suites | RÉUSSI |
| PROD01-41 | Audit financier | Auteur/action présents dans workflows ciblés | RÉUSSI |
| PROD01-42 | Typage backend | `tsc --noEmit` | RÉUSSI |
| PROD01-43 | Build backend | `tsc -p tsconfig.json` | RÉUSSI |
| PROD01-44 | Typage frontend | `tsc --noEmit` | RÉUSSI |
| PROD01-45 | Build frontend | Vite, 2487 modules | RÉUSSI |
| PROD01-46 | Suite globale backend | Échecs historiques et `mock.module` indisponible | ÉCHEC |
| PROD01-47 | Suite globale frontend | Plusieurs tests historiques rouges | ÉCHEC |
| PROD01-48 | Recette navigateur | Navigateur indisponible | NON EXÉCUTÉ |
| PROD01-49 | Responsive 1440/1280/1024/768 | Matrice préparée, pas de rendu réel | NON EXÉCUTÉ |
| PROD01-50 | Nettoyage et état Git | Ressources jetables supprimées; état consigné à la clôture | RÉUSSI |

