# Progression finale du RBAC multi-agences

Date d'ouverture : 10 novembre 2026. Ce journal est la reprise persistante de la mission globale. Il ne remplace pas les rapports détaillés des phases précédentes.

## État de référence

- Dépôt conservé sans commit, push ni déploiement.
- Frontend, tests frontend, navigateur et E2E hors périmètre.
- Fondations 2C-2A validées : contexte d'agence actif serveur, scopes métier `OWN/AGENCY`, stratégies de ressources, fraîcheur transactionnelle, autorisation centrale explicite et contrat inter-agences.
- Lot 1 validé : 6 endpoints Notifications.
- Lot 2 validé : 16 endpoints Administration/Habilitations.
- Réconciliation finale : 661 déclarations HTTP réelles dans 47 fichiers, plus `/api/health`, soit 662 endpoints actifs. Les 664 historiques sont tous expliqués : deux anciennes collisions GED (`PATCH /document-marks/stamps/:id/status` et `POST /document-marks/stamps/:id/version`) ont été supprimées.
- Inventaire exhaustif initial : `docs/RBAC-FINAL-INVENTAIRE-ENDPOINTS.md`.

## Graphe de dépendances de migration

```text
Socle/session/RBAC
├── Notifications et fonctions personnelles
├── Administration utilisateurs/rôles/agences
├── CRM ──> Clients ──> Showroom ──> Devis/Proformas
│                                      └──> Ventes ──> Livraisons ──> Facturation/Paiements
├── Véhicules/stock ───────────────────────────┘
├── Pièces/logistique ──> Atelier/SAV ──> Facturation/Trésorerie
├── RH/Prestataires ────────────────────> Trésorerie/Comptabilité
├── GED/Marques documentaires (dérive l'agence de la ressource parente)
├── Paramètres/Référentiels (bloqués si gouvernance centrale/locale indécise)
└── Reporting/Audit (après stabilisation des producteurs)
```

## Journal des groupes

| Groupe | Domaine | État | Résultat / prochain contrôle |
|---:|---|---|---|
| 0 | Inventaire actualisé et dépendances | Terminé | 664 endpoints historiques réconciliés avec 662 endpoints actifs et 2 collisions supprimées ; aucun endpoint actif ne reste « À auditer » |
| 1 | Utilisateurs / administration restants | Implémenté, validation globale restante | Connexion, refresh, profil et CRUD relisent l’agence active ; écritures fraîches ; rôles métier locaux ; `user_roles` nettoyé des rôles non système |
| 2 | CRM | Validé | 12 routes OWN/AGENCY ; agence immuable ; écritures fraîches et verrouillées ; Socket borné ; tests backend et MySQL 8.4 isolé réussis |
| 3 | Showroom | Implémenté, validation MySQL restante | 18 routes OWN/AGENCY ; écritures fraîches et verrouillées ; affectations par agence ; provenance CRM directe ; anciens tests CONCESSION/GLOBAL à réaligner et recette MySQL à exécuter |
| 4 | Clients / devis / proformas | En cours avancé | 9 routes Clients, 11 routes Devis et 6 routes Proformas migrées ; Client 360° reste différé jusqu'aux producteurs |
| 5 | Véhicules / stock / transferts | Implémenté avec réserve inter-agences | 22 routes gardées ; stock strictement AGENCY ; écritures fraîches/verrouillées ; transfert inter-agences fermé faute de règle destination explicite |
| 6 | Ventes | Implémenté, recette MySQL restante | 10 routes OWN/AGENCY ; écritures fraîches et verrouillées ; affectations commerciales locales |
| 7 | Livraison | Implémenté, validation globale restante | Routeur principal, services et configuration checklist migrés ; écritures fraîches ; configuration centrale conservatrice faute de gouvernance validée |
| 8 | Facturation / paiements | Implémenté, validation globale restante | Factures, paiements, avoirs et retours post-livraison bornés à l’agence active ; écritures fraîches et trésorerie migrée |
| 9 | Atelier / SAV | Implémenté, validation finale restante | Écritures fraîches ; candidats opérationnels issus des affectations locales ; anciens contrats statiques à réaligner |
| 10 | Pièces | Implémenté, validation finale restante | Écritures fraîches ; SoD facture fournisseur ; transfert inter-agences fermé sans autorité destination |
| 11 | RH / prestataires | Implémenté, validation finale restante | Huit routeurs sécurisés, tests ciblés réussis ; catalogues communs à classer avec les paramètres |
| 12 | Comptabilité / trésorerie | Implémenté, recette MySQL restante | Toutes les transactions Treasury et rapprochement conservent l’autorisation fraîche jusqu’au commit ; tests ciblés réussis |
| 13 | GED / documents / marques | Implémenté avec réserve collisions | Documents et marques écrits sous autorisation fraîche ; gouvernance des catalogues centralisée par défaut ; routes de cycle de cachet à réconcilier |
| 14 | Paramètres / référentiels | Implémenté, tests ciblés restants | Exploitation liée à l’agence active ; identité concession, agences, constructeurs, documents et taux de base réservés au vrai super-administrateur |
| 15 | Reporting / audit | Implémenté, validation globale restante | Reporting, exports, dashboard et activité utilisent l’agence active ou une autorisation centrale explicite |
| 16 | Notifications / technique / Socket.IO | Implémenté, validation globale restante | Sessions Socket relues en base, rooms d’agence active, révocation et changement RBAC déconnectent les sockets |

