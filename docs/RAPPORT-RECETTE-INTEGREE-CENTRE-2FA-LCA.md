# Rapport de recette intégrée — Centre de sécurité 2FA, lot 6A

Date : 16 octobre 2026  
Mode : validation uniquement, sans correction fonctionnelle.

## 1. Environnement de test utilisé

- Dépôt local, branche `main`, modifications non commitées des lots 1 à 5 préservées.
- MySQL `8.4.11`, conteneur du projet distinct `lca-recette` déjà actif avant la mission.
- Les bases persistantes `lca_recette` et métier n'ont pas été utilisées ni modifiées.
- Deux schémas temporaires explicitement dédiés ont été créés dans le serveur recette :
  - `lca_2fa_lot6a_20261016_a` : installation fraîche ;
  - `lca_2fa_lot6a_20261016_b` : préparation au niveau 087 puis mise à niveau 088→090.
- Les données créées étaient fictives et limitées aux schémas temporaires.
- Les deux schémas temporaires ont été supprimés définitivement après collecte des résultats ; ils ne sont pas récupérables, mais ne contenaient aucune donnée métier.
- Aucun conteneur n'a été démarré, arrêté, reconstruit ou redémarré.
- Aucun secret réel n'a été créé ou modifié.

## 2. Migrations vérifiées

### Installation fraîche

Le gestionnaire officiel a installé la baseline 071, les migrations intermédiaires puis les migrations 088, 089 et 090. Niveau final déclaré : 90. Une reprise idempotente a confirmé `Database VERSIONED; niveau >= 90`.

### Mise à niveau depuis 087

Une seconde base a été préparée avec la baseline puis les migrations 072 à 087. Une donnée témoin a été ajoutée avant la mise à niveau. Le gestionnaire officiel a ensuite appliqué, dans l'ordre :

1. `088_two_factor_strong_authentication.sql` ;
2. `089_two_factor_security_governance.sql` ;
3. `090_two_factor_trusted_devices.sql`.

La donnée témoin était toujours présente après migration. Une nouvelle exécution du runner n'a créé ni doublon ni modification supplémentaire.

### Schéma obtenu

- `refresh_tokens.strong_auth_at` : `DATETIME NULL` ;
- table `two_factor_trusted_devices` complète ;
- PK sur `id` ;
- unicité du `token_hash` ;
- FK utilisateur avec suppression en cascade ;
- FK révocateur avec mise à NULL ;
- index utilisateur/état et expiration/révocation présents ;
- permissions 2FA personnelles, individuelles, politiques, paramètres et appareils présentes ;
- paramètres : confiance désactivée, 7 jours, plafond 30 jours, step-up 10 minutes.

## 3. Scénarios exécutés

### MySQL réel

- installation fraîche jusqu'au niveau 090 : réussi ;
- mise à niveau 087→090 : réussi ;
- reprise après interruption du runner : réussi ;
- seconde exécution idempotente : réussi ;
- conservation d'une donnée préexistante : réussi ;
- vérification des colonnes, FK, contraintes et index : réussi ;
- vérification des permissions et paramètres par défaut : réussi ;
- rotation concurrente d'un jeton de confiance : une seule transaction gagnante, compteur de rotation égal à 1, expiration inchangée ;
- UTC sous sessions `+00:00` et `+05:00` : `UTC_TIMESTAMP()` identique, tandis que `NOW()` reflète correctement le fuseau de session.

### Tests automatisés backend

Sept fichiers ciblés réussis : baseline/migrations, authentification, step-up, gouvernance, appareils, gestion des appareils et centre unifié. Résultat : 7/7 fichiers réussis.

Les contrats validés couvrent notamment :

- mot de passe toujours requis avant la confiance appareil ;
- TOTP, anti-rejeu et récupération ;
- refresh ne prolongeant pas le step-up ;
- paramètres bornés ;
- cookie HttpOnly, SameSite Strict, chemin `/api/auth` et Secure en production ;
- jeton opaque, hash seul en base et rotation ;
- révocations sur mot de passe, reset 2FA et désactivation ;
- scopes OWN/AGENCY/CONCESSION/GLOBAL ;
- protection du Super Administrateur ;
- pagination, compteurs SQL et absence de secrets.

### Tests automatisés frontend

- lint TypeScript : réussi ;
- build Vite : réussi ;
- authentification 2FA : 9/9 réussis ;
- gouvernance : 3/3 réussis ;
- centre unifié : 3/3 réussis ;
- gestion des appareils : 2 fichiers réussis.

