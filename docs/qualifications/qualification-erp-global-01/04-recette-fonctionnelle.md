# Recette fonctionnelle

## Environnement et profils

MySQL 8.4 et applications Docker isolés, données fictives, concession et agences uniques générées par test. Profils exercés : Super Admin système, rôle ordinaire `AGENCY`, rôle sans permission, rôle `OWN`, agences sœur et autre concession.

## Cachets et documents

L'intégration B3.2.1 valide création sans propriétaire fourni, propriétaire dérivé de l'agence active, tentative de falsification ignorée, partage vers une agence sœur, visibilité et usage partagé, absence d'administration implicite, retrait d'affectation, refus sans permission, audit, types documentaires, inactivation et révocation.

LOT13 valide formats d'image, versions, snapshot historique byte-identique, double émission canonique, statuts inactifs, IDOR inter-agence/inter-concession, scopes, trois ordres de concurrence, compensation GED et retry.

## Interface

Le chemin attendu est `Paramètres de concession → Signatures et cachets → Cachets`. Les tests frontend confirment cases natives accessibles, propriétaire précoché/verrouillé, sélection totale, état indéterminé, permission de partage et sérialisation sans `agencyId` propriétaire.

Le navigateur local est indisponible dans ce chat. Les clics, l'affichage visuel, la persistance après rechargement et le téléversement manuel du logo n'ont donc pas été observés visuellement. Ils restent dans la recette humaine avant déploiement.

## Autorisations centrales

Les tests ciblés couvrent paramètres, checklists, services de livraison, 2FA et habilitations : un rôle ordinaire `AGENCY` est accepté quand il possède la permission, un rôle non habilité est refusé et les protections système restent actives. La recette visuelle Identité fiscale/logo reste à exécuter manuellement.
