# RAPPORT MET-01 — Recette métier Commercial

Date d'exécution : 20 octobre 2026
Environnement : Docker local `lca` — `http://127.0.0.1` — MySQL 8.4 `concession_erp`
Verdict : **NON VALIDÉ**

## 1. Résumé exécutif

La recette a réellement utilisé un compte Commercial dédié, créé et habilité par les mécanismes officiels de l'ERP. La connexion, la navigation autorisée, les refus RBAC, la création de cinq prospects, l'ajout d'une activité, la qualification et la perte motivée ont été vérifiés dans le navigateur puis corroborés par des lectures MySQL.

La création d'un rendez-vous n'a toutefois pas pu être menée à terme : le champ natif `datetime-local` apparaissait renseigné visuellement, mais l'événement attendu par le composant React n'était pas pris en compte par l'automatisation du navigateur intégré. Une tentative de saisie segmentée a fait tomber l'onglet contrôlé. Aucun contournement par API, SQL ou session fabriquée n'a été utilisé.

Cette réserve empêche d'exécuter honnêtement les parcours essentiels situés en aval : rendez-vous, essai, proposition, conversion client et préparation de vente. La couverture métier est donc insuffisante pour un verdict « Validé avec réserves », même si la non-régression automatisée est entièrement conforme.

## 2. Environnement et prérequis

- `frontend` : running, healthy, exposé sur le port HTTP 80.
- `backend` : running, healthy, port interne 3001.
- `mysql` : running, healthy, volume persistant conservé.
- Projet Compose : `lca`, fichier `docker-compose.yml`.
- Migration courante : `101_provider_remuneration_finance.sql`, version 101, confirmée dans `schema_migrations`.
- Aucun volume supprimé, aucune base réinitialisée, aucune migration appliquée.
- Aucun accès VPS/production et aucun service externe utilisé.

## 3. Identité, rôle et permissions

Compte fictif authentifié par le parcours officiel :

- identité : `Commercial MET01` ;
- compte : `commercial.met01@example.com` ;
- agence : Brazzaville ;
- rôle : `Commercial MET01` (`COMMERCIAL_MET01`) ;
- utilisateur MySQL : identifiant 15 ;
- rôle MySQL : identifiant 13 ;
- 29 permissions persistées ;
- aucun scope `GLOBAL` attribué.

Le secret de connexion n'est ni reproduit ni stocké dans ce rapport. La rotation du mot de passe a été effectuée par l'interface officielle. Les permissions couvrent uniquement les besoins commerciaux (CRM, clients, showroom, véhicules en lecture, ventes, devis, notifications et reporting) avec des scopes `OWN`, `AGENCY` ou `CONCESSION` selon la ressource.

Modules visibles : Tableau de bord, Modules, CRM, Clients, Véhicules, Ventes, Showroom, Reporting, Notifications. Les modules Utilisateurs, RH, Trésorerie et Paramètres sensibles ne sont pas proposés dans le menu.

## 4. Matrice de couverture

