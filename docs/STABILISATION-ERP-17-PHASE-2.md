# ERP-17 — Phase 2 — Recette navigateur et validation finale

Date : 2026-10-11. Environnement exclusivement observé : projet Docker `lca-recette`, frontend `127.0.0.1:4176`, backend `127.0.0.1:3004/api`, MySQL `127.0.0.1:33321`.

## Verdict

**PARTIEL.** Le navigateur Codex est de nouveau disponible. La Facturation multi-agences et le contexte Garantie ont été validés visuellement sur l'instance de recette active. Les tests ciblés et les deux builds sont verts. La validation navigateur des corrections Pièces, Garantie dans le formulaire Nouvel OR et PDF corrigé reste **NON EXÉCUTÉE après correction**, car la mission interdit tout déploiement et les conteneurs actifs ne montent pas les sources locales : l'image frontend a été créée à 10:24, alors que les corrections locales datent de 20:55–20:58.

## Navigateur et profils RBAC

- Navigateur Codex : **DISPONIBLE**.
- Connexion observée : session existante `Super Administrateur`, agence principale, portée globale issue du catalogue persistant.
- Menus visibles pour ce profil : tous les modules métier et système attendus.
- Accès directs contrôlés : `/billing`, `/parts`, `/service`, `/service/repair-orders/2`, `/service/repair-orders/3`, `/service/repair-orders/7`, `/billing/9`.
- Profils métier secondaires : **NON EXÉCUTÉ**. Aucun identifiant secondaire n'était disponible dans la session et aucun mot de passe n'a été extrait, modifié ou réinitialisé. Aucun rôle, scope ou droit n'a été modifié et `GLOBAL` n'a été attribué à personne.

## Résultats navigateur

### Facturation — VALIDÉ

- Agence principale : 0 facture, totaux à 0, message « Aucune facture » cohérent.
- Agence Recette Nord : 12 factures, pagination 1/2, CA facturé 111 813 560 FCFA.
- Filtre type `Atelier` : 4 factures, total 214 020 FCFA, encaissé 190 240 FCFA, reste 23 780 FCFA.
- Facture atelier `FAC-REC01A2-2026-000009` : résumé HT 20 000, taxe 3 780, TTC 23 780.

### Garantie — VALIDÉ sur le détail existant, PARTIEL sur la correction

Le détail OR 7 affiche : constructeur `Constructeur REC16 Garantie`, code `REC16-GAR`, début 11/10/2026, échéance 11/10/2029, limite 100 000 km, kilométrage de réception 50 km, autorisation et répartition financière. Le formulaire `Nouvel OR` corrigé n'a pas pu être validé sur l'image active non redéployée.

### Pièces — PARTIEL

Le catalogue Pièces et l'OR actif 2 sont accessibles. Sur l'OR 2, `Réserver` est désactivé par l'état métier avant démarrage des travaux. La session Super Admin ne permet pas de prouver l'absence des boutons pour un profil dépourvu de `parts.reservation.create` ou `parts.reservation.consume`. Les gardes locales sont couvertes par `PARTS-FE-09`, mais leur rendu navigateur après correction est **NON EXÉCUTÉ**.

### PDF — PARTIEL

La facture active 9 confirme le défaut de l'image déployée : le résumé est TTC 23 780 FCFA, mais la ligne affiche encore 20 000 FCFA dans la colonne Total. Le bouton PDF répond, sans preuve visuelle exploitable du document corrigé. La correction locale est donc confirmée nécessaire, mais non validée dans le navigateur après déploiement. Les PDF simulés isolés restent validés par test et inspection de phase 1 : TTC 23 780 + 41 615 = 65 395, plafond `100 000 km`, trois pages A4 sans chevauchement observé.

## GED Atelier — VALIDÉ en injection isolée, PARTIEL de bout en bout

Le test couvre : échec de rendu sans fichier, échec d'insertion avec nettoyage, reprise, puis rejeu sans doublon. Aucun volume Docker ni document historique n'a été modifié. La panne route complète/processus et la réconciliation d'un orphelin après crash restent hors couverture.

## Non-régression

- Backend ciblé : 71 tests, 69 réussis, 2 ignorés (intégrations MySQL conditionnelles), 0 échec.
- Frontend ciblé : 62/62 réussis.
- GED/PDF : inclus dans les 71 tests backend, 2/2 réussis.
- Build backend TypeScript : réussi.
- Build frontend Vite : réussi.
- `git diff --check` : réussi.

## Anomalies, corrections et réserves

- Aucun nouveau défaut produit local découvert.
- L'image de recette active est antérieure aux corrections : aucun déploiement effectué conformément à la mission.
- L'incohérence de ligne TTC est encore visible sur l'image active et est corrigée uniquement dans le code local.
- La matrice navigateur RBAC complète reste non exécutée faute de sessions métier secondaires disponibles sans manipuler des secrets ou des comptes.
- Les tests MySQL conditionnels sont ignorés dans cette campagne ciblée ; les données REC15/REC16 n'ont pas été rejouées ni modifiées.

## État final

- Git : modifications locales non commitées conservées pour revue ; aucun commit, push, reset, restore, stash ou clean.
- Docker : les six conteneurs constatés restent actifs ; aucun redémarrage, rebuild, déploiement ou modification des conteneurs historiques.
- Données : aucune écriture métier volontaire, aucun paiement, aucun mouvement de stock, aucune suppression de document, aucune modification des ressources REC15/REC16.
- Décision métier/technique : prévoir une recette navigateur après déploiement contrôlé des corrections locales, avec comptes de test secondaires fournis, avant de déclarer ERP-17 totalement VALIDÉ.

## Verdict consolidé ERP-17

**PARTIEL** : code, tests isolés, builds, Facturation et détail Garantie validés ; recette navigateur post-déploiement Pièces/Nouvel OR/PDF et matrice RBAC multi-profils encore ouvertes.
