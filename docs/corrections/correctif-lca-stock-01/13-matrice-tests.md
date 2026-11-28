# Matrice de 100 cas individualisés

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
| T017 | Marque obligatoire | NAV | marque vide | soumettre | bloqué | Non exécuté | À exécuter | capture attendue |
| T018 | Modèle obligatoire | NAV | modèle vide | soumettre | bloqué | Non exécuté | À exécuter | capture attendue |
| T019 | Quantité zéro | NAV | 0 | soumettre | bloqué | Non exécuté | À exécuter | capture attendue |
| T020 | Quantité négative | NAV | -1 | soumettre | bloqué | Non exécuté | À exécuter | capture attendue |
| T021 | Quantité décimale | NAV | 1,5 | soumettre | bloqué | Non exécuté | À exécuter | capture attendue |
| T022 | Quantité maximale | NAV | 1000 | soumettre | accepté | Non exécuté | À exécuter | capture attendue |
| T023 | Quantité excessive | NAV | 1001 | soumettre | bloqué | Non exécuté | À exécuter | capture attendue |
| T024 | Modèle incompatible | DB | marque A/modèle B | POST commande | erreur 400 | Non exécuté | À exécuter | réponse HTTP attendue |
| T025 | Version incompatible | DB | modèle A/version B | POST commande | erreur 400 | Non exécuté | À exécuter | réponse HTTP attendue |
| T026 | Marque inactive | DB | marque inactive | POST commande | refus | Non exécuté | À exécuter | réponse HTTP attendue |
| T027 | Modèle inactif | DB | modèle inactif | POST commande | refus | Non exécuté | À exécuter | réponse HTTP attendue |
| T028 | Version inactive | DB | version inactive | POST commande | refus | Non exécuté | À exécuter | réponse HTTP attendue |
| T029 | Illustration JPEG | NAV | JPEG valide | créer | stockée | Non exécuté | À exécuter | capture/SQL attendus |
| T030 | Illustration PNG | NAV | PNG valide | créer | stockée | Non exécuté | À exécuter | capture/SQL attendus |
| T031 | Illustration WebP | NAV | WebP valide | créer | stockée | Non exécuté | À exécuter | capture/SQL attendus |
| T032 | Illustration invalide | NAV | fichier texte | créer | refus | Non exécuté | À exécuter | capture attendue |
| T033 | Illustration facultative | NAV | aucun fichier | créer | accepté | Non exécuté | À exécuter | capture attendue |
| T034 | Idempotence commande | DB | même clé | rejouer POST | même commande | Non exécuté | À exécuter | réponse/SQL attendus |
| T035 | Clé étrangère | DB | clé agence B | rejouer agence A | conflit | Non exécuté | À exécuter | réponse attendue |
| T036 | Idempotence réception | DB | même clé | rejouer POST | mêmes IDs | Non exécuté | À exécuter | réponse/SQL attendus |
| T037 | Clé autre commande | DB | même clé | recevoir autre commande | conflit | Non exécuté | À exécuter | réponse attendue |
| T038 | Reliquat exact | DB | reliquat 3 | recevoir 3 | total | Non exécuté | À exécuter | SQL attendu |
| T039 | Reliquat dépassé | DB | reliquat 3 | recevoir 4 | conflit | Non exécuté | À exécuter | réponse attendue |
| T040 | Quantité réception zéro | DB | 0 | POST réception | erreur | Non exécuté | À exécuter | réponse attendue |
| T041 | Historique vide | NAV | commande neuve | consulter | message vide | Non exécuté | À exécuter | capture attendue |
| T042 | Historique partiel | NAV | réception 4 | consulter | ligne 4 | Non exécuté | À exécuter | capture attendue |
| T043 | Historique multiple | NAV | réceptions 4+6 | consulter | deux lignes | Non exécuté | À exécuter | capture attendue |
| T044 | Responsable | NAV | réception utilisateur U | consulter | nom U | Non exécuté | À exécuter | capture attendue |
| T045 | Horodatage | NAV | réception | consulter | date/heure locale | Non exécuté | À exécuter | capture attendue |
| T046 | IDs véhicules | NAV | réception 4 | consulter | quatre IDs | Non exécuté | À exécuter | capture attendue |
| T047 | Navigation associée | NAV | commande | voir véhicules | filtre commande | Non exécuté | À exécuter | capture attendue |
| T048 | Origine fiche | NAV | véhicule commandé | détail | lien commande | Non exécuté | À exécuter | capture attendue |
| T049 | Recherche référence | NAV | référence exacte | rechercher | seule commande | Non exécuté | À exécuter | capture attendue |
| T050 | Recherche marque | NAV | texte marque | rechercher | résultats marque | Non exécuté | À exécuter | capture attendue |
| T051 | Recherche modèle | NAV | texte modèle | rechercher | résultats modèle | Non exécuté | À exécuter | capture attendue |
| T052 | Recherche version | NAV | texte version | rechercher | résultats version | Non exécuté | À exécuter | capture attendue |
| T053 | Recherche sans résultat | NAV | chaîne absente | rechercher | liste vide | Non exécuté | À exécuter | capture attendue |
| T054 | Filtre marque | NAV | marque A | filtrer | seulement A | Non exécuté | À exécuter | capture attendue |
| T055 | Filtre modèle | NAV | modèle A | filtrer | seulement A | Non exécuté | À exécuter | capture attendue |
| T056 | Filtre en commande | NAV | état ordered | filtrer | reçues=0 | Non exécuté | À exécuter | capture attendue |
| T057 | Filtre partiel | NAV | état partiel | filtrer | 0<reçues<total | Non exécuté | À exécuter | capture attendue |
| T058 | Filtre reçu | NAV | état reçu | filtrer | reliquat 0 | Non exécuté | À exécuter | capture attendue |
| T059 | Pagination page 1 | NAV | >10 commandes | ouvrir | 10 lignes | Non exécuté | À exécuter | capture attendue |
| T060 | Pagination page 2 | NAV | >10 commandes | page suivante | autres lignes | Non exécuté | À exécuter | capture attendue |
| T061 | Taille page | NAV | 25 | changer taille | 25 lignes max | Non exécuté | À exécuter | capture attendue |
| T062 | Reset page | NAV | page 2 | changer filtre | retour page 1 | Non exécuté | À exécuter | capture attendue |
| T063 | KPI total | DB | stock mixte | lire stats | toutes fiches | Non exécuté | À exécuter | réponse SQL/HTTP attendue |
| T064 | KPI physique | DB | 4 reçues/6 attente | lire stats | +4 physique | Non exécuté | À exécuter | réponse attendue |
| T065 | KPI commandé | DB | 4 reçues/6 attente | lire stats | 6 commandées | Non exécuté | À exécuter | réponse attendue |
| T066 | KPI disponible | DB | statuts mixtes | lire stats | disponibilité réelle | Non exécuté | À exécuter | réponse attendue |
| T067 | KPI valeur | DB | unités non reçues | lire stats | non reçues exclues | Non exécuté | À exécuter | réponse attendue |
| T068 | KPI dormant | DB | unité non reçue ancienne | lire stats | exclue | Non exécuté | À exécuter | réponse attendue |
| T069 | Emplacement | DB | unité non reçue | lire emplacements | exclue | Non exécuté | À exécuter | réponse attendue |
| T070 | Non affectés | DB | unité reçue sans lieu | filtrer | incluse | Non exécuté | À exécuter | réponse attendue |
| T071 | Non affectés commande | DB | unité non reçue | filtrer | exclue | Non exécuté | À exécuter | réponse attendue |
| T072 | Entrée individuelle | DB | véhicule manuel | lire stats | physique inchangé | Non exécuté | À exécuter | réponse attendue |
| T073 | Consultation seule | NAV | droit view | ouvrir | lecture sans boutons | Non exécuté | À exécuter | capture attendue |
| T074 | Gestion seule | NAV | droit manage | ouvrir | lecture et actions | Non exécuté | À exécuter | capture attendue |
| T075 | Aucun droit | NAV | aucun droit | ouvrir | refus/onglet absent | Non exécuté | À exécuter | capture attendue |
| T076 | Agence active A | NAV | utilisateur A+B | sélectionner A | données A | Non exécuté | À exécuter | capture attendue |
| T077 | Agence active B | NAV | utilisateur A+B | sélectionner B | données B | Non exécuté | À exécuter | capture attendue |
| T078 | Lecture étrangère ID | DB | ID agence B | GET depuis A | 404 | Non exécuté | À exécuter | réponse attendue |
| T079 | Temps réel création | NAV | deux sessions A | créer | actualisation A | Non exécuté | À exécuter | vidéo attendue |
| T080 | Temps réel réception | NAV | deux sessions A | recevoir | actualisation A | Non exécuté | À exécuter | vidéo attendue |
| T081 | Temps réel inter-agence | NAV | sessions A/B | créer A | aucune fuite B | Non exécuté | À exécuter | vidéo attendue |
| T082 | Reconnexion temps réel | NAV | socket coupée | reconnecter | données rafraîchies | Non exécuté | À exécuter | journal attendu |
| T083 | Commande historique | DB | commercial_model_id seul | GET liste | lisible | Non exécuté | À exécuter | réponse attendue |
| T084 | Profil historique | DB | profil existant | GET catalogue | inchangé | Non exécuté | À exécuter | réponse attendue |
| T085 | Rétroalimentation | DB | ancienne commande | migration 138 | refs directes | Non exécuté | À exécuter | SQL attendu |
| T086 | Rejeu migration | DB | niveau 138 | bootstrap | aucun changement | Non exécuté | À exécuter | journal attendu |
| T087 | Installation fraîche | DB | base vide isolée | bootstrap | niveau 138 | Non exécuté | À exécuter | journal attendu |
| T088 | Définition colonnes | DB | niveau 138 | inspecter schéma | types attendus | Non exécuté | À exécuter | SQL attendu |
| T089 | Contraintes références | DB | ID inexistant | insertion | refus FK | Non exécuté | À exécuter | erreur SQL attendue |
| T090 | Données historiques | DB | copie représentative | migrer | préservées | Non exécuté | À exécuter | comparaison attendue |
| T091 | Vue desktop | NAV | 1440 px | parcourir | lisible | Non exécuté | À exécuter | capture attendue |
| T092 | Vue tablette | NAV | 1024 px | parcourir | lisible | Non exécuté | À exécuter | capture attendue |
| T093 | Vue mobile | NAV | 390 px | parcourir | utilisable | Non exécuté | À exécuter | capture attendue |
| T094 | Libellés français | NAV | toutes modales | parcourir | français | Non exécuté | À exécuter | captures attendues |
| T095 | Design existant | NAV | page stock | comparer | cohérent | Non exécuté | À exécuter | captures attendues |
| T096 | Changement individuel | NAV | fiche reçue | modifier statut | commande inchangée | Non exécuté | À exécuter | capture/SQL attendus |
| T097 | Transfert agence | DB | fiche reçue | transférer | règles existantes | Non exécuté | À exécuter | réponse attendue |
| T098 | Fiche A4 | NAV | véhicule complété | générer | PDF valide | Non exécuté | À exécuter | PDF attendu |
| T099 | Build production | API | sources finales | Vite build | succès | succès | Réussi | `/tmp/lca-stock-frontend-build-final` |
| T100 | Immuabilité migrations | API | dépôt courant | vérificateur | succès | 105 vérifiées | Réussi | journal de qualification |
