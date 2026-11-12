# ERP LCA — Audit CRM → Ventes et confirmations commerciales

> Audit statique réalisé le 11 novembre 2026. Aucun code applicatif, test, schéma, droit ou donnée n'a été modifié. Les constats marqués **Vérifié** sont directement établis par le code et le schéma versionnés. Les comportements dépendant de données de production sont marqués **À confirmer en recette**.

## 1. Synthèse exécutive

### Réponses aux quatre questions

1. **Le passage manuel du CRM à « Gagnée » ne crée pas automatiquement de vente dans l'implémentation actuelle.** `CrmPage.handleStageChange` appelle uniquement `PATCH /leads/:id/stage`; cette route met à jour `opportunities`, `leads` et `activities`. Elle n'appelle jamais le service Ventes. La vraie vente est créée par l'action explicite **« Transformer en Vente / Bon de Commande »**, visible sur un devis convertible aux étapes Offre ou Négociation. Le service `sale.service.create` crée la vente, réserve le véhicule, accepte le devis, puis force l'opportunité à `won`. La question 1 repose donc sur une prémisse infirmée par le code. **Statut : Vérifié.**
2. **« Confirmer la commande » a un effet réel mais très limité :** elle fait passer la vente de `reserved` à `ordered`, convertit la ligne de réservation de `confirmed` à `converted`, écrit un audit et émet `sales:status`. Elle ne réserve pas le véhicule — cela a déjà lieu à la création —, ne crée ni référence, ni document, ni facture, ne fige pas le prix, ne contrôle pas les finances et ne notifie personne. **Statut : Vérifié.**
3. **Une seule action « Confirmer la vente » est possible, mais pas par simple suppression du premier bouton.** Le backend interdit aujourd'hui `reserved → confirmed`. Il faut fusionner atomiquement les effets indispensables de `ordered` avec la confirmation, ou autoriser une transition directe dont le service convertit aussi la réservation. Les contrôles de stock, d'idempotence et de RBAC peuvent être conservés. **Statut : Vérifié.**
4. **Implémentation recommandée : scénario B/C hybride** : exposer une seule transition métier `reserved → confirmed`, conserver en interne et dans la même transaction la conversion de réservation, la vérification du véhicule réservé, le passage du véhicule à `sold`, les snapshots de coûts, l'audit et l'archivage du bon de commande. Garder `ordered` lisible pour les dossiers historiques, sans le produire pour les nouveaux parcours. Ajouter une unicité SQL sur `sales.opportunity_id` et une protection durable contre plusieurs ventes actives d'un même véhicule. **Statut : Recommandation.**

### Alertes principales

- Une opportunité peut être déplacée directement de n'importe quelle étape non terminale vers `won`, sans devis ni vente; `won` et `lost` sont ensuite terminaux. Cela permet une opportunité gagnée orpheline et empêche sa correction par le workflow normal. **Risque avéré.**
- Le frontend affiche à tort « Déjà transformée en vente » pour toute opportunité `GAGNE`, alors que la fiche CRM ne charge ni identifiant ni statut de vente. **Risque avéré.**
- Le backend empêche plusieurs ventes par opportunité par verrouillage et recherche, mais le schéma ne possède pas d'unicité sur `sales.opportunity_id`. Une unicité existe seulement sur `quotation_id`. **Défense applicative présente, défense SQL incomplète.**
- `sold_at` n'est pas renseigné lors de la confirmation commerciale; il n'est mis à jour qu'à la livraison. Les rapports filtrant simultanément sur `DATE(sold_at)` et des statuts confirmés peuvent donc omettre une vente confirmée non livrée. **Risque avéré dans le code, portée des données à confirmer.**

## 2. Cartographie frontend CRM