## Décisions métier ouvertes à ne pas inventer

1. Gouvernance centrale ou surcharge par agence des paramètres fiscaux, constructeurs, types RH, checklists, cachets et tarifs.
2. Autorité requise côté destination pour chaque famille de transfert.
3. Ensemble d'agences autorisé pour le reporting transversal.
4. Définition OWN pour les ressources sans propriétaire métier établi.
5. Délégation éventuelle des capacités centrales hors véritable `SUPER_ADMIN`.

## Passage CRM — état intermédiaire

- Migration additive 116 : `leads.agency_id`, index, clé étrangère et reprise déterministe de la provenance historique depuis l'affectataire puis le créateur.
- Les 12 routes CRM utilisent désormais les gardes métier `OWN/AGENCY`; `GLOBAL/CONCESSION` ne sont plus acceptés dans le contexte migré.
- OWN reste défini par `leads.assigned_user_id`; AGENCY par `leads.agency_id` immuable. Un filtre `agencyId` client n'élargit pas un contexte migré.
- Les commerciaux éligibles sont résolus depuis `user_agencies` et `user_agency_roles` de l'agence active, plus depuis `users.agency_id` et `user_roles`.
- Les hints Socket.IO sont filtrés par affectation d'agence active et envoyés uniquement aux sockets dont le contexte actif correspond.
- Lint, build et `git diff --check` réussissent.
- Toutes les écritures utilisent `withCurrentAgencyAuthorization`; le prospect et son opportunité sont rechargés avec `FOR UPDATE`, l'agence et OWN sont revalidés avant mutation, et les permissions supplémentaires de perte, affectation ou forçage de conflit sont contrôlées dans le contexte frais.
- Tests backend CRM ciblés : réussis. Scénario HTTP/MySQL 8.4 isolé : réussi, couvrant création, lecture, activité, changement d'étape, séparation A/B, changement d'agence active et retrait de rôle. Le conteneur jetable `tmpfs` a été arrêté et supprimé.
- Groupe **validé**. Aucun transfert d'agence de prospect n'est activé implicitement.

## Passage Clients et Showroom — état de reprise

- Clients : 9 routes CRUD/contacts migrées vers le contexte d'agence actif. OWN combine agence et responsable affecté ; les écritures rechargent et verrouillent le client. Client 360° reste volontairement différé jusqu'à la migration de tous ses producteurs.
- Showroom : les 18 routes utilisent les gardes métier `OWN/AGENCY`; les branches historiques `GLOBAL/CONCESSION` ont été retirées. Les listes, détections, essais, créations, affectations, statuts et conversions sont bornés à l'agence active et à la propriété métier.
- Les écritures Showroom revalident la session, la version du contexte, l'affectation d'agence et les permissions dans la transaction. Les visites ou essais sont rechargés avec `FOR UPDATE` avant mutation.
- Les candidats commerciaux proviennent de `user_agencies` et `user_agency_roles`, avec rôle local actif, non système et permission commerciale OWN/AGENCY.
- Les prospects reliés ou créés depuis Showroom utilisent `leads.agency_id`; aucune agence n'est reconstruite depuis `users.agency_id`.
- Preuves statiques dédiées : `test/customer-agency-rbac.test.ts` et `test/showroom-agency-rbac.test.ts`. Lint, build et contrôle du diff réussissent.
- Les anciennes recettes Showroom qui exigeaient explicitement `GLOBAL/CONCESSION`, `users.agency_id` ou l'ancien middleware échouent désormais par conception ; elles doivent être réécrites sur la matrice OWN/AGENCY avant la recette MySQL 8.4.

## Passage Documents commerciaux et Stock véhicules

- Devis : 11 endpoints migrés vers OWN/AGENCY. OWN suit l'affectataire de l'opportunité, avec repli explicite sur le créateur pour un devis sans opportunité. Création, mise à jour, émission, archivage et annulation revalident le contexte dans la transaction et verrouillent le devis.
- Proformas : 6 endpoints migrés. L'agence provient exclusivement de la session ; le responsable porte OWN. Sources devis, opportunités, clients et véhicules sont contrôlés dans l'agence active sous verrou.
- Les permissions additionnelles de remise et de surcharge fiscale sont revalidées dans le contexte transactionnel frais.
- Stock véhicules : les 22 routes ont une garde métier agence. Un véhicule de stock n'ayant pas de propriétaire métier documenté, OWN est refusé explicitement et AGENCY est le seul scope accepté.
- Les créations, modifications, statuts, emplacements et images véhicule utilisent l'autorisation fraîche et des verrous de ressource. Les modifications du profil catalogue commun restent réservées à la permission centrale explicite du véritable super-administrateur.
- Aucune autorité de destination n'étant définie pour un transfert de véhicule entre agences, le runtime autorise uniquement le changement d'emplacement dans l'agence active et refuse tout changement d'agence. Cette réserve n'élargit aucun accès.
- Tests ciblés Devis, Proformas et Stock réussis ; lint, build et contrôle du diff réussissent. Inventaire automatique : 97 endpoints reconnus migrés sur 663 après ce passage.

