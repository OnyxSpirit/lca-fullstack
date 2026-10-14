# Audit ciblé — contexte territorial des activités utilisateurs

Date : 14 octobre 2026  
Périmètre : code applicatif et base MySQL 8.4 locale, exclusivement en lecture. Aucune correction applicative ou SQL n'a été appliquée.

## 1. Résumé exécutif

L'affichage « Agence et concession non renseignées » reflète fidèlement les colonnes `audit_logs.agency_id` et `audit_logs.concession_id`; il ne résulte ni du rôle Super Administrateur ni d'un défaut d'affichage frontend.

La cause principale est la coexistence de deux générations de producteurs :

- `writeAudit` résout le contexte depuis la ressource, mais seulement pour une liste fermée de types d'entités ;
- de nombreux producteurs écrivent directement dans `audit_logs` sans renseigner les deux colonnes.

Même avec `writeAudit`, un type absent de `contextSql` produit volontairement deux valeurs nulles. La fonction ne reprend jamais implicitement l'agence de l'auteur, ce qui est une bonne précaution sémantique mais exige que chaque ressource métier soit explicitement résolue.

La base actuelle contient 105 événements : 102 sans aucun contexte et 3 avec agence et concession. Parmi les 102 événements sans contexte, 74 sont rattachables à une ressource territoriale existante, tandis que 28 correspondent à des opérations globales (rôles et référentiel constructeur/garant). Aucun couple partiel ni contexte contradictoire n'a été observé.

## 2. Fonctionnement actuel

### Écriture

`writeAudit(connection, request, input)` reçoit le module, le type d'entité, l'identifiant, l'action et les snapshots. Il ne reçoit aucun paramètre territorial explicite.

Il recherche `input.entityType` dans `contextSql` :

- si une requête existe et retourne la ressource, son agence et sa concession sont copiées ;
- si le type n'est pas enregistré, ou si la ressource n'est pas trouvée, les deux valeurs restent nulles ;
- aucune reprise de `request.user.agencyId` n'est effectuée ;
- aucune distinction explicite n'existe entre « global » et « inconnu » : les deux états sont stockés sous la même forme `NULL/NULL`.

Les types actuellement résolus comprennent notamment `user`, `sale`, `delivery`, `vehicle`, `customer_vehicle`, `vehicle_return`, certains objets RH et plusieurs objets de trésorerie. Les employés, devis, factures, paiements, documents, signatures, cachets, agences et concessions ne sont pas tous couverts.

### Lecture et affichage

`activity.routes.ts` joint directement `audit_logs.agency_id` et `concession_id` aux tables territoriales. Il n'effectue aucun enrichissement depuis la ressource au moment de la lecture. Lorsque les deux valeurs sont nulles, le frontend affiche « Agence et concession non renseignées ».

Cette lecture préserve l'historique enregistré, mais elle ne distingue pas une activité globale d'un contexte perdu.

## 3. Sources possibles des identifiants territoriaux

| Source | Comportement actuel |
|---|---|
| Agence de l'auteur | Jamais utilisée automatiquement par `writeAudit` |
| Ressource métier | Source privilégiée pour les types présents dans `contextSql` |
| Paramètres de `writeAudit` | Aucun paramètre `agencyId`/`concessionId` n'existe |
| Producteur direct | Décide lui-même ; la majorité omet les colonnes |
| Snapshot | Peut contenir une agence, mais n'est pas utilisé pour remplir les colonnes |
| Résolution à la lecture | Aucune |

Cette politique évite d'attribuer abusivement l'agence de l'auteur, mais la liste fermée et les écritures directes rendent le résultat incomplet.

## 4. Distinction des contextes

- **Agence de l'auteur** : rattachement du compte ayant déclenché l'action. Ce n'est pas une preuve du lieu métier.
- **Agence de la ressource** : rattachement canonique d'une vente, facture, livraison, employé, véhicule ou stock.
- **Agence de l'opération** : doit idéalement être figée lors de l'événement ; elle peut différer de l'agence courante de l'auteur ou d'une ressource modifiée ultérieurement.
- **Concession** : contexte supérieur, pertinent même lorsqu'une ressource n'a pas d'agence, par exemple un cachet de concession.
- **Administration globale** : rôles système et référentiel constructeur/garant dans les données observées.
- **Contexte inconnu** : absence de preuve fiable ; cet état est actuellement indiscernable de l'administration globale dans le schéma.

