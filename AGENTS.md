# Règles permanentes du projet LCA

## Migrations MySQL

- Réutiliser exclusivement le runner, le bootstrap, la numérotation et les journaux existants. Le moteur de migration est un socle stable ; une évolution métier ordinaire ne doit pas le modifier.
- Une migration exécutée sur un environnement persistant est immuable. Une correction ultérieure est normalement une nouvelle migration additive portant un numéro unique. Une récupération historique exceptionnelle doit être déterministe, documentée, vérifiée et testée.
- Ne jamais contourner les checksums, falsifier les journaux, supprimer un état `FAILED_PARTIAL`, ni reconnaître une étape sans vérifier ses postconditions réelles.
- Concevoir les migrations additives, idempotentes et résilientes aux interruptions. Un objet déjà présent n'est conforme qu'après comparaison de sa définition ; toute incompatibilité réelle doit bloquer avec un diagnostic précis.
- Préserver les données et relations historiques. Qualifier réellement chaque migration sur MySQL 8.4 : installation fraîche, montée depuis la version précédente, copie historique représentative, rejeu, reprise pertinente, contraintes, permissions et démarrage complet de l'ERP.
- Respecter les conventions documentées dans `backend-node/database/migrations/README.md` et `docs/architecture/politique-migrations-mysql.md`. Ne jamais réutiliser un numéro ni créer deux migrations de même numéro.

## Qualification et protections

- Node.js 22 est le runtime de référence. Identifier par labels, montages, réseau et base réelle chaque environnement Docker avant utilisation.
- Ne supprimer aucune ressource Docker et ne lancer aucune commande de nettoyage. Ne pas arrêter, redémarrer ou recréer une ressource existante sans autorisation explicite.
- Ne jamais réinitialiser une base persistante. Sauvegarder puis restaurer sur une instance isolée avant toute correction ; préserver toutes les modifications existantes du répertoire de travail.
- Aucun commit, push, déploiement ou intervention en production ne doit être effectué par Codex.
- Les seuls scopes RBAC autorisés sont `OWN` et `AGENCY`. Préserver les habilitations dynamiques par agence et la confidentialité salariale.
- Toute qualification globale doit inventorier les intégrations conditionnelles applicables, satisfaire leurs prérequis, les exécuter réellement dans les suites dédiées (MySQL, HTTP, WebSocket/WSS et TLS compris) et échouer explicitement si l’une d’elles n’a pas été exécutée ; les tests ignorés de la suite standard ne peuvent jamais être assimilés à des tests qualifiés sans preuve de leur réussite dans le mode approprié.

## Documents et exports destinés aux utilisateurs

- Tout nouveau document ou export utilisateur doit présenter des libellés, statuts, types d'opérations, noms de fichiers et noms de feuilles Excel en français. Les énumérations techniques ne doivent pas être exposées directement sans justification de traçabilité.
- Préserver les contrats techniques, les types numériques et formules Excel, les calculs financiers, les permissions et le cloisonnement inter-agences lors de toute adaptation documentaire.
- Ne jamais réécrire silencieusement un document historique, signé, cacheté, archivé ou doté d'une empreinte. Préserver signatures, cachets, références et intégrité GED.
- Toute évolution documentaire doit être qualifiée sur de véritables PDF, CSV ou classeurs générés puis relus ; vérifier contenu, encodage, présentation et données métier, pas seulement la signature du fichier.
