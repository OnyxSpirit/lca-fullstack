# Matrice RBAC LCA

Le backend conserve l’autorité de sécurité (`authorize`, périmètre agence et contrôles de propriété). Le frontend utilise la matrice unique `frontend/src/navigation/permissions.ts` pour prévenir les actions refusées. Les alias frontend historiques correspondent à `DIRECTION = DIRECTOR`, `SALES_REP = SALES_AGENT` et `WORKSHOP_CHIEF = WORKSHOP_MANAGER`.

## Modules visibles

Tous les rôles voient Dashboard, Portail des modules et Notifications. Le symbole `R` signifie lecture, `A` administration/action complète et `-` aucun accès.

| Module | SUPER_ADMIN | DIRECTOR | SALES_MANAGER | SALES_AGENT | RECEPTIONIST | SERVICE_MANAGER | SERVICE_ADVISOR | WORKSHOP_MANAGER | TECHNICIAN | PARTS_MANAGER | WAREHOUSE_CLERK | DELIVERY_MANAGER | ACCOUNTANT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CRM | A | A | A | A | R/C | - | - | - | - | - | - | - | - |
| Clients 360 | A | A | A | A | R/C | A | A | - | - | - | - | R | R |
| Véhicules | A | A | R | R | R | R | R | R | - | - | - | R | - |
| Showroom | A | A | A | A | R/C/Affecter | - | - | - | - | - | - | - | - |
| Ventes | A | A | A | A | - | - | - | - | - | - | - | R | R |
| Livraisons | A | A | R | R | - | - | - | - | - | - | - | A | - |
| SAV / OR | A | A | - | - | - | A | A | A | R/U affectés | R lié | R lié | - | R financier |
| Atelier | A | A | - | - | - | A | R | A | U affecté | R | - | - | - |
| Pièces | A | A | - | - | - | R/U lié | R lié | R/U lié | R lié | A | U | - | - |
| Facturation | A | A | - | - | - | R SAV | - | - | - | - | - | - | A |
| GED | A | A | A | A | - | A | A | A | A technique | A | A logistique | A | A financier |
| Reporting | A | A | Commercial | - | - | SAV | - | Atelier | - | Pièces | - | - | Financier |
| Utilisateurs/RBAC | A | - | - | - | - | - | - | - | - | - | - | - | - |
| Paramètres | A | A concession | - | - | - | - | - | - | - | - | - | - | - |

## Actions déterminantes

| Action | Rôles autorisés |
|---|---|
| Créer prospect | SUPER_ADMIN, DIRECTOR, SALES_MANAGER, SALES_AGENT, RECEPTIONIST |
| Changer étape, journal CRM, gagné/perdu | SUPER_ADMIN, DIRECTOR, SALES_MANAGER, SALES_AGENT |
| Créer/modifier vente | SUPER_ADMIN, DIRECTOR, SALES_MANAGER, SALES_AGENT |
| Enregistrer visiteur | SUPER_ADMIN, DIRECTOR, SALES_MANAGER, RECEPTIONIST |
| Affecter visiteur | SUPER_ADMIN, DIRECTOR, SALES_MANAGER, RECEPTIONIST |
| Prendre en charge, essai, clôture showroom | SUPER_ADMIN, DIRECTOR, SALES_MANAGER, SALES_AGENT |
| Encaisser, avoir, remboursement | SUPER_ADMIN, DIRECTOR, ACCOUNTANT |
| Gérer ressources atelier | SUPER_ADMIN, DIRECTOR, SERVICE_MANAGER, WORKSHOP_MANAGER |
| Pointer une intervention | SUPER_ADMIN, DIRECTOR, WORKSHOP_MANAGER, SERVICE_ADVISOR, TECHNICIAN |
| Catalogue/commandes pièces | SUPER_ADMIN, DIRECTOR, PARTS_MANAGER |
| Réception/mouvements pièces | SUPER_ADMIN, DIRECTOR, PARTS_MANAGER, WAREHOUSE_CLERK |
| Planifier/clôturer livraison | SUPER_ADMIN, DIRECTOR, DELIVERY_MANAGER |

## Routes et endpoints audités

Les routes React listes et détails sont toutes enveloppées par `ModuleGuard`; les routes inconnues conservent une page 404. Sidebar et Portail appellent tous deux la même matrice.

| Famille API | Lecture | Écriture/action | Portée |
|---|---|---|---|
| `/leads`, `/activities` | CRM_READ | CRM_WRITE, CRM_STAGE, CRM_ACTIVITY | agence + commercial |
| `/customers` | READ | WRITE | agence + propriété commerciale |
| `/vehicles` | READ | WRITE | agence; données financières filtrées backend |
| `/showroom` | READ | RECEPTION ou COMMERCIAL selon action | agence + conseiller affecté |
| `/sales` | READ | WRITE | agence + commercial |
| `/deliveries` | READ | rôles livraison/action | agence + responsable |
| `/repair-orders`, `/workshop` | READ | CREATE, MANAGE, TECH, ITEMS selon action | agence + technicien/OR |
| `/parts`, `/purchase-orders` | READ | CATALOG, STOCK, ORDER, RECEIVE | agence + emplacement |
| `/invoices`, `/payments` | READ | CREATE, PAY, CREDIT, REFUND | agence |
| `/documents` | READ_ROLES | UPLOAD_ROLES, ARCHIVE_ROLES | type d’entité + agence |
| `/reports` | ALL puis SALES/WORKSHOP/PARTS/FIN | export selon section | agence; global Direction/Admin |
| `/users`, `/settings` | administration | administration | agence/concession/global |

## Divergences corrigées

| Module | Action | Frontend avant | Backend | Correction |
|---|---|---|---|---|
| CRM | Avancer / étape | Réception visible | interdit | masqué / lecture seule |
| CRM | Journal commercial | Réception visible | interdit | formulaire masqué et CRM_ACTIVITY séparé |
| CRM | Vente | Réception visible | interdit | masqué dans tous les points d’entrée |
| CRM | Perdu | absent | motif obligatoire supporté | étape ajoutée avec motif obligatoire |
| Showroom | Affecter | liste parfois vide | réception autorisée | actifs de l’agence, mapping de rôle normalisé |
| Showroom | Prendre en charge / essai / clôture | Réception visible | interdit | masqué |
| Quick Actions | opérations | filtrage incomplet | routes spécialisées | filtrage par permission et garde des modales |
| Dashboard/recherche | requêtes invisibles | appels API systématiques | 403 selon rôle | requêtes conditionnées au module |
| Véhicule 360 | coûts et marges | trop visibles | DTO partiellement filtré | onglet et marge masqués sans permission |
| Idempotence | `crypto.randomUUID()` direct | panne possible en contexte non sécurisé | clé requise | helper cryptographique avec `getRandomValues` |

Une action est masquée lorsque le rôle ne l’obtient jamais. Elle reste visible mais désactivée avec une raison lorsque seul l’état métier courant la bloque.