## Passage Ventes et reprise Livraisons

- Ventes : les 10 routes sont gardées par le contexte d'agence actif et n'acceptent que `OWN/AGENCY`. OWN suit `sales.salesperson_id`; AGENCY reste strictement liée à `sales.agency_id`.
- Création, modification, garantie, transition de statut et reprise d'archivage revalident la session et les permissions dans une transaction fraîche. Les permissions complémentaires d'affectation, remise, conversion de devis et surcharge fiscale sont revérifiées dans ce même contexte.
- Les commerciaux éligibles sont résolus depuis `user_agencies` et `user_agency_roles`; les rôles système et les scopes historiques sont exclus.
- Les tests Ventes ciblés, le lint et le build réussissent. La recette MySQL 8.4 dédiée reste à produire avant de déclarer le groupe validé.
- Livraisons : le routeur principal a été basculé sur le contexte `agencyRbac`; les branches `GLOBAL/CONCESSION` ont été fermées et OWN inclut désormais toujours l'agence active. La migration transactionnelle complète, les services de livraison et la configuration des checklists restent en cours.
- Inventaire régénéré : 106 endpoints reconnus migrés sur 663 ; 533 restent à auditer.

## Reprise finale — Livraisons et chaîne financière

- Le middleware d’authentification résout désormais le contexte RBAC lié à la session et à son agence active. L’ancien contexte n’est plus une autorité : son adaptateur de compatibilité réduit tout scope collectif à `AGENCY` et conserve `OWN`.
- Le routeur principal Livraisons et le service de livraison revalident les écritures dans une transaction fraîche. La configuration des checklists et le catalogue de services sont réservés au véritable super-administrateur tant que leur gouvernance locale/centrale reste indécise ; aucune concession implicite n’est accordée.
- Facturation : les 21 routes ne peuvent plus élargir une requête par `GLOBAL`, `CONCESSION` ou par une agence fournie par le client. Factures, paiements, avoirs, exports et archives sont liés à l’agence active ; les mutations verrouillent session, version de contexte, rôles et permission avant commit.
- Retours post-livraison : listes et ressources combinent toujours agence active et, pour `OWN`, demandeur. Inspection, décision, retenues, résolution financière, remboursement, retour en stock, clôture et reprises d’archives utilisent une autorisation transactionnelle fraîche.
- Les événements de ces flux restent émis après commit. Le lint TypeScript passe. Les anciens tests statiques qui exigent encore `GLOBAL/CONCESSION` ou l’ancien middleware doivent être réalignés sur le contrat final ; le test de révocation de session actualisé réussit.

## Discipline de validation par groupe

Pour déclarer un groupe terminé : inventaire route par route, garde cible, agence/propriété dérivées de MySQL, listes et agrégats filtrés à la source, ressource verrouillée dans les écritures sensibles, contexte revalidé avant commit, événements post-commit, tests négatifs backend, test MySQL 8.4 isolé pertinent, lint, build et contrôle du diff. Un simple remplacement de middleware ne suffit pas.

## Reprise finale — domaines opérationnels et paramètres

- Pièces, achats directs, logistique interne, ventes pièces et finance fournisseur utilisent une autorisation d’agence fraîche pendant la transaction. La validation de sa propre facture fournisseur est refusée. Aucun transfert inter-agences n’est ouvert sans règle explicite de destination.
- Atelier, véhicules atelier, SAV transit et garanties utilisent la même discipline. Les conseillers, techniciens et ressources d’atelier sont désormais sélectionnés depuis `user_agencies` et `user_agency_roles`, les rôles système étant exclus de l’autorité opérationnelle.
- Les huit routeurs RH/prestataires ont été migrés ; leurs tests ciblés réussissent. Documents et marques documentaires ont également été verrouillés jusqu’au commit.
- Paramètres : les lectures d’exploitation suivent l’agence active. L’identité de concession, la création d’agences, les constructeurs, les catégories/types documentaires et les taux atelier de base sont traités comme gouvernance centrale conservatrice, réservée au vrai `SUPER_ADMIN`. Les surcharges de taux restent locales à l’agence active.
- Authentification : un compte muni uniquement de rôles locaux actifs peut se connecter. Login, refresh et `/me` reconstruisent rôles et permissions depuis l’agence active de la session ; `user_roles` ne subsiste comme autorité que pour le rôle système `SUPER_ADMIN`.
- Treasury, couverture, réservations, configuration des flux et rapprochement bancaire n’emploient plus de transaction détachée de la revalidation RBAC. Les tests ciblés Treasury, contexte multi-agences et révocation de session réussissent ; lint et build passent.
