# Backend LCA

`backend-node/` est l’unique backend applicatif. Il utilise Node.js 22,
Express 5, TypeScript, `mysql2/promise`, JWT, PDFKit et Socket.IO. Son contrat
HTTP est préfixé par `/api` et son namespace temps réel est `/realtime`.

## Installation locale

```bash
cp .env.example .env
npm ci
npm run db:bootstrap
npm run seed:admin
npm run dev
```

Renseignez `ADMIN_PASSWORD` avant le seed. Le serveur écoute sur le port défini
par `PORT` (`3001` par défaut). `GET /api/health` vérifie la connexion MySQL.

## Variables

| Variable | Rôle | Exemple local |
|---|---|---|
| `NODE_ENV` | environnement du runtime | `development` |
| `PORT` | port HTTP | `3001` |
| `FRONTEND_URL` | origine CORS autorisée | `http://localhost:3000` |
| `DB_HOST` / `DB_PORT` | serveur MySQL | `127.0.0.1` / `3306` |
| `DB_USER` / `DB_PASSWORD` | compte MySQL | `root` / vide en XAMPP local |
| `DB_NAME` / `DB_POOL_SIZE` | base et taille du pool | `concession_erp` / `10` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | secrets distincts, 32 caractères minimum | valeurs aléatoires |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | durée des jetons | `15m` / `7d` |
| `UPLOAD_DIR` | médias publics | `uploads` |
| `GED_STORAGE_DIR` | documents GED privés | `ged-storage` |
| `DATABASE_ROOT` | racine SQL, facultative | `database` |

Un hôte MySQL est `127.0.0.1` ou `mysql`, jamais `http://localhost:3306`.

## Base et migrations

`npm run db:bootstrap` est l’entrée canonique :

- base vide : baseline consolidée 058 et seed système ;
- base versionnée : migrations `034+` absentes seulement ;
- base non vide non versionnée : arrêt sans écriture.

Les commandes historiques `db:migrate:billing` et
`db:migrate:customers360` sont conservées pour diagnostic ciblé d’anciennes
installations ; elles ne remplacent pas le bootstrap et ne constituent pas le
flux normal de mise à niveau. Voir `database/README.md`.

### Connexion des flux à la trésorerie

La connexion automatique est inactive après migration. Un administrateur ayant
`treasury.account.manage` configure, pour chaque agence et moyen de paiement, un
compte actif de la même concession, puis un scope `CONCESSION` ou `GLOBAL`
active explicitement la concession. La date et l'acteur d'activation sont
audités. Un paiement créé avant l'activation mais confirmé après celle-ci est
traité, car le cutover porte sur l'événement financier et non sur sa création.

Dans la transaction métier, un paiement confirmé crée un mouvement `PAYMENT /
CONFIRMED` entrant, un remboursement exécuté crée `PAYMENT_REFUND / REFUNDED`
sortant, et un règlement constructeur reçu crée `WARRANTY_CLAIM_PAYMENT /
RECEIVED` entrant. Le remboursement débite le compte réellement crédité par le
mouvement du paiement d'origine, même si le mapping courant a ensuite changé ou
été désactivé ; si ce compte est inactif, le remboursement est refusé sans compte
alternatif implicite. Le règlement constructeur exige son propre moyen. Les clés métier
persistantes et l'unicité Treasury rendent les retries idempotents. Une erreur
de mapping, devise, compte, readiness ou solde annule toute la transaction.

Les factures et avoirs ne sont pas des flux de trésorerie. La migration et le
bootstrap ne recopient aucun paiement historique : le solde réel au cutover doit
être rapproché humainement puis représenté par `OPENING_BALANCE`, afin d'éviter
le double comptage. Les budgets RH restent entièrement découplés.

### Opérations manuelles de trésorerie

Les routes dédiées `POST /treasury/manual-receipts` et
`POST /treasury/manual-disbursements` exigent respectivement
`treasury.receipt.create` et `treasury.disbursement.create`. Leur scope suit les
règles collectives Treasury existantes (`AGENCY`, `CONCESSION`, `GLOBAL`; `OWN`
est refusé). Chaque requête porte un UUID client persistant, unique pour son
créateur : un retry
strictement identique renvoie l'opération existante, tandis qu'une réutilisation
avec un contenu différent est refusée.