| Élément | Fichier / fonction | Comportement observé | Statut | Conséquence métier |
|---|---|---|---|---|
| Référentiel visuel | `frontend/src/modules/crm/CrmPage.tsx`, `stages` | Neuf colonnes, dont `GAGNE` et `PERDU`. | Vérifié | Le libellé « Gagné (Vente) » peut laisser croire qu'une vente existe. |
| Changement d'étape | même fichier, `handleStageChange` | Convertit le statut UI via `opportunityStageToDb`, puis appelle `useLeadStageMutation`. Aucun appel à `useCreateSale`. | Vérifié | Déplacer en Gagnée ne crée pas de vente. |
| Drag-and-drop | même fichier, `onDrop` du Kanban | Toute carte non terminale peut être déposée dans n'importe quelle colonne différente. | Vérifié | Le frontend autorise notamment Nouveau → Gagné. |
| Perte | `confirmLost` | Exige un motif avant l'appel `stage='lost'`. | Vérifié | Conformité avec la validation backend. |
| Conversion | zone d'actions de la fiche CRM | Bouton « Transformer en Vente / Bon de Commande » si permissions `quotations.convert` + `sales.create`, étape Offre/Négociation, et premier devis présent. | Vérifié | La conversion est explicite, conditionnelle et toujours présente. |
| Éligibilité du devis | `quotationCanConvert` | Archive disponible, statut `sent` ou `negotiation`, devis non expiré. | Vérifié | Les préconditions sont affichées avant ouverture du wizard. |
| Assistant de vente | `frontend/src/modules/sales/SaleWizardModal.tsx`, `finish` | Préremplit client, véhicule, opportunité, devis et remise; envoie une clé d'idempotence. | Vérifié | La création reste une action utilisateur en quatre étapes. |
| Message terminal | fiche CRM | Une opportunité `GAGNE` affiche « Déjà transformée en vente ». | Vérifié | Affirmation non fondée si le statut a été changé manuellement. |

Il n'y a aucune redirection lors d'un changement d'étape CRM. Après conversion, le wizard se ferme; il n'y a pas non plus de navigation automatique vers la vente créée.

## 3. Cartographie backend CRM

La route concernée est `PATCH /leads/:id/stage` dans `backend-node/src/modules/crm/crm.routes.ts`.

Séquence vérifiée :

1. middleware `requireAgencyBusinessPermission('crm.pipeline.advance')`;
2. lecture de la fiche dans le scope de l'agence active et, si applicable, du propriétaire `OWN`;
3. validation du statut et de la matrice `CRM_STAGE_TRANSITIONS`;
4. permission additionnelle `crm.prospect.lose` et motif obligatoire seulement pour `lost`;
5. transaction `withLockedLeadAuthorization` avec verrou de la fiche/opportunité;
6. `UPDATE opportunities SET stage=?, lost_reason=?, lost_at=...` avec contrôle optimiste sur l'ancien statut;
7. `UPDATE leads SET status=?` (`won → converted`, `lost → lost`);
8. insertion d'une activité « Étape CRM mise à jour »;
9. après commit, événement temps réel `publishCrmLeadUpdated({changeType:'stage'})`;
10. notification CRM au commercial concerné via `notifyCrm`.

La route ne modifie ni `sales`, ni `sale_items`, ni `reservations`, ni `vehicles`, ni `quotations`. Elle n'appelle aucune fonction de `sale.service.ts`. **Statut : Vérifié.**

## 4. Statuts et transitions CRM

Le référentiel backend (`crm.routes.ts`, `stages`) est : `new`, `contacted`, `qualified`, `appointment`, `test_drive`, `offer`, `negotiation`, `won`, `lost`.

La matrice autorise, depuis chaque statut non terminal, tous les autres statuts sauf lui-même. Elle interdit toute sortie depuis `won` et `lost`.

