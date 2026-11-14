# Rapport général d’audit

## Périmètre et verdict final

Audit réalisé le 14 novembre 2026 sur `lca_recette`, frontend `127.0.0.1:4176`, backend `127.0.0.1:3004`, MySQL 8.4.11. Les données de test portent le suffixe `b0bd7910`. Aucun changement métier n’a été apporté.

| Domaine | État | Preuves principales |
|---|---|---|
| Ventes | CONFORME AVEC RÉSERVES | Parcours réel complet et suite MySQL d’annulation/concurrence réussie |
| Devis | PARTIELLE | Création depuis CRM, calcul, émission, archive et transformation pro forma testés ; refus/expiration non testés en navigateur |
| Pro forma | NON CONFORME PARTIELLE | Parcours courant réussi, mais cycle annulation/expiration absent et PDF client individuel erroné |
| Showroom | CONFORME AVEC RÉSERVES | Parcours réel réussi ; concurrence validée, un rollback bloqué par configuration MySQL externe |
| Livraison | NON CONFORME PARTIELLE | Parcours et concurrence réussis, mais heure décalée et preuve de signature ambiguë |

## Faits métier établis

- Le workflow actuel ne présente pas une action distincte « Confirmer la commande ». Une vente réservée expose directement « Confirmer la vente » et passe à `FINANCEMENT_VALIDE`, même sans facture.
- La facture et le paiement ne conditionnent pas la confirmation, mais la situation financière conditionne le démarrage de la préparation.
- Une facture émise, intégralement réglée, déverrouille `PREPARATION`, puis `PRET_LIVRAISON`.
- La livraison suit `planned → preparing → quality_control → ready → delivered` et fige une checklist de dix contrôles obligatoires au démarrage.
- La pro forma est un domaine distinct du devis et de la facture définitive. Une transformation devis→pro forma crée un brouillon sans encaissement.
- Les véhicules en transit ou vendus ne sont proposés ni à la vente ni aux essais ; les sélecteurs testés n’ont affiché que les véhicules disponibles.

## Anomalies saillantes

- `ANO-LIV-001` — la date/heure saisie `2026-11-14 15:00` est affichée `14:00` après planification : décalage d’une heure.
- `ANO-LIV-002` — un canvas de signature numérique client est présent malgré la consigne documentaire indiquant de ne pas réintroduire cette capture. Le tracé est toutefois facultatif ; le libellé « Signature réelle » est trompeur.
- `ANO-DEV-001` — la modale de devis affiche « références commerciales ou paramètres fiscaux indisponibles » alors que le prix et la TVA sont calculés et que la création aboutit.
- `ANO-UX-001` — plusieurs listes n’exposent aucun tri utilisateur alors que les données sont ordonnées côté serveur.
- `ARB-PRO-001` — les statuts pro forma se limitent à `draft` et `issued`; annulation/expiration/historique explicite sont absents et nécessitent une décision métier avant correction.
- `ANO-DOC-002` — le PDF pro forma d’un client particulier imprime littéralement `null` à la place de son nom, bien que le snapshot contienne `Client Audit UI`.

## Tests réalisés

- 26 fichiers ciblés : 20 ont réussi en bac à sable ; 6 n’ont pu ouvrir un port local (`EPERM`).
- Les 6 fichiers concernés ont été rejoués hors bac à sable : 145 tests réussis, 0 échec.
- Builds frontend/backend et `tsc --noEmit` : terminés sans diagnostic ; artefacts `frontend/dist/index.html` et `backend-node/dist/server.js` présents.
- Recette navigateur réelle : vente, facture, paiement, devis, pro forma, showroom, essai et livraison.
- Cinq suites MySQL sur schéma jetable : 31 tests comptés, 30 réussis, 1 bloqué par l’interdiction MySQL de créer un trigger sans `SUPER`/`log_bin_trust_function_creators`; aucun échec métier démontré.
- PDF/GED : six documents officiels extraits et comparés ; les six hashes SHA-256 concordent avec la GED. Bon de commande, facture, reçu, PV et devis concordent ; pro forma défectueuse sur l’identité client.
- RBAC multi-agences : contrôles ciblés réussis ; la suite dynamique dédiée atteint le garde-fou 2FA (`401 TWO_FACTOR_AUTHENTICATION_REQUIRED`) de son compte système de test et ne peut donc pas être déclarée réussie.

## Limites et clôture

Verdict : **NON CONFORME PARTIELLE — exploitable sous réserves, non libérable sans traitement des anomalies majeures**. Le flux nominal est solide et les protections concurrentes testées sont efficaces, mais `ANO-LIV-001` et `ANO-DOC-002` affectent des documents/rendez-vous client, tandis que la politique de signature et le cycle pro forma restent à arbitrer. Les contrôles non exécutables sont explicitement marqués, sans assimilation à une réussite.

Nettoyage terminé : transaction bornée avec assertions, sept fichiers GED supprimés, deux schémas jetables supprimés, zéro fixture `b0bd7910`. Compteurs revenus au baseline : 1 vente, 0 devis, 0 pro forma, 1 visite, 1 essai, 0 livraison, 6 clients, 2 véhicules. `concession_erp` n’a jamais été ciblée.
