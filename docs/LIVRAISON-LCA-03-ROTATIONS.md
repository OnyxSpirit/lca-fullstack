# LIVRAISON-LCA-03 Phase B — Rotations contrôlées

Date : 12 octobre 2026  
Client : La Congolaise de l'Automobile (LCA)  
Prestataire : BEROX

## 1. Périmètre examiné

Les six références anonymisées de Phase A ont été recherchées dans les cinq environnements Docker actifs, sans afficher les identifiants historiques :

| Environnement | Nature documentée | Utilisateurs présents | Comptes A1–A6 retrouvés | Sessions actives associées | Autorisation explicite de rotation |
|---|---|---:|---:|---:|---|
| `lca` | environnement historique/principal ; production non établie | 2 | 0 | 0 | absente |
| `lca-recette` | recette | 24 | 0 | 0 | absente |
| `lca-qualification` | qualification | 2 | 0 | 0 | absente |
| `lca-requalification` | requalification | 2 | 0 | 0 | absente |
| `lca-restauration` | restauration isolée | 3 | 0 | 0 | absente |

La recherche a rapproché exactement les six identifiants du fichier historique avec la table `users`, puis agrégé état, agence, rôles et sessions actives. Elle n'a renvoyé aucune ligne dans les cinq bases, alors que celles-ci contiennent ensemble 33 utilisateurs. Aucun identifiant, hash, jeton ou mot de passe n'a été écrit dans les sorties.

## 2. Autorisations

La demande Phase B impose une autorisation explicite par environnement et par compte et précise qu'elle ne vaut pas autorisation générale. Aucun document disponible ne désigne :

- l'environnement opérationnel propriétaire des comptes historiques ;
- les responsables métier de A1 à A6 ;
- une fenêtre de changement ;
- un opérateur habilité et un valideur ;
- une décision conserver ou désactiver pour chaque compte.

Les conditions de modification réelle ne sont donc pas réunies.

## 3. Opérations réalisées

- inventaire Docker en lecture seule des projets actifs ;
- requête SQL `SELECT` anonymisée dans chacune des cinq bases MySQL ;
- contrôle documentaire des autorisations disponibles ;
- vérification du mécanisme natif de rotation et de révocation dans le code.

## 4. Rotations effectuées

**Aucune.** Aucun des six comptes n'existe dans les cinq bases actives inspectées et aucune autorisation de changement n'est documentée. Créer ces comptes pour les faire tourner aurait augmenté la surface d'attaque et violé le périmètre.

## 5. Rotations non effectuées

| Référence | Résultat dans les cinq environnements | Opération | Motif |
|---|---|---|---|
| LCA-R01-A1 | absente | non effectuée | aucune cible existante ni autorisée |
| LCA-R01-A2 | absente | non effectuée | aucune cible existante ni autorisée |
| LCA-R01-A3 | absente | non effectuée | aucune cible existante ni autorisée |
| LCA-R01-A4 | absente | non effectuée | aucune cible existante ni autorisée |
| LCA-R01-A5 | absente | non effectuée | aucune cible existante ni autorisée |
| LCA-R01-A6 | absente | non effectuée | aucune cible existante ni autorisée |

## 6. Actions requises

1. Le propriétaire LCA/BEROX doit confirmer que ces cinq environnements constituent l'inventaire complet ou identifier toute cible supplémentaire.
2. Pour toute cible supplémentaire, fournir une autorisation par environnement et par compte, avec opérateur, valideur et fenêtre.
3. Si un compte existe ailleurs, appliquer le plan Phase A : désactivation si inutile, sinon rotation native avec secret unique, révocation et contrôles négatifs/positifs.
4. Si l'inventaire complet confirme l'absence des six comptes partout, produire une attestation propriétaire de non-existence ; cette preuve pourra remplacer une rotation impossible.

## 7. Préservation

Aucun compte, rôle, permission, scope, hash, session, donnée métier, conteneur, volume, réseau ou fichier de configuration n'a été modifié. Aucun service n'a été arrêté ou redémarré.
