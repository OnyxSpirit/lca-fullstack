# AUDIT-ERP-02 — Registre des anomalies

| ID | Statut | Criticité | Module | Résumé |
|---|---|---:|---|---|
| CRM-01 | CONFIRMÉ | P1 | Pipeline | Retours vers `new` et réouverture d'états terminaux non bornés |
| RBAC-01 | CONFIRMÉ | P1 | Client 360° | Timeline Livraison/Showroom/GED sans scope SQL propre |
| CRM-02 | CONFIRMÉ | P2 | Prospects | Aucun contrôle de doublon à la création CRM |
| CRM-03 | CONFIRMÉ | P2 | Kanban | Limite silencieuse à 200 et compteurs incomplets |
| CRM-04 | CONFIRMÉ | P2 | Rendez-vous | Pas de détection de collision/doublon de créneau |
| CRM-05 | CONFIRMÉ | P2 | Activités | Auteur confondu avec `assigned_user_id` |
| UX-01 | CONFIRMÉ | P2 | CRM/Clients | Cartes et lignes cliquables non accessibles au clavier |
| CRM-06 | CONFIRMÉ | P2 | Recherche | Recherche CRM sans identifiant |
| API-01 | PROBABLE | P3 | Formulaire/API | Obligatoires frontend/backend divergents |
| SEARCH-01 | À VÉRIFIER | P3 | Recherche | Accents/casse dépendants de la collation réelle |
| UX-02 | À VÉRIFIER | P2 | Responsive | Recette réelle du bundle courant non exécutée |

## Fiches détaillées

### CRM-01 — matrice de transitions incomplète

- Fichier/fonction : `backend-node/src/modules/crm/crm.routes.ts`, mutation de phase, lignes 70–90.
- Observé : seules certaines cibles ont des gardes spécifiques ; `new` n'en a pas. Un gagné/perdu peut être remis à nouveau par appel direct.
- Attendu : matrice explicite des couples source→cible, états terminaux protégés et éventuelle permission de réouverture.
- Reproduction : `PATCH /api/leads/:id/stage` avec `{ "stage": "new" }` sur une opportunité `won` ou `lost` et un utilisateur habilité à avancer le pipeline.
- Cause : validation orientée cible, sans matrice exhaustive.
- Impact : perte d'intégrité du pipeline, KPI et historique commercial incohérents.
- Risque de correction : workflows historiques utilisant des retours arrière implicites.
- Tests : tous les couples 9×9, états terminaux, permissions, historique et notification.

### CRM-02 — doublons prospect

- Fichier/fonction : `crm.routes.ts:51–58`, création.
- Observé : aucune recherche normalisée e-mail/téléphone avant insertion, contrairement aux clients et au Showroom.
- Attendu : politique explicite (alerte, blocage, fusion) au périmètre décidé.
- Reproduction : créer deux prospects avec même téléphone/e-mail dans la même agence.
- Cause : absence de service d'identité prospect.
- Impact : opportunités en double, relances concurrentes, conversion ambiguë.
- Tests : normalisation téléphone/e-mail, agence/concession, concurrence.

### CRM-03 — Kanban incomplet

- Fichier/fonction : `crm.routes.ts:41–46`, `CrmPage.tsx:63–64,209–223`.
- Observé : sans pagination, SQL `LIMIT 200`; compteurs et budgets sont réduits aux lignes chargées.
- Attendu : agrégats serveur exacts ou pagination/infinite loading visible.
- Reproduction : rendre plus de 200 prospects visibles et ouvrir le Kanban.
- Cause : limite de sûreté présentée comme jeu complet.
- Impact : pilotage commercial erroné.
- Tests : 201+ lignes, filtres combinés, sommes et compteurs.

### CRM-04 — collision rendez-vous

- Fichier/fonction : `crm.routes.ts:93–100`, création rendez-vous.
- Observé : date future validée, mais aucune recherche de chevauchement pour le commercial.
- Attendu : règle métier explicite sur conflits et doublons.
- Impact : double réservation et notifications concurrentes.
- Tests : même créneau, chevauchement, changement d'agence, annulation.

### CRM-05 — auteur d'activité ambigu

- Fichier/fonction : `crm.routes.ts:102–104`.
- Observé : l'acteur est écrit dans `activities.assigned_user_id`, puis rendu comme `assigned_user_name`.
- Attendu : auteur immuable distinct du responsable éventuel.
- Impact : audit commercial ambigu et attribution historique fragile.
- Tests : activité par manager, réaffectation ultérieure, affichage auteur/responsable.

### UX-01 — navigation clavier

- Fichiers : `CrmPage.tsx:230–234`, `CustomersListPage.tsx:163–165`, `CustomerDetailPage.tsx:261,295`.
- Observé : `div`/`tr` avec `onClick`, sans bouton/lien, `tabIndex` ou gestion clavier.
- Attendu : éléments sémantiques accessibles, focus visible, activation Entrée/Espace.
- Impact : parcours bloquant au clavier.
- Tests : tabulation, lecteur d'écran, Entrée/Espace.

### CRM-06 — identifiant absent de la recherche CRM

- Fichier : `crm.routes.ts:42–43`.
- Observé : `l.id`/référence métier absent du prédicat.
- Attendu : recherche par identifiant prévue par le cahier d'audit.
- Impact : support et exploitation ralentis.

### API-01 / SEARCH-01 / UX-02

Le frontend exige téléphone et prénom+nom, quand l'API permet e-mail seul avec nom/société. La casse et les accents n'ont pas été validés sur une MySQL 8.4 jetable. Enfin le navigateur disponible ne servait pas un bundle dont la parité workspace pouvait être prouvée. Ces points nécessitent respectivement une décision de contrat, un test de collation et une recette sur instance isolée.

## Anomalies historiques non reproduites

- Reprise automatique de budget : **CONFORME** dans le code courant.
- Filtre « Toute l'équipe » vide : **CONFORME** dans le code courant.
- Erreur serveur systématique à l'ouverture Client 360° : non établie par analyse ; gestion d'erreur présente, mais recette DB réelle non exécutée.
