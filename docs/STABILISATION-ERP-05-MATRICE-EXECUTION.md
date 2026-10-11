# STABILISATION-ERP-05 — Matrice d'exécution

Couverture : **34 prévus, 29 exécutés, 21 validés, 2 non validés, 4 partiels, 2 bloqués, 5 non exécutés**.

| ID | Scénario | Profil | Résultat | Statut |
|---|---|---|---|---|
| REC05-01 | liste sans authentification | anonyme | 401 | VALIDÉ |
| REC05-02 | payload invalide / clé absente | Super Admin | 400 | VALIDÉ |
| REC05-03 | client et véhicule d'agences différentes | Super Admin | 403 | VALIDÉ |
| REC05-04 | véhicule indisponible | Super Admin | refus avant écriture | VALIDÉ |
| REC05-05 | deux créations même véhicule | Super Admin | 201/409, une seule gagnante | VALIDÉ |
| REC05-06 | rejeu même clé | Super Admin | même vente, mais HTTP 201 au rejeu | PARTIEL |
| REC05-07 | commande puis confirmation | Super Admin | transitions et stock cohérents | VALIDÉ |
| REC05-08 | préparation sans facture | Super Admin | 409 | VALIDÉ |
| REC05-09 | facture véhicule et émission | Super Admin | 2 factures cohérentes | VALIDÉ |
| REC05-10 | paiement partiel | Super Admin | facture `partially_paid` | VALIDÉ |
| REC05-11 | préparation partielle sans dérogation | Super Admin | 409 | VALIDÉ |
| REC05-12 | autorisation avec solde | Super Admin | autorisation ACTIVE, préparation permise | VALIDÉ |
| REC05-13 | paiement intégral | Super Admin | facture `paid`, solde 0 | VALIDÉ |
| REC05-14 | annulation sans motif | Super Admin | 400 | VALIDÉ |
| REC05-15 | annulation et libération stock | Super Admin | vente/réservation annulées, véhicule disponible | VALIDÉ |
| REC05-16 | action après annulation | Super Admin | 409 | VALIDÉ |
| REC05-17 | facture après annulation | Super Admin | 409 | VALIDÉ |
| REC05-18 | six documents PDF | Super Admin | `%PDF`, types et tailles valides | VALIDÉ |
| REC05-19 | scopes manager/commercial/livraison | 3 profils | listes conformes au périmètre | VALIDÉ |
| REC05-20 | profils sans sales.view | 3 profils | 403 | VALIDÉ |
| REC05-21 | commercial autre agence | Commercial | 404 non révélateur | VALIDÉ |
| REC05-22 | comptable crée une vente | Comptable | 403 | VALIDÉ |
| REC05-23 | activité et notifications | Super Admin | traces persistées | VALIDÉ |
| REC05-24 | navigateur liste et détail port 3001 | Super Admin | rendu réel sans erreur console | PARTIEL |
| REC05-25 | motif annulation frontend | inspection + navigateur | `window.prompt` subsiste | NON VALIDÉ |
| REC05-26 | bannière vente livrée | navigateur | message de régularisation hors contexte | NON VALIDÉ |
| REC05-27 | inter-concessions | — | une seule concession | BLOQUÉ |
| REC05-28 | tests UI REC05 sur 4176 | — | port 3001 imposé | BLOQUÉ |
| REC05-29 | performance API | Super Admin | 92 appels, 0 erreur 5xx | VALIDÉ |
| REC05-30 | livraison effective | Livraison | campagne suivante | NON EXÉCUTÉ |
| REC05-31 | remboursement/avoir | Finance | politique historique réservée | NON EXÉCUTÉ |
| REC05-32 | remise positive | Commercial | règle métier non exercée | NON EXÉCUTÉ |
| REC05-33 | conversion Prospect→Client | CRM | liaison officielle absente | NON EXÉCUTÉ |
| REC05-34 | concurrence paiement/facture avancée | Finance | couverte statiquement, non rejouée REC05 | PARTIEL |