## 5. Audit prioritaire des ventes

Quatorze événements de vente existent : cinq créations, six changements de statut et trois annulations.

- 13 événements ont `agency_id` et `concession_id` à `NULL` ;
- la création la plus récente possède `agency_id=1`, `concession_id=1` ;
- les cinq ventes existent toujours ;
- elles sont toutes actuellement rattachées à l'agence de Brazzaville et à sa concession ;
- les cinq snapshots de création contiennent une agence ; les changements de statut et annulations ne la répètent pas ;
- quatre anciennes créations et les événements dérivés ont été écrits avant l'utilisation actuelle de `writeAudit` pour `sale` ;
- l'événement récent contextualisé prouve que le producteur moderne résout correctement la vente après son insertion.

Exemple anonymisé : une vente créée début octobre a une ressource métier encore présente avec agence Brazzaville, mais ses événements de création puis de statut sont `NULL/NULL`. Une autre vente créée le 12 octobre par le même type de parcours possède correctement les deux identifiants. La différence est celle du producteur/version du code, pas celle du commercial ni du rôle.

Le rattachement courant constitue une preuve forte de l'anomalie de journalisation. Il ne justifie toutefois pas à lui seul une mise à jour rétroactive : pour les événements sans snapshot territorial, il faut d'abord établir que l'agence d'une vente est historiquement immuable.

## 6. Activités du Super Administrateur

Le Super Administrateur a produit 56 événements : 55 sans contexte et un avec agence/concession. L'autre auteur en a produit 49 : 47 sans contexte et deux contextualisés.

Les activités Super Admin sans contexte couvrent :

- opérations globales légitimes : rôles et référentiel constructeur/garant ;
- opérations liées à une concession ou agence : paramètres d'agence/concession, logos, cachets ;
- opérations liées à une ressource territoriale : vente, devis, document, employé et utilisateur.

L'unique activité Super Admin contextualisée est une modification d'avatar d'un utilisateur : le producteur moderne `user.service` utilise `writeAudit`, dont le type `user` est résolu. Des modifications d'utilisateurs plus anciennes ou produites ailleurs restent nulles.

Conclusion : le rôle n'annule ni n'impose le contexte. Le résultat dépend de l'entité déclarée, du producteur utilisé et de la présence de ce type dans `contextSql`.

## 7. Principaux producteurs

| Domaine | Producteur observé | Situation territoriale |
|---|---|---|
| Ventes | `writeAudit`, type `sale` | Correct pour les nouveaux événements ; 13 anciens événements manquants |
| Utilisateurs | `writeAudit`, type `user`; anciens producteurs hétérogènes | Résolution correcte pour les événements modernes liés à un utilisateur |
| Devis | insertion directe | agence de la ressource omise |
| Facturation | insertion directe | facture/paiement/avoir/remboursement territoriaux omis |
| Livraisons | cœur modernisé via `writeAudit`; checklist et sous-flux directs | 15 événements actuels omettent un contexte pourtant identifiable |
| Documents | insertion directe | document possède des colonnes territoriales, non copiées |
| Signatures/cachets | `writeAudit`, types absents de `contextSql` | signature rattachable via l'utilisateur ; cachet au minimum via concession |
| RH employés | insertion directe dans `hr.routes.ts` | huit ressources possèdent agence et concession, non copiées |
| Atelier | kilométrage écrit explicitement avec territoire ; garantie directe sans territoire | comportement dépend du sous-producteur |
| Véhicules | route historique directe sans contexte ; type `vehicle` désormais résolvable par `writeAudit` | risque pour les nouveaux producteurs qui restent directs |
| Trésorerie | `writeAudit` avec plusieurs types couverts | bonne base, mais tous les types ne sont pas enregistrés |
| Pièces/fournisseurs | certains appels `writeAudit`, types souvent absents de la table de résolution | contexte potentiellement perdu |
| CRM | aucun événement CRM présent dans l'échantillon actuel | impossible de qualifier dynamiquement cette base |
| Administration | insertions directes et `writeAudit` | les opérations globales et territoriales ne sont pas distinguées explicitement |