| ID | Scénario | Acteur / préconditions | Résultat obtenu et preuve | Statut |
|---|---|---|---|---|
| MET01-ENV-01 | Santé Docker et migration | Environnement local | 3 services healthy ; migration 101 lue dans MySQL | PASS |
| MET01-AUTH-01 | Connexion Commercial | Compte officiel actif | Connexion réussie, session commerciale réelle | PASS |
| MET01-NAV-01 | Navigation autorisée | 29 permissions dynamiques | CRM, Clients, Véhicules, Ventes, Showroom, Reporting et Notifications visibles | PASS |
| MET01-RBAC-01 | Route Utilisateurs interdite | Session Commercial | « Accès refusé — Permission insuffisante » | PASS |
| MET01-RBAC-02 | Route RH interdite | Session Commercial | Refus avant appel métier | PASS |
| MET01-RBAC-03 | Route Trésorerie interdite | Session Commercial | Refus avant appel métier | PASS |
| MET01-CRM-01 | Création de cinq prospects | `crm.prospect.create` AGENCY | Cinq prospects visibles et persistés, IDs 9 à 13 | PASS |
| MET01-CRM-02 | Validation formulaire vide/invalide | Formulaire prospect | Pas de preuve navigateur durable conservée | NON EXÉCUTÉ |
| MET01-CRM-03 | Tentative de doublon | Prospect existant | Non exécutée afin de ne pas créer un doublon sans pouvoir achever la vérification | NON EXÉCUTÉ |
| MET01-CRM-04 | Modification puis annulation | Prospect existant | Non exécutée | NON EXÉCUTÉ |
| MET01-QUAL-01 | Activité d'appel | Prospect Alpha | Activité `call/completed` persistée | PASS |
| MET01-QUAL-02 | Nouveau → Contacté → Qualifié | Prospect Alpha | Statut `qualified`, historique des deux transitions | PASS |
| MET01-QUAL-03 | Perte avec motif obligatoire | Prospect Delta | Statut `lost`, motif historisé | PASS |
| MET01-AFFECT-01 | Affectation OWN | Création par Commercial | Les cinq prospects sont affectés à l'utilisateur 15 | PASS |
| MET01-RDV-01 | Création rendez-vous | Prospect Alpha qualifié | Contrôle `datetime-local` non pilotable de façon fiable ; bouton resté désactivé | BLOQUÉ |
| MET01-RDV-02 | Modification/annulation/réalisation | Rendez-vous requis | Précondition non obtenue | NON EXÉCUTÉ |
| MET01-ESSAI-01 | Essai sur véhicule disponible | Rendez-vous actif requis | Précondition non obtenue | NON EXÉCUTÉ |
| MET01-STOCK-01 | Consultation stock | `vehicles.view` AGENCY | Trois véhicules disponibles affichés avec prix | PASS |
| MET01-STOCK-02 | Absence de modification stock | Pas de permission technique | Aucune action de modification proposée | PASS |
| MET01-OFFRE-01 | Création proposition/devis | Parcours CRM avancé requis | Précondition non obtenue | NON EXÉCUTÉ |
| MET01-CLIENT-01 | Conversion en client | Devis/opportunité éligible requis | Précondition non obtenue | NON EXÉCUTÉ |
| MET01-VENTE-01 | Préparation de vente | Client, devis et véhicule requis | Précondition non obtenue | NON EXÉCUTÉ |
| MET01-NOTIF-01 | Notifications de workflow | Rendez-vous/essai/conversion requis | Générateurs principaux non atteints | NON EXÉCUTÉ |
| MET01-REPORT-01 | Indicateurs commerciaux | Mutations complètes attendues | Comparaison exhaustive UI/MySQL non réalisée | NON EXÉCUTÉ |
| MET01-DB-01 | Corroboration MySQL | Lecture seule | Prospects, responsables, statuts et activités concordants | PASS |

Décompte : **25 scénarios**, **13 PASS**, **0 FAIL**, **1 BLOQUÉ**, **11 NON EXÉCUTÉS**, **0 NON APPLICABLE**.

## 5. Prospects et qualification

Les cinq prospects ont été créés par l'interface officielle avec des identités fictives :

| ID DB | Prospect | Email fictif | Source | Priorité | Statut final |
|---:|---|---|---|---|---|
| 9 | MET01 Prospect Alpha | `met01.alpha@example.test` | Passage Showroom | high | qualified |
| 10 | MET01 Prospect Bravo | `met01.bravo@example.test` | Web | medium | new |
| 11 | MET01 Prospect Charlie | `met01.charlie@example.test` | Téléphone | urgent | new |
| 12 | MET01 Prospect Delta | `met01.delta@example.test` | Parrainage | low | lost |
| 13 | MET01 Prospect Echo | `met01.echo@example.test` | Campagne Marketing | high | new |

Le préfixe saisi dans les champs identité est `MET01` suivi du libellé, et non la forme stricte `MET01-`. Cette déviation de nommage est documentaire ; les emails dédiés rendent le jeu de données identifiable sans ambiguïté.

Pour Alpha, l'appel « besoin confirmé, budget validé » est persisté, suivi des notes de transition `new → contacted` et `contacted → qualified`. Pour Delta, la transition `new → lost` contient le motif « budget reporté par le prospect ». Les colonnes UI et les lignes SQL concordent après actualisation.

## 6. Affectation et scopes

Les cinq prospects ont `assigned_user_id=15` et `created_by=15`. Le Commercial opère donc sur son propre portefeuille conformément au scope `OWN`. Aucun test multi-commercial réel n'a été achevé ; l'absence de fuite vers un second portefeuille reste à valider lors de la reprise.

## 7. Rendez-vous et essais

La modale de rendez-vous s'ouvre depuis le prospect qualifié. Le champ `datetime-local` est toutefois un contrôle segmenté natif. L'écriture automatisée modifiait sa valeur DOM visible sans produire l'état React nécessaire ; le bouton restait désactivé. La saisie segmentée native a ensuite provoqué la perte de l'onglet d'automatisation.

Les tests automatisés démontrent que le code couvre la saisie réelle du rendez-vous (`RDV-01/02/05/06`) et les préconditions d'essai, mais ils ne remplacent pas la preuve navigateur requise par MET-01. Aucun rendez-vous ni essai n'a été inséré par un autre canal.

## 8. Stock véhicules

La liste commerciale affichait trois véhicules disponibles, notamment des véhicules Mercedes et Toyota, avec des prix de 24, 25 et 45 millions XAF. La consultation et les filtres étaient visibles. Aucune commande de modification technique du stock n'était proposée au rôle Commercial.

## 9. Propositions, conversion et vente

