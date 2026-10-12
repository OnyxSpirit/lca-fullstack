# Audit frontend

## Couverture

149 fichiers TS/TSX actifs, 11 586 lignes, 32 pages, 35 routes, 11 modales, 18 composants partagés, 13 couches API, 8 services, 1 hook et 152 tests ont été examinés statiquement. Les états, erreurs, formulaires, permissions, navigation, cache TanStack Query, temps réel, fichiers et accessibilité déductible du code ont été passés en revue. Aucun rendu visuel n'est revendiqué.

## Constats référencés

| ID | Domaine frontend | Effet |
|---|---|---|
| AUD-LCA-003 | Socket/RBAC | profil rechargé sans renouveler les rooms |
| AUD-LCA-006 | PDF facture | réponse d'une ancienne session non isolée |
| AUD-LCA-015 | store auth | JSON local invalide provoque un crash pré-rendu |
| AUD-LCA-016 | recherche globale | focus modal incomplet |
| AUD-LCA-017 | réception pièces | `fetch` hors client central et erreur silencieuse |
| AUD-LCA-022 | onglets | navigation clavier ARIA incomplète |
| AUD-LCA-023 | notifications | garde de module absent sur l'URL directe |

Les détails complets, preuves et tests figurent dans les catalogues 02 à 04. Les protections backend restent nécessaires : une action masquée n'est jamais considérée comme une autorisation.

## Éléments jugés satisfaisants ou historiquement corrigés

- Client API central avec rafraîchissement single-flight et isolation de génération pour les appels qui l'utilisent.
- Composant modal commun avec restauration de focus ; AUD-LCA-016 provient précisément d'un composant qui le contourne.
- Guards de modules largement présents et permissions d'actions généralement recoupées avec le backend.
- Nettoyage des abonnements temps réel et invalidations de cache présents dans le bootstrap ; le défaut restant porte sur le renouvellement du contexte serveur.
- Aucune utilisation active de `dangerouslySetInnerHTML` ou sink HTML équivalent n'a été identifiée.

## Tests existants et manques ciblés

La suite couvre composants, services et parcours de modules, mais les scénarios suivants ne sont pas démontrés : bascule de session pendant un téléchargement, localStorage corrompu, changement d'agence sans reconnexion, recherche globale au clavier, réception pièces sur refresh expiré et navigation directe Notifications sans permission.

## Verdict

Frontend globalement structuré, mais deux frontières de session/temps réel sont majeures. Le verdict frontend est **acceptable après correction prioritaire d'AUD-LCA-003 et AUD-LCA-006**, puis traitement des cinq défauts de robustesse/accessibilité.
