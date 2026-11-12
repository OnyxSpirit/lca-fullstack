# ERP LCA — Modernisation du centre de notifications P0 + P1

**Date :** 11 novembre 2026  
**Périmètre :** frontend Notifications et aperçu de la navbar  
**Statut :** implémenté et validé statiquement ; recette navigateur et intégration MySQL/Socket.IO réel à finaliser

## 1. Synthèse des modifications

La modernisation P0/P1 a été réalisée sans modification du backend, des contrats API, du schéma, des migrations, des données historiques, du RBAC ou de Socket.IO.

Les identifiants techniques ne sont plus présentés dans l'interface normale. Une couche commune transforme les événements en titres, catégories, icônes, priorités et textes français. La page propose désormais une liste compacte et responsive, des états de chargement/erreur/vide contextualisés, un détail local, un menu d'actions, une navigation métier strictement limitée aux détails réellement exploitables et une pagination serveur de 10 ou 20 éléments. La navbar réutilise la même présentation.

## 2. Composants frontend modifiés

| Fichier | Modification |
|---|---|
| `frontend/src/modules/notifications/notificationPresentation.ts` | nouvelle couche centralisée de présentation et traduction |
| `frontend/src/modules/notifications/NotificationsPage.tsx` | nouvelle structure P0/P1, détails, actions, pagination, états UI |
| `frontend/src/modules/notifications/notificationFilters.ts` | retrait des portées incompatibles et ajout de filtres exacts Sécurité/RH |
| `frontend/src/components/layout/Header.tsx` | aperçu de la cloche harmonisé avec la page |
| `frontend/test/notification-presentation.test.ts` | traductions, préservation du texte, catégories, priorités, navigation |
| `frontend/test/notification-center-p0-p1.test.ts` | contrats UI page/navbar, actions, états, pagination, accessibilité de base |
| tests Notifications/pagination existants | attentes mises à jour pour le comportement P0/P1 |

Les modifications antérieures déjà présentes dans `Header.tsx` et dans d'autres tests du dépôt ont été conservées.

## 3. Couche de traduction créée

`notificationPresentation.ts` est l'unique source pour :

- les libellés d'événements ;
- la catégorie métier ;
- l'icône Lucide et sa tonalité issue de la palette existante ;
- les priorités françaises ;
- les titres de remplacement ;
- les traductions contextualisées des textes historiques ;
- les libellés de navigation et de référence.

Un événement inconnu affiche « Nouvelle information » ou conserve un titre métier existant. Son identifiant technique n'est jamais utilisé comme libellé normal.

## 4. Événements couverts

- CRM : `crm.lead_assigned` ;
- Showroom : affectation, essai planifié et démarré ;
- Véhicules : création, changement de statut, transfert ;
- Ventes : création, annulation, prêt pour livraison ;
- Devis : création ;
- Livraisons : changement d'état ;
- Atelier : changement d'état ;
- Pièces : demande interne, remise, réception et retour ;
- Facturation/paiements : facture soldée et paiement reçu ;
- RH : dépense annulée et événements dynamiques `employee_bonus.*` ;
- Sécurité : activation/désactivation/récupération/réinitialisation 2FA, politique, obligation et appareil révoqué.

Le classement utilise d'abord le code événement, puis `referenceType`, ce qui permet de distinguer Devis de CRM et Pièces d'Atelier à l'affichage malgré leurs références partagées.

## 5. Traductions des valeurs historiques

Les remplacements sont limités à des structures de phrases et événements connus :

- étapes CRM : `appointment`, `test_drive`, `offer`, `negotiation`, etc. ;
- statuts Ventes : `cancelled`, `ready_for_delivery` ;
- statuts Atelier : `planned`, `diagnosis`, `waiting_approval`, `in_progress`, `quality_control`, `ready`, etc. ;
- statuts dynamiques de primes.

Aucun remplacement global n'est réalisé. Les VIN, références, noms, fichiers et textes libres sont préservés. Les enregistrements MySQL ne sont pas modifiés.

## 6. Nouvelle structure visuelle

Chaque ligne comprend : icône métier, indicateur non-lu non exclusivement colorimétrique, titre français, catégorie, agence, priorité, description, date, auteur et actions autorisées.

- Non lue : fond légèrement teinté, point visuel, titre renforcé et libellé accessible.
- Lue : fond neutre et hiérarchie plus sobre.
- Priorités : Discrète, Information, Important, Critique.
- Densité : lignes compactes, texte important d'au moins 12/14 px, réorganisation verticale sur petit écran.
- En-tête : « Centre de notifications », description métier et compteur compact des non-lues.

Le compteur « aujourd'hui » n'a pas été ajouté afin d'éviter une requête supplémentaire uniquement décorative. Aucun compteur « nécessite une action » n'a été inventé.

## 7. Filtres disponibles

- Portée : Mes notifications ; Agence si le scope effectif le permet.
- Statut : Toutes ; Non lues.
- Catégories serveur exactes : CRM, Ventes, Showroom, Véhicules, Atelier, Livraisons, Facturation, Paiements, Sécurité, Primes RH, Dépenses RH.