Ces parcours dépendent du rendez-vous et de l'essai réels dans le workflow autoritaire. Ils n'ont pas été forcés. Aucune proposition, aucun nouveau client, aucune vente, facture, recette financière ou livraison n'a été créé pour contourner la précondition manquante.

La distinction « Confirmer la commande » / « Confirmer la vente » n'a donc pas reçu de preuve navigateur MET-01 et reste à reprendre.

## 10. Notifications et reporting

Les droits de consultation sont présents. Les événements producteurs attendus en aval n'ayant pas été exécutés, la vérification complète des destinataires, compteurs, statuts lu/non lu et KPI commerciaux n'a pas pu être menée. Aucun message externe réel n'a été envoyé.

## 11. Contrôles MySQL

Toutes les commandes MySQL ont été strictement en lecture. Les contrôles établissent :

- migration 101 appliquée avec checksum enregistré ;
- rôle Commercial MET01 associé à 29 permissions ;
- cinq prospects IDs 9–13, tous créés et affectés par l'utilisateur 15 ;
- Alpha au statut `qualified` ;
- Delta au statut `lost` ;
- quatre activités cohérentes : un appel et trois notes de transition ;
- aucun `customer_id` créé pour ces prospects ;
- aucune correction directe ou écriture SQL.

## 12. Anomalies, corrections et risques

### Réserve MET01-R01 — pilotage du champ rendez-vous

- Gravité applicative démontrée : **non déterminée**.
- Gravité pour la campagne : **bloquante**.
- Classement : réserve d'outillage navigateur, pas anomalie produit confirmée.
- Conséquence : impossibilité de qualifier les workflows critiques en aval.
- Correction de code : aucune, faute de reproduction démontrée dans un navigateur manuel.

Anomalies produit ouvertes : **P0 0, P1 0, P2 0**.
Réserves de recette : **1 bloquante**.

Risques résiduels : rendez-vous réels, conflits de créneaux, essais, indisponibilité véhicule, devis, remise, conversion client, préparation de vente, notifications et KPI n'ont pas de preuve navigateur complète dans cette campagne.

## 13. Non-régression

| Contrôle | Résultat |
|---|---|
| Frontend — suite complète | 959 PASS, 0 FAIL, 0 SKIP — conforme à la référence |
| Backend — suite complète | 1 925 PASS, 0 FAIL, 91 SKIP conditionnels — conforme à la référence |
| Frontend — lint TypeScript | PASS |
| Backend — lint TypeScript | PASS |
| Frontend — build Vite | PASS, 2 516 modules transformés |
| Backend — build TypeScript | PASS |
| `git diff --check` avant rapport | PASS |

Les suites complètes incluent les tests ciblés CRM, Clients, Ventes, Stock véhicules, Notifications, RBAC, rendez-vous et essais. Aucun test n'a été supprimé ou masqué.

## 14. Verdict et suite recommandée

**MET-01 : NON VALIDÉ.**

Motif : le workflow rendez-vous est essentiel et les workflows en aval n'ont pas été exécutés dans le navigateur. Les succès techniques et les 13 scénarios PASS ne compensent pas cette couverture insuffisante.

Reprise recommandée avant MET-02 :

1. reprendre MET01-RDV-01 dans le navigateur par une saisie manuelle du créneau, sans communiquer de secret ;
2. enchaîner rendez-vous, essai, devis, conversion client et préparation de vente sans contourner les préconditions ;
3. vérifier notifications et KPI après chaque mutation ;
4. exécuter les cas négatifs de formulaire, doublon, annulation et séparation de portefeuille ;
5. refaire les lectures MySQL de concordance et actualiser ce rapport.

Aucun travail MET-02 n'a été commencé.

## 15. Addendum MET-01.1 — 20 octobre 2026

La reprise ciblée est documentée dans `docs/RAPPORT-MET01-1-REPRISE-COMMERCIAL.md`.

Le blocage du champ `datetime-local` a été levé par une interaction clavier native déclenchant réellement l'état React. Le rendez-vous, l'essai et son retour, le devis, la négociation, la conversion client et la fiche 360° sont désormais démontrés dans le navigateur.

La préparation de vente atteint l'écran final mais reste BLOQUÉE : le devis n'a pas été émis et son archive officielle est absente. Le Commercial MET01 ne possède pas `quotations.validate`; aucun droit n'a été ajouté et aucune vente n'a été forcée. La base confirme zéro vente.

Décompte consolidé : **25 scénarios, 21 PASS, 0 FAIL, 1 BLOQUÉ, 3 NON EXÉCUTÉS**. Une anomalie P2 d'affichage horaire a également été constatée : l'instant UTC stocké est correct, mais CRM/Notifications affichent 09:30 au lieu de 10:30 Africa/Brazzaville.

Verdict consolidé après MET-01.1 : **NON VALIDÉ**. MET-02 n'a pas été commencé.