| Question | Réponse vérifiée |
|---|---|
| Initial → Gagnée directement ? | Oui, frontend et backend l'autorisent avec `crm.pipeline.advance`. |
| Gagnée → étape précédente ? | Non, `won: []`. |
| Perdue → Gagnée ? | Non, `lost: []`. |
| Ordre imposé avant clôture ? | Aucun. |
| Même étape → même étape ? | Interdit par la matrice; le frontend évite normalement l'appel. |
| Perte | Motif obligatoire + `crm.prospect.lose`. |
| Restriction territoriale | Agence active obligatoire; scope `OWN` limité au commercial affecté, `AGENCY` à l'agence. |

Cette liberté est cohérente pour toutes les étapes **non terminales**, mais incohérente avec une liberté de correction après une clôture accidentelle. Le code choisit explicitement l'irréversibilité des deux clôtures.

## 5. Déclenchement du statut Gagnée

Deux chemins distincts produisent `won` :

- **Changement manuel CRM** : `CrmPage.handleStageChange` → `PATCH /leads/:id/stage` → mise à jour CRM seulement.
- **Conversion d'un devis** : `SaleWizardModal.finish` → `POST /sales` → `sale.service.create`; après création de la vente et réservation du véhicule, le service met l'opportunité à `won`, le lead à `converted` et le devis à `accepted`.

Le second chemin est transactionnel : si une validation de vente ou de réservation échoue, la clôture CRM n'est pas persistée. Le premier chemin peut en revanche créer une clôture gagnée sans vente. **Statut : Vérifié.**

## 6. Création automatique de vente

### Conclusion

**Aucune vente n'est créée automatiquement par le seul changement d'étape vers Gagnée.** La création réelle est une conversion explicite par `POST /sales`.

Lors de cette conversion, `backend-node/src/modules/sales/sale.service.ts`, fonction `create`, réalise dans une même transaction :

- validation de l'agence active, du client, du véhicule commercial disponible et non archivé;
- validation du commercial et des scopes `sales.create`, `sales.assign` si nécessaire, et `quotations.convert`;
- exigence d'un devis archivé, émis ou en négociation, non expiré et contenant exactement un véhicule physique;
- cohérence client/opportunité/devis/véhicule/agence;
- contrôles de prix minimum et de marge;
- recherche d'une vente active sur le véhicule, d'une réservation active, d'une vente sur l'opportunité et d'une vente sur le devis;
- insertion de `sales` au statut initial `reserved`, avec numéro `V-...`, totaux et fiscalité issus du devis;
- insertion de `sale_items` et des snapshots de coûts;
- création du snapshot de garantie;
- insertion d'une réservation `confirmed` à montant zéro;
- passage atomique du véhicule `available` à `reserved` et historisation;
- passage opportunité → `won`, lead → `converted`, devis → `accepted`.

Après commit : événement `sales:created`, rafraîchissement CRM temps réel et notification aux détenteurs de `sales.view` hors acteur. Les informations obligatoires empêchent la création CRM convertie sans client, agence, commercial, VIN, devis ou décision de garantie. Une vente directe, elle, peut exister sans opportunité ni devis.

## 7. Historique de l'ancien bouton de conversion

L'historique Git local montre :

- au premier commit `454de3b`, la fiche CRM comportait déjà « Transformer en Vente / Bon de Commande », mais ouvrait un quick action global (`setActiveQuickActionModal('sale')`) sans preuve de liaison automatique à l'opportunité;
- le commit `1134b458` a remplacé cette action générique par `SaleWizardModal`, prérempli depuis un devis et lié à `opportunityId`/`quotationId`;
- dans le code actuel, le bouton **n'est ni supprimé ni globalement masqué**. Il n'apparaît que si l'utilisateur possède `quotations.convert` et `sales.create`, si l'étape vaut Offre ou Négociation et si un devis existe. Son activation exige en outre archive, statut et date valides.

Le backend de conversion existe toujours : ce n'est pas une route spéciale CRM, mais `POST /sales` avec `opportunityId` et `quotationId`. Le mécanisme actuel est plus sûr que l'ancien quick action car il lie et valide explicitement toute la chaîne commerciale. **Statut : Vérifié par historique Git local.**

## 8. Relations MySQL CRM/Ventes

