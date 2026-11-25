# Matrice de tests — EVOLUTION-LCA-02

Date : 25 novembre 2026. Chaque ligne est une assertion individualisée ; les preuves groupées proviennent du même parcours réel. Aucun succès n’est fondé sur la seule lecture du code.

| ID | Exigence | Préconditions | Scénario | Attendu | Obtenu | Type | Preuve | Verdict |
|---|---|---|---|---|---|---|---|---|
| T001 | EVO-17/18/19 | Données fictives agence 1 | Créer diagnostic externe | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T002 | EVO-17/18/19 | Données fictives agence 1 | Associer client existant | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T003 | EVO-17/18/19 | Données fictives agence 1 | Identifier véhicule externe | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T004 | EVO-17/18/19 | Données fictives agence 1 | Créer diagnostic interne | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T005 | EVO-17/18/19 | Données fictives agence 1 | Conserver kilométrage | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T006 | EVO-17/18/19 | Données fictives agence 1 | Conserver plainte | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T007 | EVO-17/18/19 | Données fictives agence 1 | Recharger fiche persistée | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T008 | EVO-17/18/19 | Données fictives agence 1 | Refuser identifiant véhicule invalide | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T009 | EVO-17/18/19 | Données fictives agence 1 | Refuser hors agence | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T010 | EVO-17/18/19 | Données fictives agence 1 | Aucun OR à réception | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T011 | EVO-17/18/19 | Données fictives agence 1 | Aucun OR à finalisation | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T012 | EVO-17/18/19 | Données fictives agence 1 | Lister diagnostics | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T013 | EVO-17/18/19 | Données fictives agence 1 | Réutiliser formulaire réception | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T014 | EVO-17/18/19 | Données fictives agence 1 | Permission création | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T015 | EVO-17/18/19 | Données fictives agence 1 | Permission consultation | Conforme | Conforme | HTTP/MySQL | Diagnostics externe, interne et refusé, sans OR prématuré | Réussi |
| T016 | EVO-22/23 | Données fictives agence 1 | Ajouter main-d’œuvre | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T017 | EVO-22/23 | Données fictives agence 1 | Ajouter pièce catalogue | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T018 | EVO-22/23 | Données fictives agence 1 | Refuser chiffrage prématuré | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T019 | EVO-22/23 | Données fictives agence 1 | Quantité main-d’œuvre | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T020 | EVO-22/23 | Données fictives agence 1 | Quantité pièces | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T021 | EVO-22/23 | Données fictives agence 1 | Tarif backend | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T022 | EVO-22/23 | Données fictives agence 1 | Remise HT | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T023 | EVO-22/23 | Données fictives agence 1 | Devis avec TVA | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T024 | EVO-22/23 | Données fictives agence 1 | Devis sans TVA justifié | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T025 | EVO-22/23 | Données fictives agence 1 | Refuser exonération injustifiée | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T026 | EVO-22/23 | Données fictives agence 1 | Sous-total HT | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T027 | EVO-22/23 | Données fictives agence 1 | TVA paramétrée | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T028 | EVO-22/23 | Données fictives agence 1 | Total TTC | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T029 | EVO-22/23 | Données fictives agence 1 | Immutabilité après émission | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T030 | EVO-22/23 | Données fictives agence 1 | PDF devis diagnostic | Conforme | Conforme | HTTP/MySQL | HT 95 000, TVA 17 955, TTC 112 955 | Réussi |
| T031 | EVO-20/21 | Données fictives agence 1 | Devis sans OR | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T032 | EVO-20/21 | Données fictives agence 1 | Devis en attente | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T033 | EVO-20/21 | Données fictives agence 1 | Refus sans OR | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T034 | EVO-20/21 | Données fictives agence 1 | Acceptation externe | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T035 | EVO-20/21 | Données fictives agence 1 | Acceptation interne | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T036 | EVO-20/21 | Données fictives agence 1 | OR automatique en cours | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T037 | EVO-20/21 | Données fictives agence 1 | Recopie client/véhicule | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T038 | EVO-20/21 | Données fictives agence 1 | Recopie diagnostic | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T039 | EVO-20/21 | Données fictives agence 1 | Recopie prestations | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T040 | EVO-20/21 | Données fictives agence 1 | Recopie pièces | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T041 | EVO-20/21 | Données fictives agence 1 | Recopie fiscalité | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T042 | EVO-20/21 | Données fictives agence 1 | Recopie montants | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T043 | EVO-20/21 | Données fictives agence 1 | Références diagnostic/devis | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T044 | EVO-20/21 | Données fictives agence 1 | Demande pièces à acceptation | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T045 | EVO-20/21 | Données fictives agence 1 | Demande pièces unique | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T046 | EVO-20/21 | Données fictives agence 1 | Double clic concurrent | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T047 | EVO-20/21 | Données fictives agence 1 | Rejeu HTTP | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T048 | EVO-20/21 | Données fictives agence 1 | Création directe identifiants invalides | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T049 | EVO-20/21 | Données fictives agence 1 | Création directe identifiants valides | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T050 | EVO-20/21 | Données fictives agence 1 | OR présent en liste | Conforme | Conforme | HTTP/MySQL | Acceptation concurrente 201/200, rejeu 200 | Réussi |
| T051 | EVO-24/25/26 | Données fictives agence 1 | Activer technicien RH | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T052 | EVO-24/25/26 | Données fictives agence 1 | Désactiver technicien RH | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T053 | EVO-24/25/26 | Données fictives agence 1 | Persister propriété | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T054 | EVO-24/25/26 | Données fictives agence 1 | Liste dynamique agence | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T055 | EVO-24/25/26 | Données fictives agence 1 | Technicien sans compte ERP | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T056 | EVO-24/25/26 | Données fictives agence 1 | Exclure non-technicien | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T057 | EVO-24/25/26 | Données fictives agence 1 | Exclure inactif | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T058 | EVO-24/25/26 | Données fictives agence 1 | Exclure hors agence | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T059 | EVO-24/25/26 | Données fictives agence 1 | Confidentialité RH | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T060 | EVO-24/25/26 | Données fictives agence 1 | Créer intervention | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T061 | EVO-24/25/26 | Données fictives agence 1 | Affectation unique | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T062 | EVO-24/25/26 | Données fictives agence 1 | Affectation triple | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T063 | EVO-24/25/26 | Données fictives agence 1 | Absence doublon | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T064 | EVO-24/25/26 | Données fictives agence 1 | Modifier affectations | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T065 | EVO-24/25/26 | Données fictives agence 1 | Désélectionner | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T066 | EVO-24/25/26 | Données fictives agence 1 | Persister deux techniciens | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T067 | EVO-24/25/26 | Données fictives agence 1 | Technicien multi-tâches | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T068 | EVO-24/25/26 | Données fictives agence 1 | Relecture affectations | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T069 | EVO-24/25/26 | Données fictives agence 1 | Historique relationnel | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T070 | EVO-24/25/26 | Données fictives agence 1 | Cases à cocher par tâche | Conforme | Conforme | HTTP/MySQL | Affectations E2E : 3 puis 2 techniciens | Réussi |
| T071 | EVO-27/28 | Données fictives agence 1 | Client enregistré avec TVA | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T072 | EVO-27/28 | Données fictives agence 1 | Client enregistré sans TVA | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T073 | EVO-27/28 | Données fictives agence 1 | Client tiers avec TVA | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T074 | EVO-27/28 | Données fictives agence 1 | Client tiers sans TVA | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T075 | EVO-27/28 | Données fictives agence 1 | Aucune création CRM | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T076 | EVO-27/28 | Données fictives agence 1 | Nom tiers | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T077 | EVO-27/28 | Données fictives agence 1 | Téléphone/adresse tiers | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T078 | EVO-27/28 | Données fictives agence 1 | Plusieurs références | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T079 | EVO-27/28 | Données fictives agence 1 | Plusieurs quantités | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T080 | EVO-27/28 | Données fictives agence 1 | Prix backend | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T081 | EVO-27/28 | Données fictives agence 1 | Réserver stock | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T082 | EVO-27/28 | Données fictives agence 1 | Décrémenter à remise | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T083 | EVO-27/28 | Données fictives agence 1 | Stock insuffisant | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T084 | EVO-27/28 | Données fictives agence 1 | Facture client enregistré | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T085 | EVO-27/28 | Données fictives agence 1 | Facture client tiers | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T086 | EVO-27/28 | Données fictives agence 1 | PDF facture tiers | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T087 | EVO-27/28 | Données fictives agence 1 | Total TTC 71 340 | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T088 | EVO-27/28 | Données fictives agence 1 | Total exonéré 60 000 | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T089 | EVO-27/28 | Données fictives agence 1 | Idempotence création | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T090 | EVO-27/28 | Données fictives agence 1 | Huit mouvements | Conforme | Conforme | HTTP/MySQL | Quatre ventes E2E, factures 16 à 19 | Réussi |
| T091 | EVO-29/30/31/32 | Données fictives agence 1 | Stock actuel | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T092 | EVO-29/30/31/32 | Données fictives agence 1 | Entrées | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T093 | EVO-29/30/31/32 | Données fictives agence 1 | Ventes directes | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T094 | EVO-29/30/31/32 | Données fictives agence 1 | Livraisons atelier | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T095 | EVO-29/30/31/32 | Données fictives agence 1 | Consommations OR | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T096 | EVO-29/30/31/32 | Données fictives agence 1 | Retours | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T097 | EVO-29/30/31/32 | Données fictives agence 1 | Autres mouvements | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T098 | EVO-29/30/31/32 | Données fictives agence 1 | Tous mouvements | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T099 | EVO-29/30/31/32 | Données fictives agence 1 | Date début | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T100 | EVO-29/30/31/32 | Données fictives agence 1 | Date fin | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T101 | EVO-29/30/31/32 | Données fictives agence 1 | Type mouvement | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T102 | EVO-29/30/31/32 | Données fictives agence 1 | Référence pièce | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T103 | EVO-29/30/31/32 | Données fictives agence 1 | Désignation | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T104 | EVO-29/30/31/32 | Données fictives agence 1 | Catégorie | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T105 | EVO-29/30/31/32 | Données fictives agence 1 | Destination | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T106 | EVO-29/30/31/32 | Données fictives agence 1 | Facture | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T107 | EVO-29/30/31/32 | Données fictives agence 1 | Ordre réparation | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T108 | EVO-29/30/31/32 | Données fictives agence 1 | Référence mouvement | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T109 | EVO-29/30/31/32 | Données fictives agence 1 | Filtres combinés | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T110 | EVO-29/30/31/32 | Données fictives agence 1 | Pagination serveur | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T111 | EVO-29/30/31/32 | Données fictives agence 1 | Totaux filtre complet | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T112 | EVO-29/30/31/32 | Données fictives agence 1 | Quantité vendue | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T113 | EVO-29/30/31/32 | Données fictives agence 1 | Montant commercial | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T114 | EVO-29/30/31/32 | Données fictives agence 1 | Coût vs vente | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T115 | EVO-29/30/31/32 | Données fictives agence 1 | Pas de double comptage | Conforme | Conforme | HTTP/MySQL | Inventaire E2E : +8 lignes, +12 unités, +240 000 XAF | Réussi |
| T116 | Francisation | Données fictives agence 1 | CSV filtré | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T117 | Francisation | Données fictives agence 1 | XLSX filtré | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T118 | Francisation | Données fictives agence 1 | Signature ZIP XLSX | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T119 | Francisation | Données fictives agence 1 | En-têtes CSV français | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T120 | Francisation | Données fictives agence 1 | Mouvements français | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T121 | Francisation | Données fictives agence 1 | Feuille Excel française | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T122 | Francisation | Données fictives agence 1 | Quantités exportées | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T123 | Francisation | Données fictives agence 1 | Montants exportés | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T124 | Francisation | Données fictives agence 1 | Cloisonnement exports | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T125 | Francisation | Données fictives agence 1 | Signature PDF | Conforme | Conforme | Document/Export | PDF 1 833 o; CSV 728 o; XLSX 9 302 o | Réussi |
| T126 | Non-régression / sécurité | Données fictives agence 1 | Lint backend | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T127 | Non-régression / sécurité | Données fictives agence 1 | Lint frontend | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T128 | Non-régression / sécurité | Données fictives agence 1 | Build backend | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T129 | Non-régression / sécurité | Données fictives agence 1 | Build frontend | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T130 | Non-régression / sécurité | Données fictives agence 1 | Installation fraîche 135 | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T131 | Non-régression / sécurité | Données fictives agence 1 | Migration 133→134 | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T132 | Non-régression / sécurité | Données fictives agence 1 | Migration 134→135 | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T133 | Non-régression / sécurité | Données fictives agence 1 | Rôles préservés | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T134 | Non-régression / sécurité | Données fictives agence 1 | Permissions historiques préservées | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T135 | Non-régression / sécurité | Données fictives agence 1 | Scopes OWN/AGENCY | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T136 | Non-régression / sécurité | Données fictives agence 1 | Cinq permissions LCA-02 | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T137 | Non-régression / sécurité | Données fictives agence 1 | Clés étrangères | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T138 | Non-régression / sécurité | Données fictives agence 1 | Unicité diagnostic–OR | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T139 | Non-régression / sécurité | Données fictives agence 1 | Index techniciens | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T140 | Non-régression / sécurité | Données fictives agence 1 | Client tiers nullable | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T141 | Non-régression / sécurité | Données fictives agence 1 | Facture tiers nullable | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T142 | Non-régression / sécurité | Données fictives agence 1 | Enum retour vente | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T143 | Non-régression / sécurité | Données fictives agence 1 | Concurrence réelle | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T144 | Non-régression / sécurité | Données fictives agence 1 | Rejeu 200 après 201 | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T145 | Non-régression / sécurité | Données fictives agence 1 | Immutabilité HTTP 409 | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T146 | Non-régression / sécurité | Données fictives agence 1 | Suite frontend globale | Conforme | 1 086/1 094 réussis; 8 échecs hors périmètre | Non-régression | Suite frontend Node 22 | Réussi avec réserves |
| T147 | Non-régression / sécurité | Données fictives agence 1 | Suite backend Node 22 | Conforme | 2 071 réussis, 28 échecs et 106 ignorés sur 2 205 ; échecs historiques hors parcours LCA-02 | Non-régression | Suite backend complète Node 22, 374 828 ms | Réussi avec réserves |
| T148 | Non-régression / sécurité | Données fictives agence 1 | Diff check | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |
| T149 | Non-régression / sécurité | Données fictives agence 1 | Navigation navigateur | Conforme | Navigateur local indisponible dans ce chat | Navigateur | CUA indisponible | Non exécuté |
| T150 | Non-régression / sécurité | Données fictives agence 1 | Ressources Docker préservées | Conforme | Conforme | Build/MySQL | Compilations, bootstrap MySQL 8.4 et inspection schéma | Réussi |

