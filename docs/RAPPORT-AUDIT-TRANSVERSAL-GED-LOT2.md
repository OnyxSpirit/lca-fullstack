# LOT 2 — Audit transversal de fiabilité documentaire

## 1. Synthèse exécutive

L'audit confirme que la GED officielle repose sur un noyau central cohérent (`business-document.service.ts` et `document-storage.ts`) : clés documentaires déterministes, unicité, empreinte SHA-256, stockage hors URL publique, contrôle du contenu et lecture avec vérification d'intégrité. Le LOT 1 a correctement ajouté la reprise explicite des devis et des bons de commande.

Le dispositif n'est toutefois pas uniformément exposé dans les autres workflows. Les factures, reçus, avoirs et retours possèdent soit une reprise API implicite mais devenue invisible après rechargement, soit aucune finalisation documentaire dans leur parcours courant. L'écart principal est donc un problème d'orchestration et de présentation, pas une faiblesse générale des transactions financières.

Aucun P0 nouveau n'est démontré par le code. Cinq anomalies P1 et deux risques P2 sont retenus. La situation historique du devis `DEV-20261022-F9788D6C` reste **non reproduite et nécessite une vérification en environnement** : avec une même version backend et une même base, le message exact observé est incompatible avec `archiveAvailable=true` au même instant. Le code démontre néanmoins deux défauts de cohérence susceptibles de produire des variantes proches : l'état ne vérifie pas le fichier physique et la lecture par préfixe peut choisir une version plus ancienne que celle qui a déterminé l'état.

Audit strictement en lecture : aucun comportement métier, schéma, conteneur ou donnée n'a été modifié.

## 2. Inventaire des documents et chemins réels

| Document | Déclencheur métier | Archive officielle | Consultation et chemin interface |
|---|---|---|---|
| Devis | Émission du devis | `quotation:<id>:issued:v2` | **CRM** `/crm`, fiche prospect, section devis, bouton **PDF** ; également **Ventes** `/sales`, tableau « Propositions et devis » |
| Bon de commande | Confirmation de la vente | `sale:<id>:confirmed:v2` | **Ventes** `/sales/:id`, actions **Imprimer / Télécharger** |
| Facture client/VN/VO | Action **Émettre** | `invoice:<id>:issued:v2` | **Comptabilité & Trésorerie** `/billing/:id`, actions **Imprimer / Télécharger** |
| Facture Atelier | Action de facturation d'un OR prêt | Même archive facture `invoice:<id>:issued:v2` | **Atelier/SAV** `/service/repair-orders/:id`, puis facture accessible sous `/billing/:id` |
| Reçu de paiement | Validation d'un encaissement | `payment:<id>:confirmed:v1` | `/billing/:id`, « Historique des règlements », bouton **Reçu** |
| Avoir client créé depuis facture | Création d'un avoir | **Aucune archive créée par ce parcours** | `/billing/:id`, section « Avoirs » ; aucun bouton PDF |
| Avoir de retour véhicule | Résolution financière d'un retour | `credit-note:<id>:issued:v1` | `/vehicle-returns/:id` pour le dossier ; aucune action PDF d'avoir dédiée identifiée |
| PV de livraison | Signature/finalisation | `delivery:<id>:finalized:v2` | `/deliveries/:id`, consultation PDF du dossier de livraison |
| Pièces jointes de livraison | Ajout manuel au dossier | Table et stockage `delivery_documents` | `/deliveries/:id`, section « Documents remis », bouton **Télécharger** |
| PV de retour véhicule | Clôture du retour | `vehicle-return:<id>:closed:v1` | `/vehicle-returns/:id`, action de téléchargement du PV |
| Ordre de réparation | Consultation/impression | PDF généré à la demande, **non archivé** | `/service/repair-orders/:id`, impression du document OR |
| Document Garantie dans l'OR | Sections intégrées au rendu OR | Contexte relu/snapshot contractuel partiel, pas d'archive autonome | `/service/repair-orders/:id` via le PDF OR |
| Créance constructeur | Créée avec la facture Atelier | **Aucun PDF/archivage autonome identifié** | Données visibles dans le dossier Atelier ; aucun chemin PDF autonome trouvé |
| Planning de livraison, fiche véhicule, fiches RH, rapports | Impression à la demande | Rendus opérationnels, pas des archives GED officielles dans le code audité | Routes de leurs modules respectifs |

