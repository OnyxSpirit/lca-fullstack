# Audit de navigation LCA ERP

## Cause racine reproduite

`NewRepairOrderModal` est monté globalement par `QuickActionModal`, même lorsqu’il est fermé. Son effet dépendait de trois tableaux recréés à chaque rendu et appelait systématiquement `setFormData`. React entrait dans une boucle `Maximum update depth exceeded` : l’URL changeait, mais l’ancien écran restait affiché.

La correction limite l’initialisation à l’ouverture du modal, stabilise la liste des techniciens et ne met plus l’état à jour lorsque les valeurs sont identiques.

## Matrice des routes

| Module | Route React Router | Menu latéral | Portail | Liens de détail / notifications |
|---|---|---|---|---|
| Dashboard | `/dashboard` | oui | — | retour général |
| Portail | `/modules` | oui | — | — |
| CRM | `/crm` | oui | oui | notification `lead` |
| Clients | `/customers` | oui | oui | `/customers/:id` |
| Véhicules | `/vehicles` | oui | oui | `/vehicles/:id` |
| Ventes | `/sales` | oui | oui | `/sales/:id`, notifications `sale` et `reservation` |
| Showroom | `/showroom` | oui | oui | — |
| Livraisons | `/deliveries` | oui | oui | `/deliveries/:id`, notification `delivery` |
| SAV | `/service` | oui | oui | `/service/repair-orders/:id`, notification `repair_order` |
| Atelier | `/workshop` | oui | oui | détail OR |
| Pièces | `/parts` | oui | oui | `/parts/:id`, notification `part` |
| Facturation | `/billing` | oui | oui | notification `invoice` |
| Rapports | `/reports` | oui | oui | dashboard |
| GED | `/documents` | oui | oui | — |
| Notifications | `/notifications` | oui | — | repli des notifications inconnues |
| Utilisateurs | `/users` | oui selon RBAC | oui selon RBAC | — |
| Paramètres | `/settings` | oui selon RBAC | oui selon RBAC | profil utilisateur |
| Route inconnue | `*` | — | — | page 404 explicite |

Les chemins communs et constructeurs de détails sont centralisés dans `src/navigation/routes.ts`.

## Parcours réellement vérifiés dans le navigateur

- connexion avec une API locale de test sans données réelles ;
- 17 liens du menu latéral, avec comparaison URL attendue/réelle et contenu de l’écran ;
- 14 cartes du portail des modules ;
- navigation mobile via le tiroir latéral ;
- utilisateur non authentifié → `/login` → reprise de `/sales` après connexion ;
- vente liste → `/sales/1` → retour liste ;
- notification vente → `/sales/1` ;
- rafraîchissement direct de `/sales/1` ;
- route inconnue conservée et page 404 affichée ;
- bouton précédent du navigateur.

## Limite de l’environnement d’audit

Le backend réel `http://localhost:3001` et MySQL n’étaient pas démarrés au début de l’audit. Les parcours frontend ont donc été isolés avec une API factice locale. Les erreurs métier 401/403 du backend réel devront être rejouées une fois NestJS et MySQL démarrés avec les comptes de chaque rôle.