## 8. Statistiques SQL actuelles

| Module | Total | Sans agence | Sans concession |
|---|---:|---:|---:|
| users | 24 | 22 | 22 |
| settings | 16 | 16 | 16 |
| deliveries | 15 | 15 | 15 |
| sales | 14 | 13 | 13 |
| documents | 13 | 13 | 13 |
| billing | 10 | 10 | 10 |
| hr | 8 | 8 | 8 |
| quotations | 5 | 5 | 5 |
| **Total** | **105** | **102** | **102** |

Les trois événements renseignés ont simultanément une agence et une concession. Aucun événement ne possède un seul des deux identifiants.

Rapprochements vérifiés en lecture seule :

- 13 ventes manquantes sur 13 ont une agence et une concession identifiables ;
- 15 livraisons sur 15 ;
- 5 devis sur 5 ;
- 5 factures, 3 paiements, 1 avoir et 1 remboursement ;
- 8 employés sur 8 ;
- 6 documents sur 6 ;
- 2 signatures sur 2 via leur utilisateur ;
- 5 cachets sur 5 au niveau concession ;
- 2 opérations utilisateur territoriales manquantes ;
- 2 agences et 6 concessions modifiées sont identifiables par la ressource ciblée.

## 9. Filtre « Toutes les agences autorisées »

Le prédicat RBAC est construit avant les filtres :

- `GLOBAL` : `1=1`, donc inclut les événements contextualisés et `NULL/NULL` ;
- `AGENCY` : `al.agency_id = agence du jeton`, donc exclut les événements sans agence ;
- `CONCESSION` : comparaison sur `al.concession_id`, donc exclut les événements sans concession ;
- `OWN` : filtre sur l'auteur et peut inclure ses événements sans contexte.

Lorsque l'utilisateur GLOBAL laisse le filtre d'agence vide, les événements sans agence sont inclus. Lorsqu'il sélectionne Brazzaville, la clause supplémentaire `al.agency_id=?` les exclut. Ce comportement SQL est cohérent pour un filtre strict « événements enregistrés avec cette agence ».

Le libellé « Toutes les agences autorisées » est cependant incomplet pour GLOBAL : il signifie en réalité « tout mon périmètre, y compris les activités globales ou sans contexte ». Une option distincte « Sans contexte territorial » ou un libellé explicatif serait plus fidèle. Les événements globaux ne doivent pas être artificiellement inclus dans Brazzaville.

## 10. Classification historique

La mention antérieure de 156 événements sans contexte concernait une base de 392 événements. La base inspectée aujourd'hui n'en contient que 105, dont 102 sans contexte. L'écart ne peut pas être interprété comme une correction de 54 lignes : il indique que le jeu de données courant n'est plus le même que celui de l'audit antérieur. Aucun historique absent ne peut être reconstitué depuis cette instance.

Classification du jeu actuel :

| Catégorie | Nombre | Interprétation |
|---|---:|---|
| A. Réellement globaux | 28 | rôles (20) et référentiel constructeur/garant (8) |
| B. Territoriaux correctement renseignés | 3 | une vente et deux modifications d'avatar |
| C. Territoriaux avec contexte manquant | 74 | ressource actuelle identifiable au niveau agence ou concession |
| D. Impossible à rattacher avec certitude | 0 dans l'échantillon courant | aucune ressource orpheline observée ; la certitude temporelle reste à démontrer avant rétroaction |
| E. Contexte incohérent | 0 | aucun couple partiel ou contradictoire détecté |

Cette classification distingue la nature fonctionnelle de l'événement. Elle ne constitue pas une autorisation de rétro-remplissage.

## 11. Causes exactes