L'absence d'archive des impressions opérationnelles n'est pas automatiquement une anomalie. Elle le devient seulement lorsque l'interface ou le métier les présente comme une pièce officielle immuable.

## 3. Cartographie du noyau GED

### Génération et stockage

- `commercial-document.ts` construit les devis, bons de commande, factures, reçus et PV de livraison.
- `business-document.service.ts` associe le rendu à une clé métier stable puis appelle `archiveBusinessDocument`.
- `document-storage.ts` valide extension, MIME, signature binaire et taille, écrit avec `flag: 'wx'`, calcule SHA-256 et confine les chemins sous `GED_STORAGE_DIR`.
- La ligne `documents` référence le fichier via `ged:<storageKey>` et conserve `file_hash`, agence, concession, type et entité métier.
- Les cachets/signatures résolus sont copiés dans `document_mark_snapshots`; les versions actives futures ne changent pas l'archive existante.

### Lecture

- Les PDF métier officiels utilisent `requiredHistoricalBusinessPdf(prefix)` puis `readDocumentFile`.
- Les aperçus GED génériques utilisent `/documents/:id/preview` et les téléchargements `/documents/:id/download`, après RBAC et scope.
- La lecture contrôle l'empreinte quand elle existe. Fichier absent : HTTP 410. Stockage inaccessible : HTTP 503. Empreinte invalide : HTTP 409 explicite.
- La consultation ne modifie aucun statut ou montant métier. Les routes GED génériques écrivent uniquement une trace d'audit de consultation/téléchargement, sans bloquer la réponse si cet audit échoue.

### Unicité, concurrence et compensation

- `source_key` est la clé d'idempotence documentaire.
- En collision, le document gagnant est relu ; le LOT 1 empêche désormais le rejeu d'un callback `afterInsertOnly`, donc d'un snapshot/cachet déjà créé.
- Si l'insertion SQL échoue après stockage, le fichier est supprimé.
- La livraison est plus forte : statut, signature, transitions, archive et snapshots sont dans la même transaction ; le fichier est compensé si la transaction échoue.

## 4. Workflows, transactions et risques post-commit

### Devis et ventes

Émission/confirmation et audit sont commités avant le rendu GED. Une panne donne un HTTP 503 après succès métier. Les endpoints du LOT 1 (`POST /quotations/:id/archive`, `POST /sales/:id/archive`) réparent sans rejouer numéro, snapshot, statut, véhicule ou événement. Les écrans refetchent même après erreur et affichent l'action exceptionnelle. **Fonctionnement conforme sur le code local.**

### Factures

L'émission commit le statut `issued`, le snapshot d'identité et l'audit, puis archive hors transaction. Rejouer `PATCH /invoices/:id/status` est techniquement idempotent et relance l'archive, mais l'écran n'affiche **Émettre** que pour un brouillon et son cache n'est invalidé qu'en succès. Après rechargement, aucun bouton de reprise n'existe.

La création d'une facture Atelier suit le même schéma : facture/numéro/OR sont commités, puis l'archive est générée. Un nouvel appel retrouve la facture et peut relancer l'archive, mais l'état de l'OR rend cette action non évidente ou inaccessible dans l'interface.

### Paiements et reçus

Paiement, mise à jour de facture, mouvement de trésorerie et audit sont atomiques et protégés par `idempotency_key`. Le reçu est archivé après commit. Dans la même modale, une erreur conserve la clé : une nouvelle soumission retrouve le paiement et tente à nouveau l'archive sans nouveau mouvement. Après rechargement ou paiement soldant, aucun mécanisme explicite ne permet de finaliser le reçu. Le frontend n'invalide pas non plus les données après l'erreur post-commit.

### Avoirs et remboursements

Les avoirs créés depuis `/billing/:id` sont idempotents et financièrement bornés, mais le parcours `POST /invoices/:id/credit-notes` ne crée aucune archive et aucune route de PDF d'avoir n'est exposée. `archiveCreditNote` n'est appelé que par la résolution financière des retours véhicule. Les remboursements sont transactionnels et idempotents, mais aucun justificatif PDF de remboursement autonome n'est défini ; le métier rattache le remboursement à l'avoir et au paiement.

La résolution financière d'un retour commit ses avoirs et remboursements puis archive les avoirs hors transaction. Rejouer la résolution sait retrouver les IDs existants et relancer l'archivage, mais l'interface ne présente pas cette reprise une fois l'état avancé.

