# LIVRAISON-LCA-03 Phase A — Inventaire des accès exposés

Date : 12 octobre 2026  
Client : La Congolaise de l'Automobile (LCA)  
Prestataire : BEROX  
Réserve : `LCA-R01`

## 1. Sources et méthode

L'inventaire recoupe les rapports ERP-21, les rapports LIVRAISON-LCA-02, le registre des réserves, le fichier local retiré du suivi et les mécanismes d'authentification actuels. Le fichier historique a été lu uniquement pour établir sa structure : aucune adresse, aucun mot de passe et aucune empreinte n'est reproduit.

Les preuves établissent six identifiants de comptes applicatifs et **un mot de passe de démonstration historiquement commun**. Elles ne permettent pas d'établir sur quel environnement chaque compte existe encore, si son libellé correspond toujours à son rôle RBAC effectif, ni s'il a déjà été renouvelé. Tous les accès restent donc exposés par précaution.

## 2. Inventaire anonymisé

| ID | Libellé métier historique | Service | Catégorie | Environnement | Configuration historique / active | Utilisation présumée à confirmer | Risque dominant | Statut |
|---|---|---|---|---|---|---|---|---|
| LCA-R01-A1 | Direction | authentification ERP | identifiant + mot de passe partagé | à identifier | ancien fichier retiré ; hash Argon2 dans `users.password_hash` si le compte existe | pilotage/direction ; rôle et scopes réels à relever | accès potentiellement étendu et exposition de données transversales | À traiter |
| LCA-R01-A2 | Responsable Commercial | authentification ERP | identifiant + mot de passe partagé | à identifier | même mécanisme | supervision commerciale ; rôle et scopes réels à relever | consultation ou action sur CRM, ventes et décisions commerciales | À traiter |
| LCA-R01-A3 | Conseiller Commercial | authentification ERP | identifiant + mot de passe partagé | à identifier | même mécanisme | activité commerciale ; rôle et scopes réels à relever | usurpation, modification de prospects, clients ou ventes | À traiter |
| LCA-R01-A4 | Chef d'Atelier | authentification ERP | identifiant + mot de passe partagé | à identifier | même mécanisme | supervision atelier ; rôle et scopes réels à relever | altération d'ordres de réparation, affectations ou suivi atelier | À traiter |
| LCA-R01-A5 | Comptabilité & Finance | authentification ERP | identifiant + mot de passe partagé | à identifier | même mécanisme | fonctions financières ; rôle et scopes réels à relever | confidentialité financière, écritures ou validations non autorisées | À traiter |
| LCA-R01-A6 | Responsable Pièces | authentification ERP | identifiant + mot de passe partagé | à identifier | même mécanisme | stock et pièces ; rôle et scopes réels à relever | mouvements de stock ou réservations non autorisés | À traiter |

Les libellés sont ceux du document historique, pas une preuve du rôle actuel. L'identification opérationnelle doit utiliser l'identifiant masqué comme clé de rapprochement sans le recopier dans un rapport.

## 3. Chaîne technique concernée

| Composant | Dépendance ou effet |
|---|---|
| Frontend | saisit les identifiants, conserve localement les jetons de la session active et propose le changement du mot de passe propre |
| Backend | vérifie le hash Argon2, émet JWT d'accès et de refresh avec identifiant de session, applique RBAC et scopes |
| MySQL | tables `users`, `user_roles`, `role_permissions` et `refresh_tokens` ; aucune valeur en clair attendue dans `users.password_hash` |
| API utilisateurs | `PATCH /users/:id/password` avec `users.reset_password`, ou `PATCH /users/me/password` avec secret actuel |
| Sessions | une réinitialisation révoque dans la même transaction toutes les lignes `refresh_tokens` encore actives du compte |
| JWT d'accès | l'authentification de chaque requête vérifie aussi que la session persistée liée au claim `sid` reste active |
| Socket.IO | une socket déjà connectée n'est pas nécessairement réévaluée au moment du reset ; coupure ciblée à prévoir |
| Docker | backend/frontend/mysql hébergent le mécanisme, mais aucune reconstruction n'est requise pour une rotation de compte |

## 4. Classification des risques

| Critère | Évaluation |
|---|---|
| Confidentialité | élevée : six identifiants et un secret commun étaient récupérables depuis l'historique Git |
| Intégrité | élevée : l'impact dépend des permissions et scopes effectifs de chaque compte |
| Disponibilité | modérée pendant rotation : désactivation ou erreur de remise du nouveau secret peut interrompre un utilisateur légitime |
| Propagation | élevée : la réutilisation historique d'un même secret rend la compromission corrélée entre les six comptes |
| Traçabilité | limitée avant rapprochement : environnement, propriétaire et usages récents ne sont pas encore attestés |

Priorité provisoire : A1 et A5 critiques ; A2, A4 et A6 élevées ; A3 élevée. Cette priorité doit être recalée sur le RBAC, les scopes, l'activité et l'environnement constatés, sans jamais tester l'ancien secret hors procédure autorisée.

## 5. Méthodes de révocation, rotation et vérification

- compte inutile : désactivation via la fonction d'administration, révocation des sessions et coupure Socket.IO ciblée ;
- compte conservé : nouveau secret unique généré dans le coffre autorisé, réinitialisation via l'API d'administration, puis transmission hors rapport ;
- besoin de coupure immédiate : désactivation contrôlée avant rotation, puis réactivation seulement après contrôle de l'absence d'activité métier incompatible ;
- vérification positive : connexion avec le nouveau secret, `/auth/me`, rôle, agence et scopes attendus, puis action métier minimale non destructive ;
- vérification négative : ancien accès refusé et ancienne session API refusée, sans journaliser la valeur testée ;
- preuve : ID anonymisé, environnement, horodatage, opérateur, double validation, résultat des contrôles et référence du ticket/coffre — jamais le secret.

## 6. Informations encore requises

Pour chaque ligne : environnements où l'identifiant existe, ID interne du compte, état actif, agence/concession, rôle et scopes effectifs, dernière connexion, sessions actives, propriétaire métier, nécessité du compte et éventuelle socket/activité en cours. Ces éléments doivent être collectés en lecture seule par une personne habilitée lors de la phase d'exécution.

## 7. Historique Git

Le chemin historique `frontend/src/services/accesDemo.txt` n'est plus suivi dans l'arbre assaini et n'est pas inclus dans RC2. Il demeure récupérable dans d'anciens commits. Un clone, miroir ou bundle reste donc interdit à la remise. La voie retenue demeure l'export assaini sans `.git`; elle confine l'exposition mais ne remplace pas la rotation.

