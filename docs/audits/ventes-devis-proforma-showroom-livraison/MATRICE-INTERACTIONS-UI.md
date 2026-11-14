# Matrice exhaustive des interactions UI

Chaque ligne désigne un contrôle individuel. `NAV` = test navigateur réel ; `STAT` = inspection du rendu/code ; `NT` = non testé.

| ID | Chemin | Contrôle | Action/résultat observé | API | Permission | Preuve | Statut |
|---|---|---|---|---|---|---|---|
| UI-VTE-001 | `/sales` | onglet Ventes | affiche liste | GET `/sales` | `sales.view` | NAV | CONFORME |
| UI-VTE-002 | `/sales` | onglet Devis | ouvre `/sales/quotations` | GET `/quotations` | `quotations.view` | NAV | CONFORME |
| UI-VTE-003 | `/sales` | recherche | exact/partiel/casse/vide | GET `/sales?search` | `sales.view` | NAV | CONFORME |
| UI-VTE-004 | `/sales` | filtre statut | options visibles | GET `/sales?status` | `sales.view` | NAV | PARTIELLE |
| UI-VTE-005 | `/sales` | précédent | désactivé page 1 | GET `/sales?page` | `sales.view` | NAV | CONFORME |
| UI-VTE-006 | `/sales` | suivant | état selon total | GET `/sales?page` | `sales.view` | NAV | CONFORME |
| UI-VTE-007 | `/sales` | Nouvelle vente | ouvre wizard | candidats | `sales.create` | NAV | CONFORME |
| UI-VTE-008 | wizard | client | client agence sélectionné | GET `/customers` | `sales.create` | NAV | CONFORME |
| UI-VTE-009 | wizard | véhicule | disponible seulement | GET `/vehicles` | `sales.create` | NAV | CONFORME |
| UI-VTE-010 | wizard | commercial | actif autorisé | GET `/users` | `sales.assign` | NAV | CONFORME |
| UI-VTE-011 | wizard | remise | blocage sous prix minimum | pricing guard | `sales.create` | NAV | CONFORME |
| UI-VTE-012 | wizard | régime fiscal | HT/TVA/TTC calculés | config | `sales.create` | NAV | CONFORME |
| UI-VTE-013 | wizard | garantie | NOT_APPLICABLE accepté | warranty proposal | `sales.create` | NAV | CONFORME |
| UI-VTE-014 | wizard | Créer | vente 9002 créée | POST `/sales` | `sales.create` | NAV | CONFORME |
| UI-VTE-015 | détail | Imprimer commande | action disponible | PDF vente | `sales.view` | NAV | PARTIELLE |
| UI-VTE-016 | détail | Confirmer vente | passe FINANCEMENT_VALIDE | PATCH status | `sales.confirm` | NAV | CONFORME |
| UI-VTE-017 | détail | Lancer préparation | bloqué puis activé après solde | PATCH status | `sales.confirm` | NAV | CONFORME |
| UI-VTE-018 | détail | Déclarer prêt | passe PRET_LIVRAISON | PATCH status | `sales.confirm` | NAV | CONFORME |
| UI-VTE-019 | détail | Annuler | désactivé après paiement | PATCH status | `sales.cancel` | NAV | CONFORME |
| UI-VTE-020 | détail | Créer facture | préremplit vente | POST `/invoices` | `billing.invoice.create` | NAV | CONFORME |
| UI-DEV-001 | `/crm` | recherche | champ présent | GET `/crm/leads` | `crm.prospect.view` | STAT | PARTIELLE |
| UI-DEV-002 | `/crm` | filtres archive/étape/commercial/priorité | options réelles | GET leads | CRM view/assign | NAV | PARTIELLE |
| UI-DEV-003 | fiche | Créer devis | ouvre modale | config/candidats | `quotations.create` | NAV | CONFORME |
| UI-DEV-004 | modale | véhicule | stock physique disponible | GET vehicles/context | `quotations.create` | NAV | CONFORME |
| UI-DEV-005 | modale | quantité | valeur 1 verrouillée véhicule | local | idem | NAV | CONFORME |
| UI-DEV-006 | modale | prix HT | prérempli 45 M | config | idem | NAV | CONFORME |
| UI-DEV-007 | modale | remise | 1 M, total recalculé | local/backend | discount manage | NAV | CONFORME |
| UI-DEV-008 | modale | fiscalité/mode | options TVA/HT/TTC | config | tax override | NAV | CONFORME |
| UI-DEV-009 | modale | validité/notes | valeurs persistées | POST `/quotations` | create | NAV | CONFORME |
| UI-DEV-010 | fiche | Modifier | visible en brouillon | PATCH quotation | update | STAT | PARTIELLE |
| UI-DEV-011 | fiche | Émettre | émis + archive | POST validate | validate | NAV | CONFORME |
| UI-DEV-012 | fiche | PDF | disponible après archive | PDF quotation | view | DOC | CONFORME contenu/hash |
| UI-DEV-013 | fiche | Transformer pro forma | crée brouillon #2 | POST `/proformas` | `proformas.create` | NAV | CONFORME |
| UI-DEV-014 | fiche | Créer vente | déverrouillé après émission | POST `/sales` | convert+create | NAV | PARTIELLE |
| UI-DEV-015 | fiche | Annuler | visible | cancel quotation | cancel | STAT | NON TESTÉE |
| UI-PRO-001 | `/proformas` | Nouvelle | ouvre modale | listes/config | create | NAV | CONFORME |
| UI-PRO-002 | liste | recherche | champ présent | GET `?search` | view | NAV | PARTIELLE |
| UI-PRO-003 | liste | filtre statut | Tous/Brouillon/Émis | GET `?status` | view | NAV | CONFORME |
| UI-PRO-004 | liste | pagination | états cohérents | GET page | view | NAV | CONFORME |
| UI-PRO-005 | modale | client/prospect | bascule et candidats | customers/opportunities | create | NAV | CONFORME |
| UI-PRO-006 | modale | véhicule | transit/vendu exclus | vehicles | create | NAV | CONFORME |
| UI-PRO-007 | modale | lignes/prix/remise/TVA | total calculé | POST proformas | create | NAV | CONFORME |
| UI-PRO-008 | liste | Modifier | notes persistées | PATCH | update | NAV | CONFORME |
| UI-PRO-009 | liste | Émettre | numéro+archive | POST issue | issue | NAV | CONFORME |
| UI-PRO-010 | liste | PDF | action disponible | GET PDF | export | DOC | DÉFECTUEUSE identité |
| UI-SHO-001 | `/showroom` | recherche | partielle/casse | GET showroom | view | NAV | CONFORME |
| UI-SHO-002 | carte | affecter | candidat autorisé | PATCH assign | assign | NAV | CONFORME |
| UI-SHO-003 | carte | prendre en charge | compteurs synchronisés | PATCH status | update | NAV | CONFORME |
| UI-SHO-004 | carte | planifier essai | ouvre modale | candidates | update | NAV | CONFORME |
| UI-SHO-005 | essai | véhicule | disponible seulement | vehicles | update | NAV | CONFORME |
| UI-SHO-006 | essai | permis/date/durée | valeurs acceptées | POST drive | update | NAV | CONFORME |
| UI-SHO-007 | essai | Retour | kilométrage/retour persistés | PATCH return | update | NAV | CONFORME |
| UI-SHO-008 | visite | réaffecter/annuler/clôturer | contrôles prévus | routes showroom | diverses | STAT | NON TESTÉE |
| UI-LIV-001 | `/deliveries` | Planifier | modal candidats | GET candidates | schedule | NAV | CONFORME |
| UI-LIV-002 | liste | Planning PDF | bouton/date | PDF planning | export | NAV | PARTIELLE |
| UI-LIV-003 | liste | recherche/statut | contrôles visibles | GET deliveries | view | NAV | PARTIELLE |
| UI-LIV-004 | liste | Cartes/Liste | bascule visible | local | view | NAV | PARTIELLE |
| UI-LIV-005 | modale | vente prête | candidat 9002 | candidates | schedule | NAV | CONFORME |
| UI-LIV-006 | modale | responsable | utilisateur autorisé | specialists | schedule | NAV | CONFORME |
| UI-LIV-007 | modale | date/heure | 15:00 devient 14:00 | POST deliveries | schedule | NAV | DÉFECTUEUSE |
| UI-LIV-008 | détail | démarrer préparation | fige checklist | PATCH status | prepare | NAV | CONFORME |
| UI-LIV-009..018 | détail | 10 items checklist | chacun validé et tracé | PATCH checklist item | checklist.manage | NAV | CONFORME |
| UI-LIV-019 | détail | contrôle opérationnel | quality_control | PATCH status | prepare | NAV | CONFORME |
| UI-LIV-020 | détail | valider livraison | ready | PATCH status | prepare | NAV | CONFORME |
| UI-LIV-021 | détail | nom signataire | requis | POST sign | signature.capture | NAV | CONFORME |
| UI-LIV-022 | détail | kilométrage | min véhicule | POST sign | complete | NAV | CONFORME |
| UI-LIV-023 | détail | canvas | visible mais facultatif | POST sign | signature.capture | NAV | À ARBITRER |
| UI-LIV-024 | détail | consentement | requis | POST sign | complete | NAV | CONFORME |
| UI-LIV-025 | détail | Signer et livrer | delivered et PV actualisé | POST sign | capture+complete | NAV | CONFORME |
| UI-LIV-026 | détail | document fichier | ajout/téléchargement | documents routes | checklist.manage | STAT | NON TESTÉE |
| UI-LIV-027 | détail | PV PDF | contenu et hash vérifiés | GET PV | view | DOC | CONFORME AVEC RÉSERVE signature |

Légende complémentaire : `DOC` = PDF réel extrait et comparé à la base/GED. Les lignes `NON TESTÉE` restantes sont des limites explicites de recette, pas des succès implicites.