### Livraisons

La finalisation normale archive le PV dans la transaction qui fige signature, kilométrage et statuts. Une erreur GED provoque le rollback et la compensation du fichier. Un appel dupliqué sur une livraison déjà finalisée tente une réparation idempotente. Ce module ne présente pas le risque post-commit des autres documents officiels. **Aucune correction métier nécessaire.**

### Atelier, SAV et garanties

La facture Atelier rejoint la GED centrale, avec la réserve de reprise décrite plus haut. Le PDF de l'OR est recalculé à chaque consultation à partir de l'état courant, y compris son contexte garantie ; il n'est pas une archive officielle. La remise Atelier conserve une signature en base mais ne produit pas de document de remise immuable. Les créances constructeur et leurs règlements ne possèdent pas de document officiel autonome identifié.

## 5. RBAC et scopes

- Chaque route métier exige sa permission dédiée (`quotations.view/validate`, `sales.view/confirm`, `billing.invoice.view/issue`, `billing.payment.view/collect`, `delivery.documents.view`, etc.).
- Les services `one`, `access`, `detail`, `accessible` et les prédicats GED recoupent agence/concession/OWN selon le domaine.
- Les reprises du LOT 1 réemploient exactement les permissions de finalisation et les scopes métier ; elles ne constituent pas un canal GED générique.
- Les documents GED génériques exigent `ged.view`, `ged.upload` ou `ged.archive` plus la permission de l'entité rattachée.
- Le téléchargement des pièces jointes de livraison vérifie une des permissions documentaires de livraison et l'accès au parent.
- Aucun bypass de rôle `SUPER_ADMIN` n'a été identifié dans les chemins documentaires audités.

## 6. Analyse de `archiveAvailable=true` / PDF absent

### Ce que démontre le code

Pour un devis, `archiveAvailable` vaut vrai seulement si la base retourne une ligne :

`origin='generated' AND source_key='quotation:<id>:issued:v2'`.

La route PDF recherche :

`origin='generated' AND source_key LIKE 'quotation:<id>:issued:%'`.

Sur une même base, le même identifiant et sans changement entre les requêtes, toute ligne satisfaisant le premier prédicat satisfait nécessairement le second. Le message exact « Archive officielle absente » n'est produit que lorsque la seconde requête ne trouve **aucune ligne**. Le code local seul ne peut donc pas démontrer la combinaison exacte signalée.

Autres résultats possibles, distincts du message observé :

- ligne présente mais fichier absent : HTTP 410 « Fichier documentaire indisponible » ;
- fichier illisible/stockage en panne : HTTP 503 ;
- empreinte différente : HTTP 409 « Intégrité de l'archive officielle invalide ».

### Incohérences néanmoins confirmées

1. `archiveAvailable` vérifie uniquement la ligne SQL, jamais l'existence ou l'intégrité du fichier. L'UI peut donc annoncer « disponible » alors que le téléchargement échoue en 410/409/503.
2. La disponibilité cible exactement `v2`, alors que la lecture utilise un préfixe et choisit le document **le plus ancien** (`ORDER BY created_at ASC,id ASC`). Si un ancien `v1` coexiste avec `v2`, la consultation peut lire l'ancien fichier — éventuellement indisponible — alors que l'état a été calculé sur `v2`.

### Hypothèses nécessitant l'environnement

Pour `DEV-20261022-F9788D6C`, vérifier sans mutation : réponse JSON réelle ayant produit le badge, ID interne du devis, lignes `documents` et `source_key`, URL appelée par le navigateur, version/hash des bundles frontend/backend, éventuels nœuds backend ou bases différents, et cache réseau. Ces hypothèses ne sont pas classées comme causes confirmées. Aucun accès VPS n'a été effectué.

## 7. Anomalies classées

### GED-P1-01 — Disponibilité SQL différente de la lisibilité physique

