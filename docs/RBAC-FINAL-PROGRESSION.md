# Progression finale du RBAC multi-agences

Date d'ouverture : 10 novembre 2026. Ce journal est la reprise persistante de la mission globale. Il ne remplace pas les rapports détaillés des phases précédentes.

## État de référence

- Dépôt conservé sans commit, push ni déploiement.
- Frontend, tests frontend, navigateur et E2E hors périmètre.
- Fondations 2C-2A validées : contexte d'agence actif serveur, scopes métier `OWN/AGENCY`, stratégies de ressources, fraîcheur transactionnelle, autorisation centrale explicite et contrat inter-agences.
- Lot 1 validé : 6 endpoints Notifications.
- Lot 2 validé : 16 endpoints Administration/Habilitations.
- Recomptage AST : 663 déclarations HTTP réelles dans 47 fichiers, contre 727 appels `.get/.post/...` historiquement comptés avec des faux positifs sur les maps de permissions.
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
| 0 | Inventaire actualisé et dépendances | Terminé pour la référence initiale | 663 routes recensées ; 33 gardes déjà raccordés au nouveau socle, enrichissement métier maintenu par groupe |
| 1 | Utilisateurs / administration restants | Terminé avec réserves | 16 endpoints déjà migrés ; fonctions personnelles conservées ; CRUD utilisateur et annuaire reportés car identité centrale, `users.agency_id`, profils RH et visibilité inter-agences n'ont pas de règle validée |
| 2 | CRM | Validé | 12 routes OWN/AGENCY ; agence immuable ; écritures fraîches et verrouillées ; Socket borné ; tests backend et MySQL 8.4 isolé réussis |
| 3 | Showroom | Implémenté, validation MySQL restante | 18 routes OWN/AGENCY ; écritures fraîches et verrouillées ; affectations par agence ; provenance CRM directe ; anciens tests CONCESSION/GLOBAL à réaligner et recette MySQL à exécuter |
| 4 | Clients / devis / proformas | En cours avancé | 9 routes Clients, 11 routes Devis et 6 routes Proformas migrées ; Client 360° reste différé jusqu'aux producteurs |
| 5 | Véhicules / stock / transferts | Implémenté avec réserve inter-agences | 22 routes gardées ; stock strictement AGENCY ; écritures fraîches/verrouillées ; transfert inter-agences fermé faute de règle destination explicite |
| 6 | Ventes | Implémenté, recette MySQL restante | 10 routes OWN/AGENCY ; écritures fraîches et verrouillées ; affectations commerciales locales |
| 7 | Livraison | En cours | Routeur principal commencé ; services et configuration de checklist restent à migrer séparément |
| 8 | Facturation / paiements | À faire | Après ventes/livraisons et avant agrégats financiers |
| 9 | Atelier / SAV | À faire | Après pièces et véhicules |
| 10 | Pièces | À faire | Logistique inter-agences à traiter séparément |
| 11 | RH / prestataires | À faire | Référentiels communs/localisés à documenter comme réserves |
| 12 | Comptabilité / trésorerie | À faire | Double autorisation source/destination et séparation des tâches |
| 13 | GED / documents / marques | À faire | Agence dérivée du parent ; signatures personnelles séparées |
| 14 | Paramètres / référentiels | À faire | Ne migrer que les classifications centrales/locales établies |
| 15 | Reporting / audit | À faire | En dernier, après les filtres producteurs |
| 16 | Notifications / technique / Socket.IO | Partiel validé | Notifications et contexte Socket validés ; producteurs à revoir avec leurs modules |

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

## Discipline de validation par groupe

Pour déclarer un groupe terminé : inventaire route par route, garde cible, agence/propriété dérivées de MySQL, listes et agrégats filtrés à la source, ressource verrouillée dans les écritures sensibles, contexte revalidé avant commit, événements post-commit, tests négatifs backend, test MySQL 8.4 isolé pertinent, lint, build et contrôle du diff. Un simple remplacement de middleware ne suffit pas.
