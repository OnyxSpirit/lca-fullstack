# LOT B.3.1 — Remise à niveau des fixtures d’intégration

Date de campagne : 18 octobre 2026. Environnement : MySQL 8.4.11 isolé `lca-b31-mysql`, port local 33331, base `lca_b31`, stockage `tmpfs`, réseau dédié `lca-b31-network`. Aucun conteneur, volume ou schéma métier n’a été utilisé ou modifié.

## État et méthode

Le bootstrap officiel 071→091 est validé. Une image logique de ce schéma courant est restaurée avant chaque fichier opt-in afin d’éviter toute dépendance d’ordre. Le premier replay B.3 avait établi 29 PASS et 54 FAIL sur 83 scénarios. Le replay B.3.1 intermédiaire a établi 38 fichiers PASS et 21 fichiers FAIL (les fichiers contiennent désormais 108 tests Node réellement déclenchés, alors que l’inventaire historique comptait 83 scénarios opt-in). Ce résultat intermédiaire n’est pas un verdict de livraison.

## Causes confirmées

- JWT historiques sans `sid` et sans session persistée ;
- authentification directe supposée pour le `SUPER_ADMIN`, incompatible avec la 2FA obligatoire ;
- versions de migration historiques codées en dur ;
- fixtures de trésorerie antérieures à `attachment_type` et au workflow de réservation à quatre yeux ;
- dépendance à des données préexistantes (livraisons, visites showroom, utilisateurs, archives GED) ;
- workflows SAV antérieurs aux préconditions actuelles (devis accepté, interventions dérivées, sessions arrêtées, garantie valide) ;
- tests de migration historiques exécutés contre le baseline courant sans reconstruction isolée de leur état antérieur.

## Corrections validées

- helper MySQL commun : acteurs RBAC non système, sessions persistées, état 2FA vérifié et administrateur HTTP de recette ;
- remboursements/exports, budget-trésorerie, FIN-01/02/03/04/05/09, trésorerie manuelle et clôture ;
- RH budget agence/catégories, reporting et scopes salariaux ;
- GED marques documentaires ;
- PR-02, PR-03, PR-04 et PR-06 ;
- SAV-OR-19/20/21 et plusieurs parcours OPS ;
- retour véhicule : fixture complète et autonome, 12/12 tests de concurrence/idempotence/rollback PASS ;
- migration 085 pré-migration corrigée : la fixture n’utilise plus la colonne avant son ajout, test MySQL réel PASS ;
- provisioning admin rendu compatible avec le nom explicite d’une base jetable, 3/3 PASS ;
- fixtures showroom 02D/02E et agenda rendues indépendantes des identifiants 1/2/3.

Les réservations FIN utilisent désormais `DRAFT → SUBMITTED → ACTIVE`, un bénéficiaire, une échéance et un approbateur distinct. Aucun contrôle RBAC, 2FA, session, scope territorial ou règle des quatre yeux n’a été neutralisé.

## Validations exécutées

- `npm run lint` backend : PASS ;
- `git diff --check` : PASS ;
- migration 085 MySQL 8.4 : PASS ;
- provisioning admin : 3/3 PASS ;
- PR-04 : PASS, absence de fuite inter-agence vérifiée ;
- SAV-OR-19 : PASS, scopes OWN/AGENCY/CONCESSION vérifiés ;
- retour véhicule : 12/12 PASS ;
- FIN-03, FIN-04 et FIN-09 : PASS.

## Reliquat démontré

### Poursuite du 18 octobre 2026

Les réserves suivantes ont été levées avec preuves ciblées :

- migration historique 054→056 reconstruite dans une base indépendante : checksum publié, journal, index final et conservation de données PASS ;
- runner courant : fresh 071→091, idempotence, reprises après coupures DDL/journal, détection d'un checksum 085 falsifié, conservation de données, verrou et deux runners concurrents PASS (2/2 sous-tests) ;
- flux Treasury courant sur schéma 091 : transactions, rollback, idempotence, mapping et concurrence PASS ;
- GED/session : PDF autonome dans le stockage temporaire, téléchargement autorisé, refus immédiat après révocation puis nouvelle session légitime PASS ;
- préproduction : véritable rôle système `SUPER_ADMIN`, session persistée et 2FA vérifiée, scénario PASS ;
- Showroom 02D et 02E : identifiants dynamiques, ressources autonomes et fermeture des deux pools, PASS ;
- SAV/Pièces ciblé : PASS.

Le SAV OR04-09 a progressé jusqu'aux préconditions d'atelier actuelles. L'inspection de réception est désormais correctement considérée comme immuable après son premier enregistrement et l'administrateur technique de fixture n'est plus utilisé comme cas négatif lorsqu'il porte explicitement les permissions Atelier. Un nouveau rejeu est encore requis après le dernier ajustement.

Restent à traiter ou requalifier : RH rallonges budgétaires selon demande/approbation à quatre yeux, SAV UX03/OR04-09/OR16-18/garantie, intégrité Showroom, et WSS sur proxy TLS isolé. Le replay intégral 59 fichiers n'a donc pas encore été relancé après ces corrections supplémentaires.

## Verdict

**RÉSERVE NON LEVÉE.** La campagne a fortement réduit les incompatibilités de fixtures, mais le critère obligatoire 83/83 PASS n’est pas encore démontré. Aucun commit, push, déploiement, changement de branche ou nettoyage destructif n’a été effectué. L’environnement B.3.1 demeure isolé pour permettre la poursuite sûre des rejeux.