- **Statut : CONFIRMÉ PAR LE CODE — P1**
- **Module : GED transverse, visible d'abord dans CRM/Ventes.**
- **Cause :** les requêtes `EXISTS` n'appellent ni `readDocumentFile` ni un état de santé persistant.
- **Scénario :** conserver la ligne `documents`, rendre son fichier absent ou altéré, charger le devis puis demander le PDF.
- **Conséquence :** badge positif trompeur, opération suivante potentiellement bloquée.
- **Données :** pas de corruption supplémentaire ; révélation d'une incohérence ligne/fichier existante.
- **Correction recommandée :** centraliser un état `AVAILABLE / MISSING_RECORD / FILE_MISSING / INTEGRITY_ERROR`, avec contrôle serveur ciblé et sans lecture complète répétée dans les listes.
- **Tests :** ligne seule, fichier absent, hash faux, stockage indisponible, scopes.

### GED-P1-02 — Sélection historique par préfixe non alignée avec la version déclarée disponible

- **Statut : CONFIRMÉ PAR LE CODE — P1**
- **Module : tous les PDF officiels via `requiredHistoricalBusinessPdf`.**
- **Cause :** état sur clé exacte courante, lecture sur `LIKE prefix%` triée par le plus ancien.
- **Scénario :** archives v1 et v2 coexistantes ; v1 devient illisible, v2 reste valide.
- **Conséquence :** consultation de la mauvaise version ou échec malgré une version courante saine.
- **Données :** aucune écriture, mais restitution documentaire historiquement incorrecte.
- **Correction recommandée :** rechercher d'abord la clé canonique exacte ; définir explicitement la politique de fallback legacy et vérifier chaque candidat.
- **Tests :** v1/v2, plus ancien absent, v2 intact, hash divergent.

### GED-P1-03 — Factures et reçus : succès métier post-commit sans reprise visible durable

- **Statut : CONFIRMÉ PAR LE CODE — P1**
- **Modules : Facturation, Atelier, Encaissements.**
- **Cause :** archive après commit ; endpoints rejouables mais actions masquées après refetch/rechargement ; invalidation frontend uniquement en succès.
- **Scénario :** faire échouer rendu/insertion après émission ou encaissement, puis recharger la page.
- **Conséquence :** facture ou paiement valide sans PDF accessible, opérateur sans action de réparation.
- **Données :** transactions financières protégées ; risque humain de tentative additionnelle limité par verrou, solde et idempotence, mais confusion opérationnelle réelle.
- **Correction recommandée :** étendre le modèle du LOT 1 aux factures et reçus : état explicite, endpoints de finalisation dédiés, invalidation `onSettled`, même permission et même scope.
- **Tests :** rendu/insert KO, paiement soldant, reprise avec même clé, rechargement, concurrence, aucun second mouvement.

### GED-P1-04 — Avoir standard non archivé

- **Statut : CONFIRMÉ PAR LE CODE — P1**
- **Module : Facturation.**
- **Cause :** `POST /invoices/:id/credit-notes` persiste l'avoir mais n'appelle pas `archiveCreditNote`; aucune route PDF dédiée.
- **Scénario :** créer un avoir depuis `/billing/:id`, puis rechercher son document officiel.
- **Conséquence :** pièce financière présente sans justificatif officiel homogène avec les avoirs de retour véhicule.
- **Données :** aucun risque sur le calcul financier ; lacune documentaire et d'audit de remise.
- **Correction recommandée :** définir si tout avoir est officiellement imprimable ; si oui, archiver après commit avec reprise dédiée et consultation RBAC.
- **Tests :** création/dupe, échec GED, reprise, remboursement rattaché, aucun double avoir.

### GED-P1-05 — Retours véhicule : reprises techniques non exposées

- **Statut : CONFIRMÉ PAR LE CODE — P1**
- **Module : Retours après livraison.**
- **Cause :** résolution/clôture rejouables et réparatrices côté serveur, mais actions disparaissent après changement d'état.
- **Scénario :** échec d'archive d'un avoir ou du PV après commit, puis rechargement.
- **Conséquence :** dossier avancé sans moyen visible de produire la pièce manquante.
- **Données :** idempotence financière présente ; pas de doublon attendu au rejeu serveur.
- **Correction recommandée :** exposer disponibilité et finalisation documentaire séparément des transitions métier.
- **Tests :** plusieurs avoirs, reprise partielle, clôture répétée, concurrence.

### GED-P2-01 — OR et remise Atelier non figés comme documents officiels

- **Statut : RISQUE POTENTIEL — P2**
- **Module : Atelier/SAV/Garanties.**
- **Cause :** PDF OR rendu à la demande ; signature de remise stockée sans archive de remise autonome.
- **Conséquence :** une réimpression peut refléter des données courantes différentes de celles vues lors de l'opération.
- **Correction recommandée :** décision métier préalable : distinguer « impression opérationnelle » et « document officiel », puis n'archiver que les jalons juridiquement requis.
- **Tests :** avant/après modification des données, snapshots garantie, signature de remise.