| Relation | Contrainte / validation | Conclusion |
|---|---|---|
| Lead → opportunité | `opportunities.lead_id`, FK `ON DELETE SET NULL` | Le code crée une opportunité par lead, mais aucune unicité SQL sur `lead_id`. |
| Opportunité → client | `opportunities.customer_id`, nullable | Une opportunité peut être sans client; la conversion exige la cohérence avec le client de vente. |
| Devis → opportunité | `quotations.opportunity_id`, FK `SET NULL` | Plusieurs devis possibles pour une opportunité. |
| Vente → opportunité | `sales.opportunity_id`, FK `SET NULL`, nullable | Vente directe autorisée; pas d'unicité SQL sur l'opportunité. |
| Vente → devis | `sales.quotation_id`, FK `SET NULL`, nullable, `UNIQUE uq_sales_quotation_id` | Un devis au plus par vente et une seule vente par devis. |
| Vente → véhicule | `sale_items.vehicle_id`, FK `RESTRICT` | Le service actuel impose exactement un VIN pour la conversion. |
| Réservation → vente/véhicule | `reservations.sale_id`, `vehicle_id` | Pas d'unicité SQL active conditionnelle; le service verrouille et contrôle. |

Réponses vérifiées :

- une opportunité ne devrait produire qu'une vente via le service (`SELECT ... WHERE opportunity_id ... FOR UPDATE`), mais cette règle n'est pas consolidée par une contrainte unique;
- une vente peut exister sans opportunité (vente directe);
- une opportunité gagnée peut exister sans vente (changement manuel);
- l'annulation d'une vente ne rouvre pas l'opportunité et ne remet pas le devis en statut antérieur;
- une opportunité `won` ne peut pas revenir à une autre étape via l'API CRM;
- le CRM actuel ne joint pas `sales`; il ne peut donc ni ouvrir ni afficher de façon fiable la vente ou son statut.

## 9. Cycle de vie complet d'une vente

| Avant | Action UI / origine | Après | Permission | Effets backend vérifiés |
|---|---|---|---|---|
| — | Enregistrer la vente | `reserved` | `sales.create` (+ `quotations.convert` si devis) | Crée vente/ligne/garantie/réservation; véhicule `available → reserved`; conversion CRM/devis le cas échéant; audit; événement et notification. |
| `draft` | Aucun parcours UI actuel identifié | `reserved` | `sales.confirm` si endpoint statut | Transition prévue dans le domaine, sans traitement spécial de réservation. Cas historique/API à confirmer. |
| `reserved` | Confirmer la commande | `ordered` | `sales.confirm` | Réservation `confirmed/pending → converted`; audit; `sales:status`. |
| `ordered` | Confirmer la vente | `confirmed` | `sales.confirm` | Vérifie véhicule `reserved`; véhicule → `sold`; snapshots de coûts/technique; audit; événement; archive du bon de commande. |
| `confirmed` | Lancer la préparation | `preparation` | `sales.confirm` | Exige une facture active émise et soldée, ou une autorisation financière valide; audit et événement. |
| `preparation` | Déclarer prêt à livrer | `ready_for_delivery` | `sales.confirm` | Même verrou financier; audit, événement et notification Livraison. |
| `ready_for_delivery` | Parcours Livraisons | `delivered` | `delivery.complete` et permissions de signature/checklist | Contrôles facture/autorisation, checklist, pièces, garantie, kilométrage; vente et véhicule → `delivered`, `sold_at` renseigné. |
| états non terminaux admissibles | Annuler | `cancelled` | `sales.cancel` | Motif, absence d'encaissement et de livraison; annule facture impayée, libère véhicule réservé/vendu, annule réservations; audit/événement/notification. Interdit depuis prêt à livrer/livré dans le service. |

La machine à états complète est dans `backend-node/src/modules/sales/sale.domain.ts`, `SALE_TRANSITIONS`. Le statut `delivered` ne peut pas être envoyé par l'endpoint Ventes : la livraison effective doit passer par le module Livraisons.

