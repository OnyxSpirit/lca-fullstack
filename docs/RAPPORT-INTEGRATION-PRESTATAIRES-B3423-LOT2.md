# Rapport B.3.4.2.3 — LOT 2 — Identités et profils prestataires

## Verdict

Le LOT 2 est implémenté et qualifié sur son périmètre code et MySQL 8.4 isolé. Il n'a pas été appliqué à la base métier et aucune recette Docker, VPS ou production n'a été exécutée.

Le périmètre s'arrête aux identités communes, profils prestataires, rattachement initial, consultation/modification, média privé et suspension/réactivation. Aucun compte ERP, contrat, rémunération, GED prestataire, moyen de règlement ou paiement n'a été ajouté.

## Fichiers modifiés

- `backend-node/database/migrations/098_hr_provider_permissions.sql`
- `backend-node/src/app.ts`
- `backend-node/src/modules/hr/hr-provider.routes.ts`
- `backend-node/src/modules/hr/hr-provider-media.ts`
- `backend-node/test/provider-profiles-b3423-lot2.test.ts`
- `backend-node/test/provider-profiles-b3423-lot2-mysql.integration.test.ts`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/modules/hr/ProviderProfileModal.tsx`
- `frontend/test/provider-profiles-b3423-lot2.test.ts`
- `docs/RAPPORT-INTEGRATION-PRESTATAIRES-B3423-LOT2.md`

## Fonctionnalités réalisées

- Deux actions distinctes dans RH → Personnel : « Nouvel employé » et « Nouveau prestataire ».
- Formulaire conditionnel personne physique/personne morale.
- Coordonnées, adresse, identifiant administratif facultatif, nature des services et agence initiale.
- Recherche préalable des identités communes par identifiant, nom, e-mail ou téléphone.
- Réutilisation explicite d'une identité salariée existante sans créer un second salarié.
- Blocage backend des identifiants administratifs exacts ; avertissement et confirmation explicite pour les correspondances probables.
- Verrouillage transactionnel et transformation des collisions uniques concurrentes en conflit HTTP 409.
- Consultation et modification de la fiche créée.
- Photo/logo privé JPEG, PNG ou WebP, limité à 3 Mo, avec contrôle de signature binaire et noms UUID.
- Suspension et réactivation globales motivées et auditées. Le statut de l'identité commune n'est pas modifié : une relation salariée simultanée reste active.

## RBAC et territorialité

La migration 098 ajoute `hr.providers.view` et `hr.providers.manage`. Seul le véritable `SUPER_ADMIN` système reçoit un amorçage GLOBAL ; tous les rôles personnalisés restent gérés par la matrice dynamique.

Les routes acceptent AGENCY, CONCESSION et GLOBAL. OWN est refusé pour cette ressource collective. La cible agence, les lectures de profil et la sélection d'une identité commune sont contrôlées côté serveur. Sous AGENCY, une identité salariée réutilisée doit appartenir à l'agence courante.

## Migration

La migration 098 est additive et limitée aux permissions. Aucun changement du schéma métier 097 n'était nécessaire. Les migrations 096, 097 et 098 n'ont pas été exécutées sur la base métier.

## Tests exécutés

### Ciblés

- Backend LOT 1, LOT 2 et B3420 : 3 fichiers PASS.
- Frontend LOT 2, B3420 et B3421 : 3 fichiers PASS.
- Lint TypeScript backend : PASS.
- Build backend : PASS.
- Lint TypeScript frontend : PASS.
- Build Vite frontend : PASS.

### MySQL 8.4 isolé

Un conteneur `mysql:8.4` temporaire, sans volume et avec données en tmpfs, a été créé puis supprimé.

- migration 096 puis 097, reprise DDL/DML partielle et divergence réelle : PASS ;
- migration séquentielle 096 → 097 → 098 : PASS ;
- identité personne physique partagée salarié/prestataire : PASS ;
- conservation ID, compte et relation employé : PASS ;
- personne morale : PASS ;
- rattachement agence : PASS ;
- unicité d'un profil par identité : PASS ;
- permissions SUPER_ADMIN GLOBAL : PASS ;
- suivi `schema_migrations` 096/097/098 : PASS.

Résultat : 2 tests MySQL PASS, 0 FAIL.

### Non-régression globale

- Frontend complet : 187 PASS, 0 FAIL, 0 SKIP.
- Backend complet : la campagne a été exécutée hors sandbox pour autoriser Supertest. Les tests du LOT 2 sont PASS, mais la suite globale reste rouge sur des fixtures préexistantes hors périmètre : plusieurs scénarios CRM/Vehicle échouent après l'ajout antérieur du contexte historique de notifications (`Auteur de la notification introuvable`) et deux contrats statiques véhicules attendent encore une ancienne forme de source. Aucun échec observé ne cible les fichiers prestataires.

## Garanties et limites

- Aucun compte utilisateur n'est créé automatiquement.
- Aucune donnée salariale, contractuelle ou financière n'est créée.
- Aucun rapprochement automatique irréversible n'est effectué.
- Aucune migration ni écriture n'a été faite sur la base métier.
- Aucun conteneur ou volume métier n'a été arrêté ou modifié.
- Aucune recette navigateur réelle n'a été faite, car elle aurait exigé d'appliquer 096–098 et de reconstruire un environnement applicatif ; ces actions sont interdites dans cette mission.
- La liste Personnel unifiée, les contrats, rémunérations, GED prestataire et paiements restent des lots ultérieurs.

## Prérequis du LOT 3

1. Autoriser explicitement l'application contrôlée de 096, 097 et 098 dans un environnement de recette sauvegardé.
2. Attribuer les permissions prestataires via la matrice RBAC aux rôles de recette.
3. Exécuter une recette HTTP et navigateur avec profils AGENCY, CONCESSION et GLOBAL.
4. Traiter séparément les fixtures globales CRM/Vehicle déjà rouges avant d'utiliser leur campagne comme barrière de livraison générale.

Le développement s'arrête au LOT 2 conformément à la mission.
