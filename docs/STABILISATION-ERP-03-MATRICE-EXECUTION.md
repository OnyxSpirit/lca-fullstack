# STABILISATION-ERP-03 — Matrice d'exécution

| ID | Scénario | Résultat observé | Statut |
|---|---|---|---|
| CRM-01 | créer particulier budget/reprise | 201, persistant | VALIDÉ |
| CRM-02 | créer entreprise flotte | 201, persistant | VALIDÉ |
| CRM-03 | prospect sans budget | 201, budget 0 | VALIDÉ |
| CRM-04 | caractères accentués/composés | API/UI corrects | VALIDÉ |
| CRM-05 | courriel invalide | 400 | VALIDÉ |
| CRM-06 | contact absent | 400 | VALIDÉ |
| CRM-07 | recherche doublon lead | 1 correspondance | VALIDÉ |
| CRM-08 | modification | 200, relue | VALIDÉ |
| CRM-09 | pagination/recherche | résultats et compteurs cohérents | VALIDÉ |
| CRM-10 | new→contacted→qualified | transitions persistées | VALIDÉ |
| CRM-11 | qualification directe | 409 | VALIDÉ |
| CRM-12 | prospect perdu avec motif | `lost`, persistant | VALIDÉ |
| CRM-13 | rendez-vous futur | 201, étape appointment | VALIDÉ |
| CRM-14 | conflit rendez-vous | 409 | VALIDÉ |
| CRM-15 | activité appel | 201, historique relu | VALIDÉ |
| CRM-16 | réaffectation aller/retour | propriétaire/agence cohérents | VALIDÉ |
| CRM-17 | filtre Toute l'équipe | 2 prospects affichés, non vide | VALIDÉ |
| CRM-18 | test-drive/offre/négociation/won | dépend campagnes essai/devis/vente | NON EXÉCUTÉ |
| CUST-01 | créer particulier | CLI-000001 | VALIDÉ |
| CUST-02 | créer entreprise | CLI-000002 | VALIDÉ |
| CUST-03 | doublon client | 409 | VALIDÉ |
| CUST-04 | recherche accentuée | 1 résultat API/UI | VALIDÉ |
| CUST-05 | ouvrir fiche 360 | page et sections chargées | VALIDÉ |
| CUST-06 | modifier client | score/téléphone persistés | VALIDÉ |
| CUST-07 | contact entreprise | créé puis modifié | VALIDÉ |
| CUST-08 | CRM→Client automatique | aucune action officielle | BLOQUÉ |
| RBAC-01 | COMMERCIAL OWN | 2/5, hors portefeuille 404 | VALIDÉ |
| RBAC-02 | manager CONCESSION | 5/5 | VALIDÉ |
| RBAC-03 | RECEPTIONNISTE | 403 | VALIDÉ |
| RBAC-04 | inter-concessions | seconde concession indisponible | BLOQUÉ |
| NOTIF-01 | notification affectation/statut | aucune ligne persistée | NON VALIDÉ |
| NOTIF-02 | consultation destinataire | 403, permission absente | NON VALIDÉ |
| CONC-01 | double création identité | 201/409, un seul client | VALIDÉ |
| CONC-02 | modifications lead simultanées | 200/200, champs distincts conservés | VALIDÉ |
| UI-01 | pipeline Commercial | 2 cartes, compteurs corrects | VALIDÉ |
| UI-02 | recherche et 360 | résultat puis fiche ouverte | VALIDÉ |
| PERF-01 | 62 appels instrumentés | 0 erreur 5xx | VALIDÉ |

Prévu : 37 scénarios. Exécutés : 36. Validés : 31. Non validés : 2. Bloqués : 2. Non exécutés : 1. Couverture exécutée : 97,3 %. Couverture validée stricte : 83,8 %.