1. Insertions directes omettant `agency_id` et `concession_id`.
2. Liste `contextSql` incomplète pour les producteurs centralisés.
3. Absence d'un contrat explicite imposant `GLOBAL`, `RESOURCE`, `EXPLICIT` ou `UNKNOWN`.
4. Aucune validation empêchant une ressource territoriale d'être journalisée sans contexte.
5. Aucun marqueur permettant de distinguer une opération globale d'une résolution échouée.
6. Historique créé par plusieurs versions de producteurs, visible notamment sur les ventes.

## 12. Risques fonctionnels

- événements métier invisibles aux utilisateurs `AGENCY` et `CONCESSION` malgré leurs permissions ;
- rapports territoriaux incomplets ;
- impression erronée que l'action Super Admin est globale ;
- confusion entre « global » et « donnée manquante » ;
- tentation dangereuse de reprendre l'agence de l'auteur ;
- enrichissement à la lecture depuis une ressource ayant changé depuis l'événement, ce qui réécrirait implicitement l'histoire présentée.

## 13. Recommandations et corrections proposées

### Nouveaux événements

1. Étendre le contrat de journalisation avec un mode obligatoire :
   - `GLOBAL` : aucun territoire par nature ;
   - `RESOURCE` : résolution dans la transaction depuis une ressource canonique ;
   - `EXPLICIT` : identifiants validés fournis par le service métier ;
   - `UNKNOWN` : résolution impossible, motif journalisé techniquement.
2. Remplacer progressivement toutes les insertions directes par le service central.
3. Étendre les résolveurs aux devis, factures, paiements, avoirs, remboursements, documents, signatures, cachets, employés, agences et concessions.
4. Pour une ressource d'agence, dériver la concession de l'agence dans la même transaction.
5. Pour une ressource de concession sans agence, conserver `agency_id=NULL` et renseigner la concession.
6. Refuser ou alerter lorsqu'un événement déclaré `RESOURCE` ne peut pas résoudre son contexte.
7. Ajouter des tests par producteur et scope RBAC, sans logique fondée sur le rôle.

### Historique et présentation

1. Ne modifier aucune ligne automatiquement.
2. Présenter séparément « Activité globale » et « Contexte territorial non enregistré » dès qu'un marqueur fiable est disponible.
3. Avant tout éventuel backfill, produire un script d'analyse réversible avec preuve par événement : snapshot territorial ou relation historiquement immuable.
4. Ne jamais utiliser uniquement l'agence actuelle de l'auteur.
5. Pour les ventes, privilégier le snapshot de création ; pour les statuts ultérieurs, documenter d'abord l'immutabilité de `sales.agency_id`.

### Filtres

1. Conserver les prédicats RBAC actuels.
2. Clarifier le libellé GLOBAL : « Tout mon périmètre, y compris global/sans contexte ».
3. Ajouter, sous permission inchangée, des choix de présentation « Avec contexte », « Sans contexte » et éventuellement « Global » lorsque le modèle saura les distinguer.
4. Une agence sélectionnée doit continuer d'exclure les événements non attribués.

## 14. Fichiers potentiellement concernés par une future correction

- `backend-node/src/modules/activity/audit-writer.ts`
- producteurs directs dans `quotations`, `billing`, `deliveries`, `documents`, `hr`, `vehicles`, `workshop`, `settings` et `notifications`
- producteurs `writeAudit` dont les entités ne sont pas résolues (`document-marks`, pièces, trésorerie complémentaire)
- `backend-node/src/modules/activity/activity.routes.ts`
- `frontend/src/modules/activity/ActivityPage.tsx`
- tests unitaires et d'intégration des producteurs et scopes
- une migration future uniquement si un marqueur de nature territoriale est validé fonctionnellement

## 15. Verdict final

**ANOMALIE CONFIRMÉE, CAUSE IDENTIFIÉE, CORRECTION NON APPLIQUÉE.**

L'absence de contexte est légitime pour 28 événements globaux, mais incorrecte pour 74 événements dont la ressource métier fournit aujourd'hui un rattachement fiable. Les trois événements correctement renseignés démontrent que la résolution moderne fonctionne pour les types couverts. La correction doit porter sur le contrat central et les producteurs, sans attribuer Brazzaville par défaut et sans réécrire l'historique avant validation d'une méthode de preuve.
