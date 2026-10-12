# LIVRAISON-LCA-03 — Bilan Phase A

Date : 12 octobre 2026  
Verdict : **PLAN DE SÉCURISATION PRÊT SOUS RÉSERVES**

## Synthèse

Les six accès historiquement exposés sont désormais distingués par leur libellé métier : Direction, Responsable Commercial, Conseiller Commercial, Chef d'Atelier, Comptabilité & Finance et Responsable Pièces. Les preuves montrent six identifiants applicatifs associés historiquement à un mot de passe de démonstration commun. Aucune valeur sensible n'est reproduite.

L'exposition ne concerne pas une clé JWT, un compte MySQL ou un service externe identifié : elle concerne des comptes utilisateurs de l'ERP. Leur existence actuelle, leurs environnements, propriétaires et droits effectifs restent à confirmer opérationnellement.

## Résultats techniques

- stockage actif attendu : hash Argon2 dans MySQL, jamais mot de passe en clair ;
- rotation native disponible par l'API utilisateurs ;
- mise à jour du hash et révocation des refresh tokens transactionnelles ;
- ancienne session API invalidée par contrôle du `sid` persistant ;
- socket déjà connectée à traiter explicitement ;
- aucun redémarrage backend, frontend ou MySQL normalement requis ;
- historique Git toujours sensible, mais exclu de l'archive RC2 et du mode de remise prévu.

## Réserves avant exécution

1. Identifier les environnements exacts et rapprocher les six comptes sans tester arbitrairement l'ancien secret.
2. Confirmer propriétaire, utilité, rôle, permissions, scopes, agence/concession et activité de chaque compte.
3. Nommer opérateur et valideur habilités.
4. Valider le coffre, le canal de transmission et la fenêtre de changement.
5. Décider désactivation définitive ou rotation pour chaque compte.
6. Prévoir la coupure ciblée des sockets et les contrôles métier avant désactivation.
7. Produire les preuves positives et négatives sans secret.

## Décisions de sécurité

| Objet | État |
|---|---|
| Inventaire des six accès | établi et anonymisé |
| Classification des risques | établie, à recalibrer avec le RBAC effectif |
| Procédure de rotation/révocation | prête |
| Procédure de récupération | prête |
| Rotation réelle | **NON EXÉCUTÉE** |
| Révocation réelle | **NON EXÉCUTÉE** |
| Réserve LCA-R01 | **OUVERTE** |
| Distribution | **BLOQUÉE** |
| Production | **NON AUTORISÉE** |

## Conditions de levée de LCA-R01

Les six lignes A1 à A6 doivent chacune porter le statut `Rotation confirmée` ou `Révocation confirmée`, avec environnement, date, responsable, double validation, ancienne authentification refusée, sessions révoquées et contrôle Socket.IO. Pour un compte conservé, le nouvel accès et les droits attendus doivent aussi être validés.

La levée de LCA-R01 ne suffira pas seule à autoriser une distribution : le mode de remise sans historique Git et l'autorisation formelle resteront requis. Elle n'autorise jamais automatiquement la production.

## Conclusion

Le plan est précis, applicable via les mécanismes existants et vérifiable. Il reste sous réserves parce que les informations opérationnelles et les autorisations nécessaires ne sont pas encore confirmées. Aucun accès, service, conteneur, volume, fichier de configuration, code, migration, RBAC ou donnée n'a été modifié pendant cette phase.