### GED-P2-02 — Créances constructeur sans pièce documentaire autonome

- **Statut : RISQUE POTENTIEL — P2**
- **Module : Garanties.**
- **Cause :** créance et règlements existent en données, sans route PDF/archive identifiée.
- **Conséquence :** traçabilité comptable structurée mais absence potentielle de justificatif partageable.
- **Correction recommandée :** confirmer l'exigence métier avant tout développement ; ne pas inventer un document.

### DEV-HIST-01 — Devis historique annoncé disponible mais route en 409 absent

- **Statut : NON REPRODUIT — NÉCESSITE VÉRIFICATION EN ENVIRONNEMENT**
- **Priorité provisoire : P1 jusqu'à qualification.**
- **Module : CRM/devis.**
- **Cause :** non démontrée. La combinaison exacte ne découle pas d'un backend local cohérent sur une source SQL unique.
- **Correction :** aucune intervention sur la donnée avant collecte des preuves en lecture seule listées au §6.

## 8. Modules ne nécessitant aucune correction immédiate

- **Livraison — finalisation et PV officiel :** atomicité document/métier, compensation et rejeu déjà présents.
- **Stockage GED central :** confinement, création exclusive, validation binaire et empreinte sont corrects.
- **Téléchargement GED générique :** permission, scope, intégrité, en-têtes privés et absence de mutation métier sont corrects.
- **Transactions financières paiement/remboursement :** verrous, soldes et clés d'idempotence protègent les montants ; la réserve porte sur le document, pas sur le calcul financier.
- **LOT 1 devis/vente :** reprise dédiée et idempotente conforme dans le code local ; recette navigateur/déploiement restent hors de cet audit.

## 9. Tests exécutés

Campagne documentaire ciblée, sans base métier et avec le mode officiel `--experimental-test-module-mocks` :

- reprise devis/vente, échecs simulés, concurrence et PDF historique ;
- facture Atelier : échec rendu, échec insertion, reprise et absence de doublon ;
- aperçu, téléchargement, MIME, intégrité, traversal et permissions GED ;
- archivage commercial devis/vente/facture/reçu/livraison ;
- snapshots signatures/cachets ;
- livraison financière et PV transactionnel ;
- avoir/remboursement et retour véhicule ;
- contexte documentaire garantie.

Résultat final de la campagne correcte : **51/51 PASS**, 0 échec, 0 skip (4,24 s). Une première invocation sans l'option expérimentale a produit deux erreurs de harnais (`mock.module is not a function`) ; elle ne constitue pas un échec produit et a été rejouée avec la commande officielle du projet.

Les suites globales du LOT 1 restent documentées séparément : frontend 977/977 ; backend global avec échecs historiques hors GED.

## 10. Limites

- Aucun accès au VPS, à la production ou à sa base.
- Aucun contrôle du devis historique, de ses lignes GED ou de son fichier physique.
- Aucun test MySQL isolé supplémentaire : les tests pertinents autorisés reposent ici sur doubles comportementaux et contrôles statiques existants.
- Aucun test navigateur : le LOT 1 local n'est pas déployé dans un environnement autorisé par cette mission.
- Les documents dont l'exigence réglementaire n'est pas exprimée sont signalés comme risques, non comme fonctionnalités manquantes confirmées.

## 11. Recommandation de périmètre LOT 3

Ordre strict recommandé :

1. Centraliser la résolution d'une archive canonique exacte et son diagnostic (`record`, fichier, hash), tout en conservant un fallback legacy explicite.
2. Étendre les états et reprises dédiées aux factures et reçus, puis aux avoirs/retours, sans ajouter d'étape au parcours normal.
3. Invalider/refetch les vues après toute réponse post-commit en erreur.
4. Qualifier en lecture seule `DEV-20261022-F9788D6C` sur l'environnement concerné avant toute réparation de donnée.
5. Faire trancher par le métier quels documents Atelier/Garantie doivent devenir des archives officielles ; exclure les simples impressions opérationnelles du LOT 3 tant que ce choix n'est pas validé.

Aucune de ces corrections n'a été commencée dans le présent lot.
