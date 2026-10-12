# Recommandations de correction

Ce document priorise les corrections sans en appliquer aucune.

## Priorité 1 — bloquants d'habilitation et confidentialité

1. **AUD-LCA-001** : formaliser le modèle mono-rôle, préflight des données, contrainte et erreur explicite du résolveur.
2. **AUD-LCA-003** : déconnecter/reconnecter sur mutations rôle/agence/mot de passe et filtrer les émissions par contexte courant.
3. **AUD-LCA-004** : permission d'annuaire et DTO minimal.
4. **AUD-LCA-006** : utiliser le téléchargement central isolé par génération de session.
5. **AUD-LCA-007** : confirmer le TLS externe ou fournir une terminaison HTTPS obligatoire.

## Priorité 2 — processus et scopes

6. **AUD-LCA-002** : remplacer le filtre d'agence générique par une politique consciente du scope, avec matrice exhaustive avant déploiement.
7. **AUD-LCA-005** : verrouiller/versionner la transition CRM et retourner 409 au conflit.
8. **AUD-LCA-008** : revalider l'état final d'un prospect après fusion du PATCH.
9. **AUD-LCA-010/012** : atomiser l'audit GED et aligner la permission facture.
10. **AUD-LCA-011** : filtrer budgets agence/concession selon la dimension réelle.

## Priorité 3 — capacité et robustesse

11. **AUD-LCA-013/019** : queue/timeouts SQL bornés, liveness sans SQL, readiness interne, observabilité et réponses de surcharge.
12. **AUD-LCA-014** : upload GED en streaming et limites alignées.
13. **AUD-LCA-009** : scope SQL avant LIMIT.
14. **AUD-LCA-015/017/018** : stockage auth tolérant, client API central, validation réelle des avatars.
15. **AUD-LCA-016/020-024** : accessibilité, cas limites Socket/login, garde route et reproductibilité Docker.

## Risques de régression et ordre de validation

| Zone corrigée | Risque | Validation minimale |
|---|---|---|
| modèle de rôles | comptes existants non conformes | inventaire/preflight, upgrade et installation fraîche |
| scope agence | ouverture inter-agence involontaire | matrice deny/allow sur chaque module avant suppression du filtre |
| reconnexion Socket | boucles/multiples sockets/événements perdus | multi-onglets, changement rôle/agence, réseau instable |
| transitions CRM | deadlocks ou conflits excessifs | deux requêtes concurrentes et retry contrôlé |
| GED transactionnelle | incohérence fichier/SQL | pannes injectées avant/après commit et cleanup |
| pool/timeouts | erreurs 503 accrues | charge isolée, limites documentées, métriques |
| streaming upload | signature/hash/abort | corpus fichiers et interruptions réseau |

## Validation dynamique ultérieure

Elle doit être effectuée uniquement après autorisation, dans un environnement isolé : matrices RBAC multi-agence/concession, courses CRM, sessions Socket, bascule utilisateur pendant PDF, défauts GED injectés, `EXPLAIN` sur données volumineuses et charge contrôlée 10/25/50/100. Aucun de ces essais n'a été réalisé pendant l'audit.