## 10. Analyse de « Confirmer la commande »

### Frontend

Dans `SaleDetailPage.tsx`, `nextStatus` mappe `RESERVATION → COMMANDE`; le bouton est affiché si une prochaine étape existe et si l'utilisateur a `sales.confirm`. Il appelle `handleStatusChange('COMMANDE')`, qui envoie `ordered` via `useSaleStatusMutation`. Il affiche un spinner, puis un toast de succès ou l'erreur API. Il ne demande aucune confirmation et ne navigue pas.

### Backend et effets réels

`PATCH /sales/:id/status` sélectionne `sales.confirm`, puis `sale.service.updateStatus` :

- verrouille la vente et le véhicule dans le scope agence/OWN;
- impose `reserved → ordered` via `assertSaleTransition`;
- met `sales.status='ordered'`;
- met les réservations `pending`/`confirmed` de la vente à `converted`;
- écrit `sale.status_changed` dans l'audit;
- émet `sales:status` après commit.

| Effet recherché | Réalité |
|---|---|
| Réserver / indisponibiliser le véhicule | Non : déjà fait à la création. |
| Créer une commande ou une référence | Non : vente et `sale_number` existent déjà. |
| Valider prix/remise | Non : figés dans `sales`/`sale_items` à la création. |
| Générer un document | Non. |
| Créer une facture / demander paiement | Non. |
| Contrôle financier | Aucun. |
| Préparer livraison | Non. |
| Notification | Aucune notification persistée; seulement événement temps réel. |
| Reporting commercial | `ordered` n'entre pas dans les KPI de ventes confirmées. |
| Effet métier propre | Conversion du statut de réservation + jalon d'état. |

Son utilité réelle est donc la matérialisation d'un jalon « commande » et la clôture technique de la réservation. Ce dernier effet peut être fusionné sans perte dans la confirmation de vente.

## 11. Analyse de « Confirmer la vente »

### Préconditions

- vente au statut `ordered`;
- permission dynamique `sales.confirm` et scope compatible avec l'agence active / propriétaire;
- véhicule encore au statut `reserved`;
- si l'on quitte un ancien état `confirmed`, archive historique obligatoire; cette règle ne s'applique pas à `ordered → confirmed`;
- aucune facture ni aucun paiement exigé à ce stade.

### Effets vérifiés

- `sales.status → confirmed`;
- véhicule `reserved → sold` avec écriture `vehicle_status_history`;
- snapshots des coûts du véhicule remis à jour dans `sale_items`;
- gel du snapshot technique du véhicule;
- origine commerciale complétée si inconnue;
- audit `sale.status_changed` et événement `sales:status`;
- après commit, génération/archivage obligatoire du bon de commande (`archiveSaleOrder`).

Elle ne crée ni facture, ni paiement, ni livraison et n'envoie pas de notification persistée. Le système impose la commande d'abord **à la fois dans le frontend et dans la machine à états backend** (`reserved → ordered → confirmed`), pas par une contrainte SQL ni par une nécessité financière.

## 12. Dépendances entre les deux confirmations

La dépendance est technique :

- le frontend ne propose `FINANCEMENT_VALIDE` qu'après `COMMANDE`;
- `sale.domain.ts` refuse directement `reserved → confirmed`;
- `updateStatus` ne convertit les réservations que lorsque la cible vaut `ordered`;
- les contrôles forts du stock et l'archive sont attachés à `confirmed`.

Elle n'est pas justifiée par une facture, un paiement, un document intermédiaire ou une validation de prix. La seule opération à ne pas perdre est `reservations → converted`. Le libellé frontend `FINANCEMENT_VALIDE` est par ailleurs trompeur : aucune validation de financement n'a lieu dans cette transition.

## 13. Facturation et paiements

