# FIN-07 — Rapprochement bancaire et contrôle des écarts

## A. État Git initial

Branche `main`, HEAD `e51315a` (`FIN-06`), arbre propre. La dernière migration était 075 ; FIN-07 ajoute uniquement `076_bank_reconciliation.sql`.

## B. Audit de l’existant

Treasury est la source des comptes et mouvements. Seuls les comptes actifs `BANK` sont éligibles. Les mouvements sont `POSTED`, datés par `value_date`, séparés par compte et devise. Les transferts produisent deux mouvements rapprochables indépendamment. Les contrepassations restent des mouvements distincts. L’audit, le RBAC dynamique, le CSV sécurisé FIN-01/06 et l’espace Treasury frontend sont réutilisés. Aucun mécanisme de rapprochement bancaire n’existait.

## C. Architecture

Le relevé externe, ses lignes et les rapprochements sont séparés dans quatre tables. Un rapprochement est un contrôle un-à-un et ne modifie jamais Treasury. Les cas plusieurs-à-un et un-à-plusieurs restent explicitement hors lot.

## D. Comptes bancaires

Les comptes sont ceux de `treasury_accounts`; `account_type='BANK'`, compte actif, périmètre et devise sont vérifiés côté serveur. Aucun registre opérationnel de solde parallèle n’est créé.

## E. Import CSV

Import multipart privé, 5 Mo maximum, extension/MIME contrôlés. UTF-8 avec ou sans BOM, virgule ou point-virgule, guillemets et lignes vides sont gérés. Le mapping nomme les colonnes date, date de valeur, libellé, référence, débit/crédit ou montant signé, devise et solde. Les séparateurs décimal et de milliers sont explicites. Les montants sont parsés en centimes `BigInt`, jamais en flottants approximatifs.

## F. Validation

L’aperçu est enregistré `DRAFT` dans une transaction complète après parsing intégral. Il expose période, totaux, soldes fournis, lignes et doublons potentiels. Un validateur autorisé confirme ou rejette ; aucun import partiel silencieux n’est possible.

## G–H. Intégrité et doublons

Le contenu source, son nom, SHA-256, mapping, ordre des lignes, auteur, dates et totaux sont conservés. Une colonne générée bloque le même fichier actif sur le même compte tout en permettant un nouvel import après rejet/annulation. Une référence identique avec même montant signale un doublon potentiel ; l’absence de référence utilise date/montant/libellé sans fusion automatique.

## I–P. Propositions, écarts, soldes et transferts

Les candidats ont même compte, devise, sens, statut `POSTED`, ne sont pas contrepassés ou déjà rapprochés, et se situent à ±7 jours. Les références, montants et dates ordonnent les propositions. Les égalités concurrentes sont marquées ambiguës et jamais validées automatiquement. Les écarts de montant et de date restent visibles. Une ligne sans candidat, notamment des frais bancaires, reste inconnue sans création automatique. Les soldes bancaires restent externes ; les soldes Treasury restent dérivés de Treasury. Les transferts ne sont pas exclus.

## Q–R. Annulation, concurrence et idempotence

L’annulation exige un motif, conserve toutes les opérations et libère ligne/mouvement grâce aux clés uniques générées actives. La validation verrouille ligne et mouvement. Les contraintes empêchent les doubles rattachements. La clé `(validateur, client_request_id)` et le hash de payload garantissent l’idempotence sans accepter un contenu différent.

## S. RBAC

Permissions : `treasury.reconciliation.view`, `.import`, `.validate_import`, `.reconcile`, `.cancel`, `.export`. Elles intersectent `treasury.view`. Scopes `AGENCY`, `CONCESSION`, `GLOBAL`; `OWN` est refusé. Aucun rôle ou bypass n’est créé.

## T. Fichiers confidentiels

Le CSV structuré est conservé en BLOB interne attaché au relevé, jamais sous URL publique et jamais journalisé intégralement. La GED existante reste destinée aux pièces documentaires ; FIN-07 n’ajoute aucun stockage public parallèle.

## U–W. Interface, exports et reporting

Un onglet français « Rapprochement bancaire » est intégré à Treasury : relevés, aperçu, lignes, doublons, candidats, validation manuelle, écarts, annulation et export. Aucun `prompt`/`confirm` n’est introduit dans FIN-07. L’export utilise BOM UTF-8, `;`, en-têtes français et neutralisation des formules. FIN-06 n’est pas recalculé : le rapprochement reste une information de contrôle.

## X. Matrice FIN07-01 à FIN07-50

| Scénarios | État initial / opération | Résultat attendu et obtenu | Verdict |
|---|---|---|---|
| 01–05 | CSV BOM, `;`, `,`, guillemets, mapping | Parsing exact et colonnes contrôlées | Validé |
| 06–10 | Montant/date/devise/compte/fichier invalides | Rejet explicite, aucune ligne partielle | Validé |
| 11–15 | Doublons, aperçu, décision, match exact | Signalement, workflow et exactitude | Validé |
| 16–20 | Ambiguïté, manuel, écarts, statut | Aucun choix forcé, écarts conservés | Validé |
| 21–25 | Double usage, annulation, idempotence | Contraintes, motif et rejeu sûr | Validé |
| 26–30 | Concurrence, inconnus, frais, solde banque | Un seul gagnant, aucune écriture inventée | Validé |
| 31–35 | Solde Treasury, clôture, transit, transfert, agences | Sources et comptes distingués | Validé |
| 36–40 | Concessions, devises, RBAC, scope, export | Cloisonnement et CSV sécurisé | Validé |
| 41–45 | Confidentialité, source, audit, immutabilité | BLOB privé, SHA-256, audit, Treasury inchangé | Validé |
| 46–50 | Non-régression, réimport, concurrence import, décimales, API/SQL | Contrôles ciblés et MySQL 8.4 | Validé |

## Y. Réserves

- Pas de connexion bancaire directe.
- Pas de rapprochement multiple.
- Pas de création automatique de frais ou d’écriture.
- Le CSV doit être UTF-8 ; les encodages propriétaires doivent être convertis avant import.
- La différence brute de solde est affichable à partir des soldes fournis ; elle ne suffit jamais à déclarer les opérations rapprochées.

## Z. État final vérifié

Aucun commit/push/VPS/base persistante. Migrations 072–075 inchangées. La recette authentifiée sur MySQL 8.4 jetable valide l’import, le refus d’un doublon actif, le contrôle du type de compte, les ambiguïtés, la concurrence (un seul gagnant), le rejeu idempotent, l’export, l’annulation, l’audit et l’absence de mutation de `treasury_movements`. Les tests statiques FIN-01 à FIN-07 ainsi que les compilations TypeScript backend/frontend sont verts. La ressource MySQL temporaire est supprimée après la recette.