Une opération valide écrit atomiquement sa source immuable et un mouvement
`MANUAL_RECEIPT / POSTED` ou `MANUAL_DISBURSEMENT / POSTED`. La devise vient du
compte, la catégorie doit être active et compatible, la date de valeur ne peut
pas être future et une sortie verrouille le compte avant de vérifier le solde
dérivé des mouvements `POSTED`. Aucune modification ni suppression n'est
exposée : une correction passe par la contrepassation Treasury. Les
justificatifs restent facultatifs au Lot 4 et sont rattachés directement à
l'opération par le GED existant (`treasury_manual_operation` et l'identifiant de
la source). L'ajout, la prévisualisation, le téléchargement et l'archivage suivent
les permissions et scopes GED existants ; aucun stockage documentaire parallèle
n'est créé.

## Développement et validation

```bash
npm run lint
npm test
npm run build
npm start
```

`npm start` exécute `dist/server.js` et exige donc un build préalable. Les
tests unitaires injectent un environnement de test ; les tests d’intégration
MySQL supplémentaires doivent utiliser une base isolée.

## Sécurité et stockage

Toutes les autorisations métier sont contrôlées côté serveur par permissions
et scopes dynamiques. L’ownership s’appuie sur la relation métier de chaque
ressource, jamais sur une simple appartenance de rôle. `SUPER_ADMIN` est le
seul rôle système spécial.

`/uploads` expose les médias prévus à cet effet. La GED est stockée séparément
dans `GED_STORAGE_DIR` et servie via les routes autorisées. En Docker, ces deux
répertoires sont des volumes persistants distincts.

La lecture du contenu passe toujours par `ged.view` et les scopes de la
ressource rattachée. `GET /documents/:id/preview` sert uniquement les PDF, PNG
et JPEG vérifiés avec `Content-Disposition: inline`; le téléchargement utilise
`GET /documents/:id/download` et impose `attachment`. Les deux réponses sont
privées, non mises en cache et protégées par `nosniff`.

Les devis émis, bons de commande confirmés, factures émises, reçus confirmés et
PV de livraison finalisés sont des archives officielles. Leur finalisation
exige un archivage GED idempotent. Un échec est renvoyé explicitement et la même
action peut être rejouée pour réparer l'archive ; leur consultation ultérieure
ne régénère jamais silencieusement le PDF depuis les données courantes. Les
documents de consultation non finalisés restent, eux, générés dynamiquement.

## Identité documentaire

L'identité légale canonique appartient à `concessions` : raison sociale, RCCM,
NIU (`tax_identifier`), RIB documentaire et site web. Aucun champ NIF ou second
NIU n'est utilisé. Les coordonnées opérationnelles des documents proviennent de
l'agence émettrice (`agencies.address`, `city`, `phone`, `email`) ; l'adresse de
la concession sert de repli lorsque l'agence n'en possède pas.

Le footer PDF commun construit dynamiquement ses segments RCCM, NIU, RIB, site
web, adresse et téléphone. Les valeurs absentes et leurs séparateurs sont omis.
Il est centré, répété sur chaque page et dimensionne le texte long dans la zone
réservée. Le NIU n'est pas répété dans le header. Les archives officielles déjà
finalisées restent les octets historiques autoritaires : une modification de
l'identité ne provoque aucune régénération lors de la preview ou du download.

## Fondation Comptabilité & Trésorerie

La trésorerie est distincte de la facturation et des budgets RH. Une facture,
un avoir, un paiement existant ou une enveloppe budgétaire ne crée aucune
écriture automatiquement dans ce lot. Les comptes appartiennent à une agence
ou directement à une concession ; les catégories sont communes à la
concession. Les soldes sont exclusivement dérivés des mouvements `POSTED` :
entrées moins sorties. Les ouvertures sont des écritures identifiables, les
transferts créent atomiquement un débit et un crédit de même devise, et toute
correction passe par une contre-écriture append-only. Les clés de source sont
protégées par une unicité SQL pour préparer les intégrations futures.

### Intégration Budget ↔ Trésorerie

Le budget reste une autorisation de dépense, distincte de l’argent disponible.
`budgets` expose l’alloué, `budget_expenses` consomme l’enveloppe et le restant
budgétaire est calculé dès l’enregistrement de la dépense. Un décaissement ne
consomme donc jamais le budget une seconde fois. Le solde Treasury reste la somme
dérivée des entrées `POSTED` moins les sorties `POSTED`.