- Une vente peut être confirmée sans facture : aucun verrou financier sur `reserved → ordered` ou `ordered → confirmed`.
- Une facture véhicule peut être créée avant ou après confirmation, tant que la vente n'est pas annulée. `billing.routes.ts` vérifie client, agence, un seul véhicule, total identique et absence de facture active.
- La facture est créée en `draft`; l'encaissement met à jour `sales.deposit_amount` et `sales.balance_due` via `recalculateInvoice`.
- Le paiement n'est requis qu'avant `preparation` et `ready_for_delivery`, au moyen de `lockActiveSaleInvoice` : facture active non brouillon et solde nul, ou autorisation financière active couvrant le solde.
- Les candidats à livraison exigent `ready_for_delivery`, une facture non brouillon et solde nul ou autorisation valide.
- La remise effective du véhicule revalide financièrement le dossier et les autres contrôles de livraison.

Il existe donc trois notions distinctes : **vente confirmée**, **vente facturée**, **vente financièrement apurée/autorisée**. Les deux premières peuvent actuellement survenir dans l'un ou l'autre ordre; la préparation, puis la livraison, sont bloquées sans facture financièrement admissible.

## 14. Réservation et disponibilité des véhicules

| Moment | État véhicule | État réservation | Protection |
|---|---|---|---|
| Sélection wizard | `available` | — | Liste frontend filtrée, puis revalidation backend. |
| Création vente | `reserved` | `confirmed` | Verrous véhicule, vente active et réservation active; update conditionnel `WHERE status='available'`. |
| Confirmer commande | `reserved` | `converted` | Aucun nouveau contrôle de stock. |
| Confirmer vente | `sold` | `converted` | Exige le véhicule encore `reserved`; update conditionnel sur ancien statut. |
| Annulation | `available` si `reserved`/`sold` | `cancelled` | Refus si paiement ou livraison active; factures impayées annulées. |
| Livraison | `delivered` | inchangée | Contrôles Livraison autoritaires. |

La suppression du jalon `ordered` ne menace pas la prévention des doubles ventes si la création continue de réserver le véhicule et si la confirmation directe conserve les verrous et updates conditionnels. Les transferts inter-agences sont indirectement protégés par l'agence du véhicule et son indisponibilité; leur interaction détaillée avec les ventes actives reste **à confirmer en recette** car elle dépend des routes de transfert hors du chemin audité.

## 15. RBAC et multi-agences

| Action | Permission backend |
|---|---|
| Voir/changer pipeline | `crm.prospect.view` / `crm.pipeline.advance` |
| Marquer perdu | `crm.pipeline.advance` + `crm.prospect.lose` |
| Marquer gagné | `crm.pipeline.advance` seulement |
| Créer vente directe | `sales.create` |
| Convertir devis | `sales.create` + `quotations.convert`; `sales.assign` si réaffectation |
| Confirmer commande | `sales.confirm` |
| Confirmer vente | `sales.confirm` |
| Annuler | `sales.cancel` |
| Consulter | `sales.view` |

Les deux confirmations utilisent la même permission. Tous les contrôles sensibles sont recalculés côté backend par agence active et scope `OWN`/`AGENCY`; aucun rôle métier n'est codé en dur dans ce parcours. Une simplification n'exige donc pas de nouvelle permission. Elle doit réutiliser `sales.confirm` et `withCurrentAgencyBusinessAuthorization`.

## 16. Tests existants et manquants

### Couverture identifiée

- `crm-stage-transition-matrix.test.ts` : matrice complète et états terminaux;
- `commercial-workflow.test.ts` : liaison devis/opportunité/vente/véhicule, clôture CRM, prévention logique des doublons;
- `crm-negotiation-regression.test.ts`, `crm-functional-reliability.test.ts`, `stock-crm-proforma-restructure.test.ts` : régressions de conversion;
- `sale.domain.test.ts`, `sales-dynamic-rbac.test.ts`, `sale-direct-tax-01.test.ts` : transitions et RBAC;
- `sale-cancellation-mysql.integration.test.ts` : annulation/facturation;
- `delivery-stabilization.test.ts`, `delivery-dynamic-rbac.test.ts`, `recette-critique-03.test.ts` : verrou financier, livraison et stock;
- tests de reporting/dashboard : statuts actifs et snapshots.

