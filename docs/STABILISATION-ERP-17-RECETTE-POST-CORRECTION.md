# ERP-17 — Recette post-correction

Date : 2026-10-11. Frontend `http://127.0.0.1:4176`, backend `http://127.0.0.1:3004/api`.

## Verdict navigateur

**PARTIEL.** Les corrections Nouvel OR, Garantie, Facturation et PDF ont été validées après déploiement. Les gardes Pièces sont validées par tests automatisés et leur état métier est visible, mais la preuve navigateur autorisé/refusé par profils distincts reste non exécutée faute de sessions secondaires accessibles.

## Nouvel OR — VALIDÉ

Depuis `Ouvrir un OR`, la sélection du client Garantie REC16 charge automatiquement le véhicule `Hyundai Tucson REC16` et affiche sans sauvegarder :

- constructeur `Constructeur REC16 Garantie` ;
- code `REC16-GAR` ;
- statut contractuel `ACTIVE` ;
- durée 36 mois ;
- activation/début 2026-10-11 ;
- échéance 2029-10-11 ;
- kilométrage de référence 45 km ;
- limite 100 000 km ;
- kilométrage de réception « À déterminer ».

Le formulaire a été fermé sans créer d'OR.

## Garantie — VALIDÉ

Le détail REC16-GAR-01 affiche contrat actif, constructeur, échéance, plafond 100 000 km, réception 50 km, code constructeur, autorisation, décision, couverture totale et répartition 41 615 FCFA constructeur / 0 client. Les données n'ont pas été modifiées.

## Facturation — VALIDÉ

- Agence principale : 0 facture.
- Agence Recette Nord : 12 factures, page 1/2.
- Filtre Atelier : 4 factures, CA 214 020 FCFA, encaissé 190 240 FCFA, reste 23 780 FCFA.
- Facture 9 : résumé HT 20 000, TVA 3 780, TTC 23 780.

## Pièces — PARTIEL

Le code déployé contient les gardes `parts.reservation.create` et `parts.reservation.consume`. Le test `PARTS-FE-09` est vert. Dans l'OR actif contrôlé, `Réserver` reste désactivé par l'état métier avant démarrage. La session Super Admin ne permet pas de démontrer visuellement la disparition/refus des actions pour un utilisateur sans ces permissions. Aucun droit ni compte n'a été modifié.

## RBAC — PARTIEL

Profil navigateur testé : Super Administrateur, session existante, menus et accès directs SAV/Facturation disponibles. Les profils métier secondaires sont **NON EXÉCUTÉS** : aucune session accessible n'était disponible et aucun secret, mot de passe, rôle, scope ou permission n'a été extrait ou modifié.

## PDF — VALIDÉ pour le renderer déployé

Trois rendus ont été inspectés :

1. Archive historique facture 9 : inchangée par conception et conserve l'ancienne ligne à 20 000 TTC. Elle confirme l'immuabilité GED et n'est pas une preuve du renderer corrigé.
2. Rendu en mémoire de la facture 9 par le backend déployé, sans archivage : une page A4 ; ligne 20 000 HT, TVA 3 780, total ligne et total général 23 780 TTC ; alignement et signatures lisibles, aucun chevauchement.
3. Rendus en mémoire Garantie/OR : deux pages A4 chacune, pagination correcte, sections lisibles, plafond `100 000 km` sans barre parasite, aucun chevauchement.

Les rendus en mémoire ont seulement lu MySQL et écrit dans `tmp/pdfs/erp17-post`; ils n'ont créé aucun document GED.

## GED — VALIDÉ isolément, PARTIEL end-to-end

Le nombre de documents reste 46 avant/après. Les archives historiques sont lisibles et inchangées. Le test isolé couvre échec de rendu, échec d'insertion avec nettoyage, reprise et rejeu sans doublon. La panne processus complète et la réconciliation automatique d'un fichier orphelin restent hors couverture.

## Non-régression

- backend ciblé : 71 tests, 69 réussis, 2 intégrations MySQL conditionnelles ignorées, 0 échec ;
- frontend ciblé : 62/62 réussis ;
- GED/PDF : inclus et réussis ;
- build backend TypeScript : réussi ;
- build frontend Vite : réussi ;
- API et Socket.IO : HTTP 200 ;
- aucune erreur critique observée dans le parcours navigateur.

## Verdicts

| Domaine | Verdict |
|---|---|
| Docker | VALIDÉ |
| Navigateur | PARTIEL |
| RBAC multi-profils | PARTIEL |
| PDF renderer déployé | VALIDÉ |
| GED | PARTIEL |
| Facturation | VALIDÉ |
| Garantie | VALIDÉ |
| Pièces | PARTIEL |
| Nouvel OR | VALIDÉ |

## Verdict consolidé ERP-17

**PARTIEL.** La mise à jour Docker et les corrections fonctionnelles principales sont validées après déploiement. Restent ouvertes uniquement la matrice navigateur RBAC multi-profils, la preuve navigateur Pièces avec profils opposés et les limites GED de panne processus complète.
