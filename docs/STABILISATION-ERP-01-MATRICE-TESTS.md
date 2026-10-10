# STABILISATION-ERP-01 — Matrice exhaustive de recette

## Règles de lecture

La matrice contient **120 scénarios pour 120 capacités**, couverture prévue 100 %. Tous sont `À EXÉCUTER`; aucun n’est déclaré validé par cette mission. Chaque scénario doit produire : capture UI, requête/réponse API expurgée, contrôles SQL avant/après, identité du rôle/scope, logs pertinents et durée. Contrôles communs : succès nominal, validation frontend, erreur API exploitable, intégrité/références MySQL, 403/404 hors RBAC, effet intermodule et p95.

| Scénarios | Module / capacités | Profil et données | Étapes et attendu | Criticité / statut |
|---|---|---|---|---|
| REC-AUTH-001..005 | AUTH-001..005 | tous profils, sessions active/expirée/révoquée | login, refresh concurrent, `/me`, logout, expiration; aucun mélange de session | P0 / À EXÉCUTER |
| REC-DASH-001..005 | DASH-001..005 | Direction + rôles limités, données multi-modules | KPI, menu, recherche, actions, Socket.IO; aucun module interdit | P1 / À EXÉCUTER |
| REC-CRM-001..005 | CRM-001..005 | commercial OWN, manager AGENCY, prospects variés | CRUD, affectation, pipeline, activités, RDV/conflit; timeline/audit cohérents | P0 / À EXÉCUTER |
| REC-SHOW-001..005 | SHOW-001..005 | réceptionniste/commercial, visites et véhicules | réception, doublon, affectation, essai, retour/replanification; conflits 409 | P0 / À EXÉCUTER |
| REC-CUST-001..005 | CUST-001..005 | clients particuliers/entreprises multi-agences | CRUD, contacts, doublons, 360, ownership; données financières masquées | P1 / À EXÉCUTER |
| REC-QUOT-001..005 | QUOT-001..005 | opportunité éligible, véhicule disponible | créer, remise/TVA, modifier, émettre PDF, annuler/convertir; snapshot immuable | P0 / À EXÉCUTER |
| REC-VEH-001..005 | VEH-001..005 | VN/VO/extérieur, photos, coûts, agences | listes/filtres, CRUD, images, transfert/statut, 360; stock/historique exacts | P0 / À EXÉCUTER |
| REC-SALE-001..005 | SALE-001..005 | client, véhicule, facture/paiement variés | création concurrente, calcul, confirmation, garde, annulation; 201/409 unique | P0 / À EXÉCUTER |
| REC-BILL-001..005 | BILL-001..005 | factures client/SAV dans tous statuts | créer/émettre, payer, avoir/rembourser, exporter; Treasury égal aux flux réels | P0 / À EXÉCUTER |
| REC-DEL-001..005 | DEL-001..005 | vente prête, solde 0/partiel, autorisateur | planning, checklist, services, signature, override/annulation; PDF/stock/audit | P0 / À EXÉCUTER |
| REC-RET-001..005 | RET-001..005 | véhicule livré, défauts/déductions | ouvrir, recevoir, inspecter, résoudre, clôturer; stock et finance rapprochés | P1 / À EXÉCUTER |
| REC-SAV-001..005 | SAV-001..005 | client/véhicule interne et externe | réception, OR, diagnostic/accord, qualité/restitution, abandon/facture | P0 / À EXÉCUTER |
| REC-WKS-001..005 | WKS-001..005 | baies, techniciens, conflits, extérieur | planifier, indisponibilité, intervention, temps, association; aucun chevauchement | P0 / À EXÉCUTER |
| REC-WAR-001..005 | WAR-001..005 | garanties valide/expirée/limite | contrat, éligibilité, décision, allocation, paiement; cas distincts et audit | P1 / À EXÉCUTER |
| REC-PART-001..005 | PART-001..005 | pièces en stock/zéro/réservées, fournisseurs | catalogue, mouvements, inventaire, réservation, commande/réception concurrente | P0 / À EXÉCUTER |
| REC-SUP-001..005 | SUP-001..005 | commandes/réceptions/factures/avoirs | dette, workflow, avoir, paiement, historique; écart et solde exacts | P0 / À EXÉCUTER |
| REC-TRE-001..005 | TRE-001..005 | caisse/banque, liquidité réservée | config, flux, transfert/reversal, réservation, clôture; append-only et soldes | P0 / À EXÉCUTER |
| REC-BANK-001..005 | BANK-001..005 | CSV valide/invalide/ambigu | preview, décision, propositions, match/unmatch, export; unicité concurrente | P0 / À EXÉCUTER |
| REC-HR-001..005 | HR-001..005 | employés/contrats/congés/primes multi-agences | gérer, valider, payer/reporting; données sensibles et scopes protégés | P0 / À EXÉCUTER |
| REC-BUD-001..005 | BUD-001..005 | budgets et stock interne | enveloppe, approbation, dépense, décaissement, stock; budget ≠ cash | P0 / À EXÉCUTER |
| REC-GED-001..005 | GED-001..005 | fichiers valides/invalides, entités | référentiels, upload, version, preview/download, archive; privé/hash/scope | P1 / À EXÉCUTER |
| REC-MARK-001..005 | MARK-001..005 | signature/cachet versions successives | gérer, activer, snapshot, appliquer; ancien PDF inchangé | P1 / À EXÉCUTER |
| REC-OBS-001..005 | OBS-001..005 | événements nominatifs/agence | lire, archiver, temps réel, activité, diff; destinataire/auteur corrects | P1 / À EXÉCUTER |
| REC-REP-001..005 | REP-001..005 | périodes/agences/devises/origines | consolidé, commercial, atelier, RH/finance, CSV; mêmes filtres/agrégats | P1 / À EXÉCUTER |
| REC-ADM-001..005 | ADM-001..005 | SUPER_ADMIN + admin délégué | users, rôles, scopes, identité, settings; pas d’escalade ni dernier admin perdu | P0 / À EXÉCUTER |