### Manques importants

- test API prouvant explicitement que `PATCH ... stage=won` ne crée aucune vente;
- test de cohérence UI : ne jamais afficher « déjà transformée » sans vente liée;
- test d'intégration concurrente de deux créations sur la même opportunité;
- contrainte/test SQL d'unicité `opportunity_id`;
- test concurrent multi-processus de double vente véhicule (les verrous actuels sont applicatifs);
- test complet `reserved → ordered → confirmed` vérifiant réservation, véhicule, archive, audit et événements;
- test futur de confirmation directe et de compatibilité d'une vente historique `ordered`;
- test de l'effet de `sold_at` sur reporting lors d'une confirmation non livrée;
- test inter-agences de conversion puis confirmation avec scopes `OWN` et `AGENCY`.

Les tests n'ont pas été exécutés ni modifiés dans cet audit; l'inventaire est statique, conformément aux restrictions.

## 17. Analyse des trois scénarios de simplification

| Scénario | Avantages | Inconvénients / risques | Modifications nécessaires | Compatibilité historique |
|---|---|---|---|---|
| A — supprimer seulement le bouton | Changement UI minimal | Bloquant : la vente reste `reserved`; backend refuse `reserved → confirmed`; réservation jamais convertie | Insuffisant seul | Mauvaise |
| B — fusion des traitements | Une action métier claire; transaction atomique; suppression du jalon sans valeur documentaire | Requiert tests et adaptation API/domaine; consommateurs éventuels de `ordered` à vérifier | Autoriser `reserved → confirmed`; convertir réservation lors de confirmation; adapter UI/tests | Bonne si `ordered → confirmed` reste accepté |
| C — conserver une transition interne invisible | Faible rupture théorique pour les consommateurs | Deux updates/états transitoires artificiels; audit et événements ambigus; risque d'observer `ordered` en cas d'échec entre opérations | Endpoint orchestrateur transactionnel ou transition interne silencieuse | Bonne mais complexité inutile |

**Recommandation : B avec compatibilité C limitée aux données historiques.** La confirmation directe doit exécuter les anciens effets de `ordered` dans la transaction de confirmation, sans persister un état transitoire. Le statut `ordered` doit rester accepté en entrée pour les ventes déjà à ce stade, puis être déprécié pour les nouvelles ventes.

## 18. Risques de régression

### Avérés

- suppression UI seule rend le parcours impossible;
- oubli de convertir `reservations` laisse des états incohérents;
- changement manuel à `won` produit déjà des opportunités sans vente;
- le CRM ne sait pas retrouver la vente liée;
- archive du bon de commande attachée à `confirmed` doit rester après commit et être récupérable;
- tableaux de bord/rapports ignorent `ordered` mais utilisent `confirmed`; une simplification avancera potentiellement le moment où une vente entre dans ces agrégats;
- `sold_at` n'est pas renseigné à confirmation, ce qui peut neutraliser cet effet dans les rapports datés.

### Hypothétiques / à confirmer

- intégrations externes écoutant `sales:status=ordered`;
- exports ou procédures opérationnelles utilisant `ordered` hors dépôt;
- volumes réels de ventes historiques `reserved`/`ordered` et opportunités `won` orphelines;
- contraintes opérationnelles des transferts inter-agences sur véhicule réservé;
- conventions comptables attendues pour la date `sold_at`.

Les ventes, factures, paiements, autorisations et livraisons existants ne doivent pas être migrés automatiquement. La compatibilité de lecture de tous les statuts suffit pour une évolution progressive.

## 19. Proposition de parcours cible

### CRM

Parcours recommandé :