`Concession` et `Global` ont été retirés. Devis, Pièces et Autres restent présentés comme catégories sur les lignes, mais ne sont pas proposés comme filtres : l'API actuelle ne peut pas les isoler correctement (`lead` partagé avec CRM, `repair_order` partagé avec Atelier, absence de filtre négatif pour Autres).

## 8. Actions disponibles

- Tout marquer comme lu : permission `notifications.update`.
- Marquer une notification comme lue : uniquement personnelle, non lue et autorisée.
- Archiver : uniquement personnelle et permission `notifications.archive`.
- Consulter les détails : local, sans nouvelle API.
- Ouvrir l'objet métier : uniquement si une route de détail réelle existe et si les permissions permettent la navigation.

Les notifications d'agence appartenant à un autre destinataire restent en lecture seule.

## 9. Navigation contextuelle

Les actions sont proposées pour Vente, Livraison, Ordre de réparation, Facture, Pièce, Véhicule et Client. Les destinations génériques ou retombant sur `/notifications` ne produisent aucun faux bouton. Aucun changement automatique d'agence n'est réalisé.

## 10. Détail local

Le composant `Modal` existant affiche titre, description, catégorie, priorité, auteur, agence, date, référence exacte et état lu/non lu. Le dialogue possède piège de focus, fermeture Échap, restitution du focus et attributs ARIA via le composant commun.

## 11. Notifications d'agence

La portée Agence continue d'utiliser exclusivement le paramètre serveur `scope=agency`, donc l'agence active et les contrôles backend existants. Le frontend ne fusionne ni ne filtre localement des données d'autres agences. Les mutations exigent désormais explicitement `scope==='mine' && notification.isOwn`.

## 12. Navbar

La cloche conserve le compteur, la requête des cinq dernières notifications, la lecture au clic, TanStack Query et les mécanismes temps réel existants. Elle utilise maintenant les mêmes titres, traductions, catégories, icônes, priorités et états de lecture que la page. Un chargement léger et un état vide ont été ajoutés.

## 13. Pagination

La pagination reste serveur. La taille par défaut est 10 et peut passer à 20. Tout changement de portée, statut, catégorie ou taille remet la page à 1. Les boutons sont désactivés à leurs bornes et la navigation possède un libellé accessible.

## 14. Résultats des tests

### Testé avec succès

| Validation | Résultat |
|---|---|
| Tests ciblés Notifications, traduction, RBAC, historique et pagination | 7 fichiers, 0 échec |
| Suite frontend complète via `node --import tsx --test --test-concurrency=1 test/*.test.ts` | 210 fichiers, 0 échec, 0 ignoré |
| Lint frontend `tsc --noEmit` | réussi |
| Build frontend Vite | réussi, 2 528 modules transformés |
| Backend ciblé : notifications dynamiques, conformité, contexte RBAC | 3 fichiers, 0 échec |
| `git diff --check` | réussi |

La commande nominale `npm test` n'est pas exécutable dans ce bac à sable : le CLI `tsx` tente d'ouvrir `/tmp/tsx-1000/19.pipe` et reçoit `EPERM`. La suite identique a été exécutée avec l'import Node de `tsx`, sans serveur IPC, et est entièrement verte.

### Non testé

- Le test `notifications-agency-rbac-mysql.integration.test.ts` est marqué `SKIP` lorsque `NOTIFICATIONS_AGENCY_MYSQL_TEST` n'est pas activé. Aucun environnement MySQL isolé n'a été créé ou modifié.
- Aucune recette manuelle avec navigateur, tailles d'écran réelles, données de recette ou lecteur d'écran n'a été effectuée dans cette mission.
- Aucun test Socket.IO réel supplémentaire n'a été lancé ; le code temps réel n'a pas été modifié et ses tests frontend de non-régression sont inclus dans la suite verte.

## 15. Limites et anomalies restantes

- Le filtre serveur ne sait pas exprimer Devis, Pièces ou Autres indépendamment de leur `referenceType` partagé.
- Le texte historique ne peut être traduit que lorsqu'une structure producteur fiable est reconnue.
- Les objets supprimés ou devenus inaccessibles restent gérés par le module cible après navigation.
- Le menu contextuel possède les rôles et libellés clavier de base ; une recette lecteur d'écran/navigateur reste recommandée.
- Le compteur de la navbar représente la portée personnelle par défaut, conformément au comportement existant.

## 16. Fonctionnalités reportées en P2

- filtres Lues et Archives ;
- restauration et marquage non lu ;
- recherche serveur ;
- portées Concession/Global ;
- compteur fiable « nécessite une action » ;
- routes de détail Prospect, Paiement, Avoir, Utilisateur, Prime et Dépense ;
- filtres métier Devis/Pièces/Autres réellement distincts ;
- centralisation future des producteurs backend et ajout de clés de déduplication manquantes.

## 17. Conclusion

Le lot P0/P1 techniquement compatible est implémenté. Il modernise la présentation sans toucher au modèle métier ni à la sécurité existante. La validation automatisée accessible est verte ; la recette finale doit désormais porter sur le rendu navigateur, les jeux de données réels autorisés et, dans un environnement isolé, le scénario MySQL/Socket.IO complet.