Une dépense peut être payée en plusieurs fois par des enregistrements immuables
`budget_expense_disbursements`. Chacun produit exactement un mouvement `OUT` de
source `BUDGET_EXPENSE_DISBURSEMENT`. Le montant décaissé net, le reste à
décaisser et les états `NOT_DISBURSED`, `PARTIALLY_DISBURSED` et `DISBURSED` sont
dérivés des mouvements liés en tenant compte des contre-écritures. Toute
correction financière passe par le reversal Treasury intégral existant.

La commande exige l’intersection de `hr.expense.disburse` sur la dépense et de
`treasury.disbursement.create` sur le compte ; `OWN` ne donne aucun accès à ces
ressources collectives. Le compte doit être actif, dans la même concession, de
la devise de concession et disposer du solde requis. Les budgets ne portent pas
de devise propre et aucune conversion implicite n’est réalisée. Une dépense déjà
créée reste payable après clôture de sa période ou de son budget : elle représente
une obligation historique ; seules les nouvelles dépenses restent soumises aux
règles de statut et de période du budget.

L’idempotence est garantie par `(created_by, client_request_id)`. Le verrouillage
transactionnel de la dépense puis du compte protège simultanément le plafond à
décaisser et le solde Treasury. Les justificatifs sont rattachés dans la GED à
l’entité de décaissement, séparément des justificatifs éventuels de la dépense.
L’audit et le realtime ne sont produits qu’après une création effective et le
realtime est émis après le commit.

## Livraison avec solde restant dû

Le paiement intégral reste la règle normale. Une exception persistante
`delivery_financial_authorizations`, accordée avec la permission dynamique
`delivery.financial_override.authorize`, peut couvrir un solde positif précis
sans modifier la facture ni créer de paiement, d’avoir ou de mouvement Treasury.
Le snapshot total/payé/solde est figé à l’autorisation ; le solde courant reste
celui de Billing. Une baisse du solde reste couverte, une hausse au-delà du
snapshot exige une nouvelle autorisation. `OWN` est refusé ; `AGENCY`,
`CONCESSION` et `GLOBAL` suivent les scopes RBAC existants.

L’autorisation documente le motif obligatoire, une garantie/sûreté facultative,
l’échéance et les modalités. Elle est révocable avant la remise, puis passe à
`USED` dans la transaction de finalisation. Ses justificatifs utilisent la GED
avec `entity_type=delivery_financial_authorization`. Le PV existant mentionne la
dérogation utilisée et son archive officielle en fige les informations. Les
paiements post-livraison restent des paiements Billing ordinaires et alimentent
Treasury par le flux `PAYMENT` existant.

## Services additionnels de livraison

Le catalogue `delivery_service_catalog` est configurable à l’échelle de la
concession. Lors de l’ajout, `delivery_services` fige code, libellé, description,
quantité, prix et devise ; les évolutions du catalogue restent sans effet sur
l’historique.

Chaque intention crée transactionnellement une prestation Delivery, une facture
Billing complémentaire officielle de type `other` et une ligne de provenance
`DELIVERY_SERVICE`. La facture véhicule émise n’est jamais réécrite. L’ajout ne
crée ni paiement ni mouvement Treasury : seul le paiement Billing confirmé crée
un flux `PAYMENT`; avoirs et remboursements utilisent leurs workflows existants.

L’exposition de remise agrège les factures émises non annulées de la vente. Une
autorisation Lot 6 couvre ce total agrégé. Le verrouillage livraison → vente →
factures → autorisation sérialise l’ajout avec la finalisation, et aucun service
n’est ajoutable après remise. Les permissions dynamiques sont
`delivery.service.view`, `delivery.service.manage` et `delivery.service.add` ;
`OWN` ne donne pas accès aux ressources collectives.

## Rôles à l’installation

Une installation neuve crée uniquement le rôle système **Super Administrateur**
(`SUPER_ADMIN`, système et actif). Toutes les permissions actives du catalogue
lui sont affectées avec le scope `GLOBAL`, après la déclaration complète du catalogue.
Les rôles métier sont créés dynamiquement par le Super Admin selon l’organisation
de la concession, avec les permissions et scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.
Aucun nom de rôle métier ne confère de privilège. Le bypass exige le code
`SUPER_ADMIN` et le statut système persisté, pour un rôle et un utilisateur actifs.

Cette évolution du seed concerne les installations neuves uniquement. Le bootstrap
ne rejoue pas le seed sur une base versionnée et ne supprime aucun rôle existant.
Aucune migration de nettoyage ni modification du schéma consolidé 033 n’est nécessaire.