`Opportunité en cours → devis émis/archivé → action explicite Créer la vente → vente reserved + véhicule réservé → opportunité won`

Le CRM ne devrait plus permettre de conclure `won` directement si « gagnée » signifie contractuellement une vente créée. Deux options métier restent possibles :

- **préférée** : réserver `won` à la conversion réussie et retirer cette cible du changement manuel;
- **alternative** : conserver le `won` manuel, mais renommer/qualifier l'état et ne jamais prétendre qu'une vente existe; offrir ensuite une action explicite de création et une possibilité contrôlée de correction.

Dans les deux cas, la fiche CRM devrait charger la vente liée par `opportunity_id`, afficher son numéro/statut et proposer un lien. Le formulaire existant prérempli est réutilisable et constitue déjà le bon socle.

### Ventes

Parcours cible :

`Création (reserved, véhicule réservé) → Confirmer la vente (confirmed, réservation convertie, véhicule sold, snapshots, archive) → Créer/émettre facture et encaisser ou autoriser → Préparation → Prêt à livrer → Livraison`

La facture peut rester créée avant ou après confirmation, puisque le code l'autorise; en revanche, une facture émise et apurée/autorisée doit rester obligatoire avant préparation et livraison.

## 20. Plan d'implémentation recommandé

1. **Décision métier** : définir si `won` signifie obligatoirement « vente créée ». Sans cette décision, ne pas modifier la matrice CRM.
2. **Diagnostic données en lecture seule** : compter les opportunités `won` sans vente, les opportunités avec plusieurs ventes, les ventes `reserved`/`ordered`, les véhicules avec plusieurs ventes actives et les `sold_at` nuls sur statuts confirmés.
3. **Durcir le modèle** : après nettoyage contrôlé, ajouter une unicité nullable sur `sales.opportunity_id`; étudier une protection SQL durable des ventes/réservations actives par véhicule compatible MySQL.
4. **API CRM** : exposer sur la fiche la vente liée et son statut; si décision retenue, interdire le `won` manuel ou distinguer clairement « gagné commercialement » de « converti en vente ».
5. **Domaine Ventes** : autoriser `reserved → confirmed` tout en conservant `ordered → confirmed` pour l'historique.
6. **Transaction de confirmation** : pour une source `reserved`, convertir les réservations avant/avec le passage véhicule à `sold`; conserver verrous, updates conditionnels, snapshots, audit et événement. Ne pas persister un état `ordered` transitoire.
7. **Frontend** : remplacer le premier bouton par « Confirmer la vente » depuis `RESERVATION`; conserver l'affichage et la confirmation des dossiers historiques `COMMANDE`.
8. **Documents** : garder la génération du bon de commande sur `confirmed`, avec le mécanisme actuel de reprise d'archive.
9. **Reporting** : décider explicitement quand renseigner `sold_at`; corriger séparément les rapports si la date commerciale doit être celle de confirmation plutôt que de livraison.
10. **Tests** : ajouter matrices, intégrations transactionnelles et concurrence listées en section 16, puis recette RBAC `OWN`/`AGENCY`, multi-agences, annulation, facturation, autorisation financière et livraison.
11. **Déploiement progressif** : backend rétrocompatible d'abord, frontend ensuite; observer événements `sales:status`, erreurs de conflit, archives manquantes et dossiers bloqués.
12. **Aucune migration destructive** : ne pas réécrire automatiquement les ventes historiques `ordered`; elles restent confirmables par le chemin existant.

### Conclusion de décision

Le parcours actuel contient déjà une conversion manuelle sûre; il ne contient pas la création automatique supposée lors d'un simple passage à Gagnée. La simplification des confirmations est pertinente : le statut `ordered` n'apporte aujourd'hui qu'un jalon et la conversion de réservation. Une transition directe, transactionnelle et rétrocompatible vers `confirmed` préservera le stock, le RBAC, l'audit, les documents et les données existantes, à condition de ne pas se limiter à retirer le bouton frontend.