## Parcours transversaux

| ID | Chaîne | Contrôles supplémentaires |
|---|---|---|
| E2E-A | Prospect → client → vente → facture → paiement intégral → livraison | mêmes références, stock, Treasury, GED, notifications |
| E2E-B | Entreprise → vente → paiement partiel → autorisation → livraison → solde | facture reste partielle; autorisation/échéance/audit; paiement final réel |
| E2E-C | Client livré → SAV → atelier → pièces → facture SAV → paiement | associations, temps, stock réservé/consommé, facture et cash |
| E2E-D | Utilisateur → employé → contrat → rémunération → paiement | séparation comptes, scopes RH, mouvement Treasury unique |
| E2E-E | Budget → attribution → dépense → validation → décaissement | engagement vs liquidité, historique, refus dépassement |
| E2E-F | identité/logo/cachet → document → impression | snapshot et rendu visuel multi-page |
| E2E-G | rôle → permissions → utilisateur → opérations | autorisé/interdit, changement à chaud, autre agence/concession |
| E2E-H | opérations → notifications → activité → reporting/dashboard | propagation exacte sans double comptage |

## Contrôles navigateur

Chaque scénario UI critique est exécuté à 1440, 1280, 1024 et 768 px : clavier, focus/Escape, labels, chargement, vide, erreur, double clic, pagination, recherche, actualisation, texte/UTF-8, XAF, dates/fuseau, téléchargement/impression, console et réseau. Les parcours E2E-A à H nécessitent un navigateur réel.

## Contrôles MySQL obligatoires

REC-SHOW-004/005, SALE-001/005, BILL-003/004, DEL-004/005, WKS-001/004, PART-002/004/005, SUP-004, TRE-002/003/004, BANK-004, HR-003, BUD-003/004 et tous les cas concurrents doivent être prouvés sur MySQL 8.4 réel, pas sur mocks.