Navigation unique, anciennes redirections, consultation seule, états vides/erreurs, pagination, recherche, composants réutilisés, modal de step-up et absence de rejeu automatique ont été vérifiés statiquement.

## 4. Résultats détaillés par lot

| Lot | Résultat | Éléments validés |
|---|---|---|
| 1 | Conforme avec réserve E2E | step-up, expiration, preuves requises, anti-rejeu, refresh |
| 2 | Conforme | paramètres, bornes, scopes globaux, permissions indépendantes |
| 3 | Conforme | cookie, hash, rotation, expiration absolue, révocations transversales |
| 4 | Conforme | listes personnelles/admin, scopes, pagination, révocation, audit/notification |
| 5 | Conforme | six espaces, accès par permission, compteurs scoped, redirections et cache |

## 5. Tests non exécutés et raisons

Les scénarios suivants ne sont pas déclarés réussis :

- connexion HTTP réelle mot de passe/TOTP/récupération ;
- refresh, logout et révocation d'une session via API réelle ;
- parcours navigateur complet des six onglets ;
- cookie Secure observé derrière HTTPS réel ;
- tests responsive visuels et navigation clavier en navigateur ;
- matrice API réelle avec plusieurs JWT de comptes AGENCY/CONCESSION/GLOBAL ;
- notifications et audits observés via l'application en fonctionnement.

Raison : les conteneurs backend de recette disponibles étaient déjà en redémarrage continu et ne contenaient pas les sources non reconstruites des lots 1 à 5. La mission interdisait leur reconstruction ou redémarrage. Lancer un autre environnement applicatif complet aurait nécessité une préparation opérationnelle dépassant la validation autorisée. Ces scénarios restent donc bloqués, pas validés.

## 6. Anomalies découvertes

### REC-2FA-6A-001 — Environnement applicatif de recette indisponible

- Gravité : moyenne, blocage de recette E2E ;
- Module : infrastructure locale de recette ;
- Reproduction : inspection de l'état des conteneurs avant test ;
- Attendu : backend recette healthy et aligné sur les lots 1 à 5 ;
- Obtenu : backend `lca-recette` déjà en redémarrage continu, frontend actif avec une image antérieure ;
- Cause probable : environnement non reconstruit et migrations/configuration non alignées ;
- Fichiers concernés : Docker Compose et images locales, sans modification durant cette mission ;
- Recommandation : effectuer le lot opérationnel autorisé de reconstruction sur un environnement de recette, après sauvegarde et vérification des variables de test.

Aucune anomalie fonctionnelle prouvée n'a été détectée par les tests exécutables.

## 7. Risques de sécurité résiduels

- Les contrôles RBAC sont vérifiés par tests et SQL, mais pas encore avec une matrice complète de JWT réels.
- Les attributs du cookie sont validés dans le code, pas observés sur une terminaison HTTPS réelle.
- Les logs et audits sont contrôlés statiquement ; une observation runtime reste nécessaire.
- Les comportements multi-session complets restent à tester via plusieurs clients HTTP réels.

## 8. Compatibilité des lots 1 à 5

Les migrations sont compatibles entre elles et le schéma 087 est mis à niveau sans perte de la donnée témoin. Les tests ciblés confirment la cohérence des contrats frontend/backend et des invalidations TanStack Query. Le test MySQL de concurrence confirme qu'un ancien jeton ne peut produire qu'une rotation gagnante.

## 9. Prérequis de déploiement

1. sauvegarde vérifiée de la base cible ;
2. validation des variables 2FA et d'une clé de chiffrement hors dépôt ;
3. application contrôlée de 088, 089 et 090 sur une copie de recette ;
4. reconstruction du backend et du frontend de recette ;
5. backend et MySQL healthy ;
6. exécution de la matrice API/JWT et de la recette navigateur listées comme bloquées ;
7. validation des audits, notifications, HTTPS et cookies ;
8. autorisation séparée avant toute intervention métier ou déploiement.

## 10. Verdict final

**VALIDÉ AVEC RÉSERVES**

Les migrations, le schéma MySQL 8.4, la reprise, l'idempotence, la conservation des données, la concurrence de rotation, les builds et les tests ciblés des lots 1 à 5 sont validés. La réserve porte sur l'absence de recette HTTP et navigateur réelle, bloquée par l'état préalable de l'environnement et l'interdiction de reconstruire ou redémarrer Docker.

Aucune base métier, aucun VPS et aucun secret réel n'ont été modifiés. Aucun déploiement, commit, push ou changement de branche n'a été effectué.
