# ERP LCA — Rapport final des validations techniques

Date : 11 novembre 2026  
Périmètre : backend Node.js, frontend, RBAC multi-agences, MySQL 8.4, concurrence financière, GED, realtime et WSS/TLS.

## Verdict

La mission est **validée techniquement** sur le périmètre demandé. Les campagnes finales ne présentent aucun échec connu : suite backend exhaustive, frontend complet, campagne MySQL conditionnelle sur schéma vierge, migrations autonomes, prestataires/personnel, lint, builds et WSS/TLS réel sont verts.

Aucun commit, push, déploiement, accès production ou suppression de données métier n'a été effectué. Les modifications restent non commitées.

## Environnement et preuves

- MySQL 8.4 jetable sur `127.0.0.1:33323`.
- Schéma collectif final vierge : `lca_conditional_test_final13`.
- Bootstrap réel : migrations 001 à 116 appliquées avec succès.
- Stockage GED isolé : `/tmp/lca-ged-final13`.
- Terminaison TLS jetable locale, certificat serveur signé par une CA de test explicitement fournie au client.
- Vérification TLS active : `rejectUnauthorized: true`; aucun contournement TLS.

## Résultats finaux

| Contrôle | Résultat final |
|---|---:|
| Campagne conditionnelle MySQL vierge | 120 découverts, 109 réussis, 11 exclus du lot, 0 échec |
| Validations migrations autonomes | 10/10 réussies |
| Prestataires et personnel unifié | 2/2 réussies |
| Backend complet `npm test` | 2 126 découverts, 2 029 réussis, 97 conditionnels ignorés, 0 échec |
| Backend lint | réussi |
| Backend build | réussi |
| Frontend complet | 992/992 réussis |
| Frontend lint | réussi |
| Frontend build production | réussi, 2 525 modules transformés |
| WSS/TLS réel | 1/1 réussi |
| Retours véhicule concurrents | 11/11 réussis |
| LOT13 GED/cachets | 11/11 sous-tests réussis dans la campagne finale |
| Reporting MySQL | 5/5 réussis |
| Préproduction MySQL | 1/1 réussi |

Les 11 tests exclus de la campagne collective correspondent aux lots exécutés séparément : migrations, prestataires/personnel et WSS. Ils ont tous été rejoués dans leur infrastructure dédiée et sont verts.

Le nombre frontend 206 mentionné dans un ancien rapport provenait d'un passage partiel. La commande complète sans filtre découvre et exécute 992 tests ; c'est ce résultat qui fait foi.

## Corrections réalisées

### RBAC multi-agences

- Les anciennes portées métier locales `CONCESSION` et `GLOBAL` sont rabattues sur `AGENCY` ; elles n'ont pas été réintroduites.
- Le véritable `SUPER_ADMIN` système reste central pour l'administration, mais ses accès aux ressources métier sont bornés à son agence active.
- Les autorisations métier propagent désormais la portée effective dans le contexte de requête, y compris après revalidation transactionnelle.
- Les fixtures utilisent des sessions persistées, une agence active et les affectations `user_agencies` / `user_agency_roles` réelles.
- Les matrices Showroom et Stock véhicules ont été réalignées sur le contrat final : agence active autorisée, agences étrangères masquées ou refusées.

### Backend métier et transactions

- Les transactions financières réelles utilisent `READ COMMITTED` afin qu'une lecture après attente de verrou observe l'état validé par le gagnant.
- Les scénarios de retour véhicule, paiement, remboursement et résolution concurrente sont atomiques et ne produisent ni double crédit ni artefact orphelin.
- Les routes de gestion des rôles n'ouvrent plus une transaction centrale imbriquée autour d'un service déjà transactionnel.
- Ventes, documents métier, livraisons, notifications et reporting utilisent la portée agence effective.
- Treasury Flow isole ses assertions par auteur de fixture et sélectionne explicitement l'agence active de la session administrateur.

### Notifications et realtime

- La sélection des destinataires s'appuie sur `user_agencies` et `user_agency_roles`, avec l'agence d'opération stricte.
- Les anciens calculs collectifs fondés sur `user_roles` et les portées historiques ont été retirés.
- Les tests réels confirment l'authentification socket, le jeton invalide, la révocation, le changement d'agence, l'isolation des salles et les notifications autorisées.

### GED et cachets

- Les accès documents métier du super administrateur sont bornés à l'agence active.
- Le contrôle d'un type documentaire à workflow explicite précède la résolution territoriale, ce qui restitue l'erreur métier correcte sans élargir le périmètre.
- Les fixtures GED utilisent un stockage isolé dès le début de campagne et vérifient rollback, retry, intégrité, snapshots, audit et absence d'artefacts.

### Migrations et fixtures

- Le runner est validé jusqu'à la version courante 116 : fresh install, reprise après interruption DDL/DML, checksum, conservation des données et concurrence.
- L'index Treasury publié est vérifié dans sa forme actuelle incluant `account_id`.
- Les migrations 054, 080, 085, 093, 094, 097 et 101 ont été exécutées dans leurs scénarios autonomes.
- Les fixtures RH Stock, Treasury Flow, Treasury Closure, catégories et rallonges budgétaires sont vertes sur MySQL réel.

## WSS/TLS

Le proxy TLS jetable a relayé le véritable endpoint Socket.IO `/socket.io` vers le backend de recette. Le client a validé la chaîne avec la CA de test fournie. Les preuves couvrent :

- connexion WSS et authentification par session persistée ;
- reconnexion authentifiée ;
- refus d'un jeton invalide ;
- refus immédiat après révocation de session ;
- changement d'agence et isolation inter-agences via la campagne realtime MySQL ;
- émission de notifications uniquement vers le contexte utilisateur/agence autorisé.

## Conclusion

Les défauts résiduels étaient soit des anomalies applicatives réelles, soit des fixtures attendant encore les anciennes portées, soit des configurations de campagne incomplètes. Ils ont été diagnostiqués, corrigés puis rejoués. La dernière campagne collective vierge, les validations autonomes et les suites complètes sont toutes sans échec.

Verdict final : **succès complet des validations techniques demandées, sans régression bloquante connue**.
