# Rapport final — stabilisation complète du backend et du RBAC multi-agences

Date de clôture technique : 10 novembre 2026  
Périmètre : backend ERP LCA, autorisations multi-agences, tests backend, compilation et documentation.  
Exclusions respectées : frontend, commit, push, déploiement et manipulation de données de production.

## Verdict

La mission de correction et de stabilisation demandée est **terminée et validée sur le périmètre backend maintenu**.

La suite globale, qui comptait initialement 219 échecs, ne contient plus aucun échec :

| Mesure | Résultat final |
|---|---:|
| Tests découverts | 2 126 |
| Tests réussis | 2 029 |
| Tests échoués | **0** |
| Tests ignorés explicitement | 97 |
| Tests annulés / TODO | 0 / 0 |

Les 97 tests ignorés sont des scénarios conditionnels d'intégration lourde (notamment MySQL 8.4 isolé, concurrence, Socket.IO ou infrastructure dédiée). Ils sont déclarés `SKIP` par leurs propres préconditions ; ils ne constituent ni des échecs ni des tests masqués pendant cette stabilisation. Les principales recettes MySQL/HTTP/Socket.IO du RBAC avaient par ailleurs déjà été exécutées et validées dans une base jetable dédiée lors des phases précédentes.

## Situation de départ et progression

La première mesure globale disponible était :

| Étape | Réussis | Échecs | Ignorés |
|---|---:|---:|---:|
| État initial | 1 810 | 219 | 97 |
| Reprise intermédiaire | — | 83 | — |
| Audit global suivant | — | 42 | — |
| **Clôture** | **2 029** | **0** | **97** |

Les échecs restants provenaient principalement de contrats de tests historiques encore alignés sur les anciens scopes `CONCESSION/GLOBAL`, de fixtures basées sur l'ancien contexte JWT, d'assertions structurelles visant d'anciens helpers transactionnels et de quelques incohérences réelles de fraîcheur d'autorisation.

## Corrections réalisées

### Autorité et contexte de session

- L'autorité effective est reconstruite depuis la session persistée et l'agence active.
- Les rôles métier locaux proviennent des affectations d'agence ; `user_roles` ne confère une autorité transversale qu'au véritable rôle système prévu.
- Login, refresh, profil, 2FA et administration relisent le contexte effectif.
- Les révocations, changements d'agence et modifications d'habilitation invalident le contexte périmé.
- Un faux rôle nommé `SUPER_ADMIN` ne contourne aucune permission persistée.

### Contrat RBAC multi-agences

- Les modules métier migrés appliquent le contrat final `OWN` / `AGENCY`.
- L'agence et le propriétaire sont dérivés côté serveur ; une valeur fournie par le client ne peut pas agrandir le périmètre.
- `OWN` est refusé pour les ressources collectives sans propriétaire métier fiable.
- Les capacités réellement centrales restent soumises à une autorisation centrale explicite du vrai super-administrateur.
- Aucun transfert inter-agences n'a été ouvert sans règle d'autorité de destination documentée.

### Fraîcheur transactionnelle et concurrence

- Les mutations sensibles revalident session, agence active, rôles, permissions et version de contexte dans la transaction.
- Les ressources critiques sont rechargées et verrouillées avant mutation.
- Les helpers avec reprise d'interblocage conservent cette revalidation ; la facturation utilise désormais la variante transactionnelle avec retry d'autorisation courante.
- Les événements temps réel restent publiés après commit et dans le périmètre de l'agence active.

### Domaines couverts

Les corrections et validations couvrent notamment : authentification et 2FA, utilisateurs et habilitations, CRM, clients, showroom et essais, devis et proformas, ventes, véhicules et parc, livraisons, facturation et remboursements, trésorerie, pièces et achats, atelier/SAV/garanties, RH et prestataires, GED et documents officiels, paramètres, reporting, activité, dashboard, notifications et Socket.IO.

### Réalignement des tests historiques

- Les matrices Showroom et Véhicules ont été réalignées sur le comportement final réellement maintenu.
- Les fixtures d'authentification utilisent la session persistée et les affectations locales.
- Les assertions historiques `requirePermission`, transaction brute, `CONCESSION/GLOBAL` et anciens messages métier ont été remplacées par les primitives et contrats actuels.
- Les tests CRM ont été alignés sur l'indépendance voulue entre rendez-vous/essai et progression manuelle du pipeline.
- Les contrôles de concurrence, d'atomicité des images, d'archives GED, de cachets, de stock, de garantie et de workflows financiers ont été conservés, pas neutralisés.

## Inventaire des endpoints

L'inventaire final classe les **662 endpoints actifs** :

| Classification | Nombre |
|---|---:|
| Migré | 644 |
| Fonction personnelle conservée | 8 |
| Hors scope métier | 7 |
| Socle validé | 3 |
| À auditer | **0** |

L'écart avec les 664 routes historiques est expliqué par la suppression de deux anciennes collisions GED. La matrice détaillée est disponible dans `docs/RBAC-FINAL-INVENTAIRE-ENDPOINTS.md`.

## Validations finales exécutées

| Contrôle | Résultat |
|---|---|
| `npm test` | **Réussi — 2 126 tests, 0 échec** |
| `npm run lint` (`tsc --noEmit`) | **Réussi** |
| `npm run build` | **Réussi** |
| `git diff --check` | **Réussi** |
| Tests ciblés des derniers résidus | **Réussis** |

La suite globale a dû être exécutée hors du bac à sable restreint, car Supertest doit ouvrir des ports locaux et le bac à sable renvoyait `listen EPERM`. Dans l'environnement autorisé du projet, les mêmes tests HTTP ont réussi et l'exécution globale s'est terminée avec le code de sortie 0.

## Niveau de succès

| Objectif | État final |
|---|---|
| Fondations session/agence active | Validé |
| Permissions persistées et vrai Super Admin | Validé |
| Isolation métier `OWN` / `AGENCY` | Validé |
| Fraîcheur transactionnelle | Validé |
| Notifications et temps réel | Validé |
| Inventaire exhaustif | Validé — 0 endpoint à auditer |
| Compilation et qualité statique | Validé |
| Suite backend globale | **Validée — 0 échec** |

## Limites et décision de livraison

- Ce rapport valide le backend et les tests maintenus ; il ne prétend pas valider le frontend ni un déploiement de production.
- Les 97 scénarios conditionnels ignorés nécessitent leur infrastructure dédiée pour être rejoués tous ensemble. Les recettes de sécurité MySQL/HTTP/Socket.IO centrales déjà exécutées restent concluantes.
- Aucun commit, push ou déploiement n'a été effectué.

## Conclusion

La stabilisation demandée est un **succès complet sur le périmètre backend exécuté** : le RBAC multi-agences est inventorié sans reste à auditer, le contrat final est cohérent avec les tests, la compilation est propre et la suite globale se termine avec **zéro échec**. La décision de commit, de revue et de déploiement reste volontairement à la charge de l'équipe projet.
