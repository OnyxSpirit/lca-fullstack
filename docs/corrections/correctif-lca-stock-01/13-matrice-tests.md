# Matrice de 130 cas individualisés

Légende des préconditions : `API` = application compilée avec doubles contrôlés ; `DB` = MySQL 8.4 isolé au niveau 138 ; `NAV` = instance navigateur isolée reconstruite. « À exécuter » n'est jamais présenté comme un succès.

| ID | Exigence | Préconditions | Données | Action exécutée | Attendu | Obtenu | Verdict | Preuve |
|---|---|---|---|---|---|---|---|---|
| T001 | Création flotte | DB | quantité 10 | POST commande | 10 fiches | 10 fiches | Réussi | test MySQL/HTTP |
| T002 | Version facultative | DB | version vide | POST commande | accepté | accepté | Réussi | test MySQL/HTTP |
| T003 | VIN facultatif | DB | commande neuve | lire fiches | VIN NULL | VIN NULL | Réussi | test MySQL/HTTP |
| T004 | État initial | DB | 10 fiches | lire fiches | en commande | en commande | Réussi | test MySQL/HTTP |
| T005 | Réception partielle | DB | 4 sur 10 | POST réception | 4/6 | 4/6 | Réussi | test MySQL/HTTP |
| T006 | Réception totale | DB | 6 restantes | POST réception | 10/0 | 10/0 | Réussi | test MySQL/HTTP |
| T007 | Sur-réception | DB | 1 après total | POST réception | conflit | HTTP 409 | Réussi | test MySQL/HTTP |
| T008 | Concurrence | DB | deux fois 6 | POST simultanés | un succès | 201/409 | Réussi | test MySQL/HTTP |
| T009 | Source de vérité | DB | statut démonstration | modifier puis lire | reçu inchangé | inchangé | Réussi | test MySQL/HTTP |
| T010 | Cloisonnement | DB | commande agence B | liste agence A | absente | absente | Réussi | test MySQL/HTTP |
| T011 | Cloisonnement écriture | DB | commande agence B | réception agence A | refus | HTTP 404 | Réussi | test MySQL/HTTP |
| T012 | Pro forma | DB | fiche versionnée | créer pro forma | créée | créée | Réussi | test MySQL/HTTP |
| T013 | API simplifiée | API | nouveau payload | test contrat | accepté | accepté | Réussi | correctif-lca-stock-01.test.ts |
| T014 | KPI réception | API | statuts divergents | calcul statistiques | journal utilisé | journal utilisé | Réussi | correctif-lca-stock-01.test.ts |
| T015 | Frontend simplifié | API | source TSX | test comportement | champs techniques absents | absents | Réussi | behavior test |
| T016 | Temps réel | API | création/réception | inspecter branchement | événement agence | présent | Réussi | test ciblé |
| T017 | Marque obligatoire | NAV isolé | marque vide | ouvrir le formulaire et laisser la marque vide | création bloquée | bouton de création désactivé | Réussi | `preuves/cloture-navigateur/T017-T018-champs-obligatoires.png` |
| T018 | Modèle obligatoire | NAV isolé | modèle vide | confirmer une marque sans modèle | création bloquée | bouton de création désactivé | Réussi | `preuves/cloture-navigateur/T017-T018-champs-obligatoires.png` |
| T019 | Quantité zéro | NAV isolé | 0 | saisir 0 après confirmation marque/modèle | bloqué | `rangeUnderflow=true`, bouton désactivé | Réussi | `preuves/cloture-navigateur/T019-quantite-0.png` |
| T020 | Quantité négative | NAV isolé | -1 | saisir -1 | bloqué | `rangeUnderflow=true`, bouton désactivé | Réussi | `preuves/cloture-navigateur/T020-quantite--1.png` |
| T021 | Quantité décimale | NAV isolé | 1,5 | saisir 1,5 | bloqué | `stepMismatch=true`, bouton désactivé | Réussi | `preuves/cloture-navigateur/T021-quantite-1-5.png` |
| T022 | Quantité maximale | NAV isolé | 1000 | saisir 1000 | accepté | champ valide et bouton actif | Réussi | `preuves/cloture-navigateur/T022-quantite-1000.png` |
| T023 | Quantité excessive | NAV isolé | 1001 | saisir 1001 | bloqué | `rangeOverflow=true`, bouton désactivé | Réussi | `preuves/cloture-navigateur/T023-quantite-1001.png` |
| T024 | Modèle incompatible | DB isolée | marque A/modèle B | POST commande | erreur 400 | HTTP 400 | Réussi | `correctif-lca-stock-01-closure.integration.test.ts` |
| T025 | Version incompatible | DB isolée | modèle A/version B | POST commande | erreur 400 | HTTP 400 | Réussi | même test MySQL/HTTP ciblé |
| T026 | Marque inactive | DB isolée | marque inactive | POST commande | refus | HTTP 409 | Réussi | même test MySQL/HTTP ciblé |
| T027 | Modèle inactif | DB isolée | modèle inactif | POST commande | refus | HTTP 400, aucune commande créée | Réussi | même test MySQL/HTTP ciblé |
| T028 | Version inactive | DB isolée | version inactive | POST commande | refus | HTTP 400, aucune commande créée | Réussi | même test MySQL/HTTP ciblé |
| T029 | Illustration JPEG | NAV+DB isolés | JPEG valide | créer, relire SQL puis charger l’image en origine unique | stockée | CMD-000138 créée ; fichier optimisé WebP (546 octets), 1 véhicule, restitution Chromium 16×16 | Réussi | `preuves/cloture-navigateur/T0-photo-JPEG.png`, `T029-T031-photos-restituees.png`, lecture SQL ciblée |
| T030 | Illustration PNG | NAV+DB isolés | PNG valide | créer, relire SQL puis charger l’image en origine unique | stockée | CMD-000139 créée ; fichier optimisé WebP (546 octets), 1 véhicule, restitution Chromium 16×16 | Réussi | `preuves/cloture-navigateur/T0-photo-PNG.png`, `T029-T031-photos-restituees.png`, lecture SQL ciblée |
| T031 | Illustration WebP | NAV+DB isolés | WebP valide | créer, relire SQL puis charger l’image en origine unique | stockée | CMD-000140 créée ; fichier WebP (546 octets), 1 véhicule, restitution Chromium 16×16 | Réussi | `preuves/cloture-navigateur/T0-photo-WebP.png`, `T029-T031-photos-restituees.png`, lecture SQL ciblée |
| T032 | Illustration invalide | NAV+DB isolés | fichier texte | sélectionner puis tenter la création | refus | fichier texte rejeté par le formulaire ; aucune marque `Photo invalide` persistée | Réussi | `preuves/cloture-navigateur/T0-photo-invalide.png`, lecture SQL ciblée (compte=0) |
| T033 | Illustration facultative | NAV+DB isolés | aucun fichier | créer | accepté | CMD-000141 créée, 1 véhicule ; chemin, type MIME et taille tous NULL | Réussi | `preuves/cloture-navigateur/T0-photo-absente.png`, lecture SQL ciblée |
| T034 | Idempotence commande | DB isolée | même clé | rejouer POST | même commande | HTTP 201 puis 200, même ID et `duplicate=true` | Réussi | test MySQL/HTTP ciblé de clôture |
| T035 | Clé étrangère | DB isolée | clé agence B | rejouer agence A avec le même utilisateur | conflit | HTTP 409 | Réussi | même test ciblé |
| T036 | Idempotence réception | DB isolée | même clé | rejouer POST | mêmes IDs | HTTP 201 puis 200, listes `vehicleIds` identiques | Réussi | même test ciblé |
| T037 | Clé autre commande | DB isolée | même clé | recevoir autre commande | conflit | HTTP 409 | Réussi | même test ciblé |
| T038 | Reliquat exact | DB isolée | reliquat 2 | recevoir 2 | total | HTTP 201, reliquat 0 | Réussi | même test ciblé |
| T039 | Reliquat dépassé | DB isolée | reliquat 2 | recevoir 3 | conflit | HTTP 409 | Réussi | même test ciblé |
| T040 | Quantité réception zéro | DB isolée | 0 | POST réception | erreur | HTTP 400 | Réussi | même test ciblé |
| T041 | Historique vide | NAV isolé | commande neuve | consulter | message vide | « Aucune réception enregistrée » affiché | Réussi | `preuves/cloture-navigateur/T041-historique-vide.png` |
| T042 | Historique partiel | NAV isolé | réception 1 sur 2 | consulter | une ligne | une ligne avec quantité, responsable et identifiant | Réussi | `preuves/cloture-navigateur/T042-historique-partiel.png` |
| T043 | Historique multiple | NAV isolé | réceptions 1+1 | réceptionner le reliquat puis consulter | deux lignes | deux lignes distinctes | Réussi | `preuves/cloture-navigateur/T043-T046-historique-complet.png` |
| T044 | Responsable | NAV isolé | compte Qualification Stock | consulter | nom du responsable | « Qualification Stock » visible sur les deux lignes | Réussi | `preuves/cloture-navigateur/T043-T046-historique-complet.png` |
| T045 | Horodatage | NAV isolé | deux réceptions | consulter | date/heure locale | date et heure francisées visibles | Réussi | `preuves/cloture-navigateur/T043-T046-historique-complet.png` |
| T046 | IDs véhicules | NAV isolé | deux réceptions | consulter | IDs associés | colonne Véhicules renseignée sur les deux lignes | Réussi | `preuves/cloture-navigateur/T043-T046-historique-complet.png` |
| T047 | Navigation associée | NAV isolé | commande partielle puis totale | cliquer Voir les véhicules | filtre commande | URL `vehicleOrderId=135`, fiches filtrées | Réussi | `preuves/cloture-navigateur/T047-navigation-vehicules-associes.png` |
| T048 | Origine fiche | NAV isolé | véhicule STK-009244 issu de CMD-000137 | ouvrir le détail | lien commande | bloc « Commande d’origine », identifiant #137 et lien catalogue visibles | Réussi | `preuves/cloture-navigateur/T048-origine-fiche.png` |
| T049 | Recherche référence | NAV isolé | `QA-PARTIAL-*` | rechercher | seule commande | une ligne correspondant à la référence | Réussi | `preuves/cloture-navigateur/T049-recherche-reference-partielle.png` |
| T050 | Recherche marque | NAV isolé | `Pagination QA` | rechercher | résultats marque | 100 lignes affichées sur 105, toutes conformes | Réussi | `preuves/cloture-navigateur/T050-recherche-marque.png` |
| T051 | Recherche modèle | NAV isolé | `Modèle pagination` | rechercher | résultats modèle | 100 lignes affichées sur 105, toutes conformes | Réussi | `preuves/cloture-navigateur/T051-recherche-modele.png` |
| T052 | Recherche version | NAV isolé | `Version filtre` | rechercher | commande versionnée | une ligne avec la version attendue | Réussi | `preuves/cloture-navigateur/T052-recherche-version.png` |
| T053 | Recherche sans résultat | NAV isolé | chaîne absente | rechercher | liste vide | « Aucune commande enregistrée » | Réussi | `preuves/cloture-navigateur/T053-recherche-sans-resultat.png` |
| T054 | Filtre marque | NAV isolé | marque Pagination QA | filtrer | seulement cette marque | 105 résultats conformes | Réussi | `preuves/cloture-navigateur/T054-filtre-marque-final.png` |
| T055 | Filtre modèle | NAV isolé | modèle pagination | filtrer | seulement ce modèle | 105 résultats conformes | Réussi | `preuves/cloture-navigateur/T055-filtre-modele.png` |
| T056 | Filtre en commande | NAV isolé | état ordered | filtrer | reçues=0 | 70 lignes toutes « En commande » | Réussi | `preuves/cloture-navigateur/T056-filtre-en-commande.png` |
| T057 | Filtre partiel | NAV isolé | état partiel | filtrer | 0<reçues<total | une ligne 1/2 « Partiellement réceptionnée » | Réussi | `preuves/cloture-navigateur/T057-filtre-partiel.png` |
| T058 | Filtre reçu | NAV isolé | état reçu et combinaison marque/modèle | filtrer | reliquat 0 | 35 lignes toutes « Réceptionnée » | Réussi | `preuves/cloture-navigateur/T058-filtre-recu.png` |
| T059 | Pagination page 1 | NAV isolé | 109 commandes | ouvrir | 10 lignes | 10 lignes, synthèse 1–10/109 | Réussi | `preuves/cloture-navigateur/T059-pagination-10.png` |
| T060 | Pagination page 2 | NAV isolé | taille 100, 109 commandes | page suivante | 9 autres lignes | 9 lignes, aucun doublon avec la page 1 | Réussi | `preuves/cloture-navigateur/T060-pagination-page-2.png` |
| T061 | Tailles de page | NAV isolé | 109 commandes | choisir 10 / 20 / 50 / 100 | quatre tailles et total stable | 10, 20, 50 et 100 lignes ; total 109 stable | Réussi | `preuves/cloture-navigateur/T059-pagination-10.png`, `T061-pagination-20.png`, `T061-pagination-50.png`, `T061-pagination-100.png` |
| T062 | Reset page | NAV isolé | page 2 | changer recherche, filtre et agence simulée par contexte | retour page 1 | recherche et filtre reviennent à 1–100 ; réinitialisation restaurée | Réussi | `preuves/cloture-navigateur/T062-reinitialisation-filtres.png` |
| T063 | KPI total | NAV+HTTP isolés | stock mixte puis commande de 10 | relever les cartes aux quatre étapes | toutes fiches | 126 → 136 → 136 → 136, identique HTTP/UI | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-*.png`, journal `kpi-resume` |
| T064 | KPI physique | NAV+HTTP isolés | commande 10, réceptions 4+6 | relever les cartes | +0, +4, +6 | 47 → 47 → 51 → 57 | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-*.png` |
| T065 | KPI commandé | NAV+HTTP isolés | commande 10, réceptions 4+6 | relever les cartes | +10, -4, -6 | 79 → 89 → 85 → 79 | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-*.png` |
| T066 | KPI disponible | NAV+HTTP isolés | disponibilité initiale 1 | créer et réceptionner 10 | inchangée sans décision commerciale | 1 → 1 → 1 → 1 | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-*.png` |
| T067 | KPI valeur | DB isolée | unité commandée, prix 987 654 321 | lire stats avant/après | non reçue exclue | valeur marchande strictement inchangée | Réussi | test MySQL/HTTP ciblé de clôture |
| T068 | KPI dormant | DB isolée | unité commandée datée de 120 jours | lire stats avant/après | exclue | compteur dormant strictement inchangé | Réussi | même test ciblé |
| T069 | Emplacement | NAV+HTTP isolés | 79 unités commandées | lire emplacements | non reçues exclues | total emplacements 57 contre total fiches 136 | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-reception-plus-6.png` |
| T070 | Non affectés | NAV+HTTP isolés | unités reçues sans lieu | lire filtre | incluses | 57 physiques/non affectées après réception | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-reception-plus-6.png` |
| T071 | Non affectés commande | NAV+HTTP isolés | 79 unités non reçues | lire filtre | exclues | non-affectés reste borné au physique | Réussi | `preuves/cloture-navigateur/T063-T072-KPI2-reception-plus-6.png` |
| T072 | Entrée individuelle | DB isolée | véhicule manuel sans date d’entrée | lire stats avant/après | physique inchangé | compteur physique strictement inchangé | Réussi | test MySQL/HTTP ciblé de clôture |
| T073 | Consultation seule | NAV isolé | `vehicles.view` + `vehicles.catalog.view` AGENCY | ouvrir | lecture sans boutons | données et actions Consulter visibles ; ni Nouvelle commande ni Réceptionner | Réussi | `preuves/cloture-navigateur/T07-RBAC-consultation.png` |
| T074 | Gestion seule | NAV isolé | droits catalogue view/manage AGENCY | ouvrir | lecture et actions | Nouvelle commande, Consulter et Réceptionner visibles | Réussi | `preuves/cloture-navigateur/T07-RBAC-gestion.png` |
| T075 | Aucun droit | NAV isolé | seul `dashboard.view` AGENCY | ouvrir | refus/onglet absent | module stock absent et accès refusé | Réussi | `preuves/cloture-navigateur/T07-RBAC-aucun.png` |
| T076 | Agence active A | NAV isolé | utilisateur A+B | activer Alpha | données A | référence ALPHA visible, BETA absente | Réussi | `preuves/cloture-navigateur/T076-agence-active-A.png` |
| T077 | Agence active B | NAV isolé | utilisateur A+B | basculer officiellement le contexte sur Bêta | données B | référence BETA visible, ALPHA absente | Réussi | `preuves/cloture-navigateur/T077-agence-active-B.png` |
| T078 | Lecture étrangère ID | DB isolée | ID agence B | GET depuis A | 404 | HTTP 404 | Réussi | test MySQL/HTTP ciblé de clôture |
| T079 | Temps réel création | WSS local réel | deux sessions A indépendantes | émettre création agence A | actualisation A | événement `vehicle-orders:changed` reçu par A1 et A2 | Réussi | `preuves/cloture-navigateur/T079-T082-temps-reel.json` |
| T080 | Temps réel réception | WSS local réel | deux sessions A indépendantes | émettre réception agence A | actualisation A | événement reçu par A1 et A2 | Réussi | même journal (`receptionA1/A2=true`) |
| T081 | Temps réel inter-agence | WSS local réel | sessions A1/A2/B1 | événements A | aucune fuite B | aucun événement création/réception reçu par B1 | Réussi | même journal (`leakB=false`) |
| T082 | Reconnexion temps réel | WSS local réel | session A2 coupée | reconnecter puis émettre | données rafraîchies | nouvelle socket A2 rejoint la salle A et reçoit l’événement | Réussi | même journal (`reconnection=true`) |
| T083 | Commande historique | DB isolée | `commercial_model_id` seul | GET liste avec recherche | lisible | HTTP 200, commande historique présente | Réussi | test MySQL/HTTP ciblé de clôture |
| T084 | Profil historique | DB isolée | profil existant | capturer, rejouer bootstrap, comparer | inchangé | version, configuration, prix et devise identiques | Réussi | même test ciblé |
| T085 | Rétroalimentation | DB MySQL 8.4 isolée | ancienne commande | appliquer l’étape DML 138 et contrôler la conservation | refs directes | étape 2 DML appliquée ; montée et conservation validées par le runner réel | Réussi | `preuves/integrations-conditionnelles-finales4/partition-8/journaux/integrations-sans-wss.log` |
| T086 | Rejeu migration | DB isolée | niveau 138 | bootstrap deux fois | aucun changement | niveau 138 aux deux passages, zéro avertissement ; snapshots inchangés | Réussi | même test ciblé, journaux « Résumé migrations » |
| T087 | Installation fraîche | DB MySQL 8.4 jetable | base vide isolée | bootstrap officiel | niveau 138 | migration 138 DDL+DML appliquée, niveau 138, zéro avertissement | Réussi | `preuves/integrations-conditionnelles-finales4/partition-1/journaux/bootstrap-integrations.log` |
| T088 | Définition colonnes | DB isolée | niveau 138 | inspecter `information_schema` | types attendus | `brand_id`, `model_id`, `version_id` = BIGINT NULL | Réussi | même test ciblé |
| T089 | Contraintes références | DB isolée | ID marque inexistant | insertion | refus FK | erreur MySQL `ER_NO_REFERENCED_ROW_2` | Réussi | même test ciblé |
| T090 | Données historiques | DB isolée | commande représentative | snapshot, bootstrap, comparaison | préservées | référence, profil, quantité et clé idempotente identiques | Réussi | même test ciblé |
| T091 | Vue desktop | NAV isolé | 1440 px | parcourir page, filtres, tableau, pagination et modale | lisible | aucun débordement global, modale 512 px centrée | Réussi | `preuves/cloture-navigateur/T09-responsive-desktop-page.png`, `T09-responsive-desktop-modale.png` |
| T092 | Vue tablette | NAV isolé | 1024 px | même parcours | lisible | aucun débordement global, modale contenue | Réussi | `preuves/cloture-navigateur/T09-responsive-tablette-page.png`, `T09-responsive-tablette-modale.png` |
| T093 | Vue mobile | NAV isolé | 390 px | même parcours | utilisable | aucun débordement global ; modale x=16, largeur=358 | Réussi | `preuves/cloture-navigateur/T09-responsive-mobile-page.png`, `T09-responsive-mobile-modale.png` |
| T094 | Libellés français | NAV isolé | trois largeurs et modales | parcourir | français | champs, états, actions, filtres et pagination en français | Réussi | captures responsive et historique |
| T095 | Design existant | NAV isolé | page stock | comparer les trois largeurs | cohérent | composants et charte existants préservés | Réussi | captures responsive |
| T096 | Changement individuel | NAV+HTTP isolés | fiche reçue STK-009244 | passer en démonstration, relire commande, restaurer réceptionné | commande inchangée | statut individuel changé puis restauré ; commande reste 10 reçus / 0 restant | Réussi | `preuves/cloture-navigateur/T096-statut-individuel-demonstration.png`, contrôle HTTP |
| T097 | Transfert agence | DB+HTTP MySQL 8.4 isolés | fiche reçue, agences source/destination | initier, expédier, recevoir et rejouer | règles existantes | transitions 201/200, réception idempotente, historique=3 et mouvements=2 | Réussi | sous-test « clôture CRM Client Stock » dans `preuves/integrations-conditionnelles-finales4/partition-4/journaux/integrations-sans-wss.log` |
| T098 | Fiche A4 | NAV+PDF isolés | STK-009244 | générer par l’action Fiche A4, extraire et rendre les deux pages | PDF valide | application/pdf, 2 pages A4, texte français et rendu sans chevauchement ; glyphe CO2 corrigé | Réussi | `output/pdf/fiche-a4-vehicule-STK-009244.pdf`, rendus Poppler `tmp/pdfs/fiche-a4-STK-009244-final2-*.png` |
| T099 | Build production | API | sources finales | Vite build | succès | succès | Réussi | `/tmp/lca-stock-frontend-build-final` |
| T100 | Immuabilité migrations | API | dépôt courant | vérificateur | succès | 105 vérifiées | Réussi | journal de qualification |
| T101 | Marque/modèle existants | DB | références actives | POST commande | créée | créée | Réussi | `qualification-stock-finale/evolution-lca-01-mysql.tap` |
| T102 | Recherche marque existante | NAV | marque existante | saisir son nom | proposition | proposition observée | Réussi | `recette-nouvelle-commande.png` |
| T103 | Recherche modèle existant | DB | modèle de la marque | lire référentiels | modèle filtré | modèle filtré | Réussi | test MySQL/HTTP final |
| T104 | Nouvelle marque/nouveau modèle | DB+NAV | noms absents | ajouter puis créer | refs+commande | refs+commande | Réussi | test MySQL + `recette-commande-references-libres.png` |
| T105 | Marque existante/nouveau modèle | DB | marque active | POST nom modèle | modèle+commande | modèle+commande | Réussi | test MySQL final |
| T106 | Sans version | DB | version omise | POST | accepté | accepté | Réussi | test MySQL final |
| T107 | Sans photographie | DB+NAV | illustration omise | POST | accepté | accepté | Réussi | test MySQL + capture |
| T108 | Avec photographie | DB | PNG valide | POST | stockée | stockée | Réussi | suite backend conditionnelle |
| T109 | Marque vide | DB | `brandName=''` | POST | 400 | 400 | Réussi | test MySQL final |
| T110 | Modèle vide | DB | `modelName=''` | POST | 400 | 400 | Réussi | test MySQL final |
| T111 | Marque espaces | DB | espaces | POST | 400 | 400 | Réussi | test MySQL final |
| T112 | Modèle espaces | DB | espaces | POST | 400 | 400 | Réussi | test MySQL final |
| T113 | Casse marque | DB | nom en casse différente | POST | réutilisée | réutilisée | Réussi | test MySQL final |
| T114 | Casse modèle | DB | nom en casse différente | POST | réutilisé | réutilisé | Réussi | test MySQL final |
| T115 | Espaces superflus | DB | espaces internes/externes | POST | normalisés | normalisés | Réussi | test MySQL final |
| T116 | Même modèle, deux marques | DB | deux marques | créer | deux modèles distincts | distincts | Réussi | test MySQL final |
| T117 | Changement marque | UI | modèle sélectionné | changer marque | modèle/version vidés | contrat UI vérifié | Réussi | behavior frontend |
| T118 | Modèle incompatible | DB | IDs croisés | POST | 400 | 400 | Réussi | test MySQL final |
| T119 | Marque inactive | DB | marque inactive | POST | refus français | refus français | Réussi | test MySQL final |
| T120 | Modèle inactif | DB | modèle inactif | POST | refus français | refus français | Réussi | test MySQL final |
| T121 | Double soumission | DB | même clé | deux POST | une commande | une commande | Réussi | test MySQL final |
| T122 | Concurrence marque | DB | même nom simultané | deux POST | une référence | une référence | Réussi | test MySQL final |
| T123 | Concurrence modèle | DB | même couple simultané | deux POST | un modèle | un modèle | Réussi | test MySQL final |
| T124 | Annulation sans orpheline | NAV+DB isolés | marque et modèle inédits, quantité 2 | saisir et confirmer les deux références, annuler, rouvrir, rechercher puis interroger MySQL | aucune marque, aucun modèle, aucune commande, aucun véhicule | référence absente après réouverture ; compteurs MySQL marques=0, modèles=0, commandes=0, véhicules=0 | Réussi | `preuves/T124-formulaire-renseigne.png`, `preuves/T124-reouverture-apres-annulation.png`, journal d'exécution du 28 novembre 2026 |
| T125 | Rollback commande | DB | version incompatible après refs | POST | aucune donnée partielle | aucune donnée partielle | Réussi | test MySQL final |
| T126 | Persistance après actualisation | NAV | refs créées | actualiser | retrouvées | retrouvées à l'écran | Réussi | `recette-commande-references-libres.png` |
| T127 | Réutilisation nouvelle commande | DB | refs créées | second POST IDs | réutilisées | réutilisées | Réussi | test MySQL final |
| T128 | Référentiels existants | DB | refs créées | requêtes brands/models | présentes | présentes | Réussi | test MySQL final |
| T129 | Refus sans permission | API | droit view seul | POST | 403 | 403 | Réussi | suites RBAC conditionnelles |
| T130 | Autorisation/inter-agences | DB | manage agence A/B | créer/lire | isolation | isolation | Réussi | test MySQL + suites RBAC |

## État réel

Les 130 cas sont adossés à des preuves conservées et individualisées. Décompte final : **130 réussis, 0 non exécuté, 0 échoué, 0 réserve ouverte**. T124 possède sa preuve visuelle et les scénarios multisessions possèdent des contextes Chromium ou sockets indépendants selon leur nature.
