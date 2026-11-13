# Rapport de tests VIN

## Politique retenue

Majuscules ; suppression de tous les espaces et tirets ; conservation des 17 premiers caractères normalisés ; validation finale par `^[A-HJ-NPR-Z0-9]{17}$`. Le VIN Atelier reste facultatif, sans modification de règle métier.

## Résultats exécutés

| Scénario | Attendu | Résultat |
|---|---|---|
| 0, 1, 16 caractères | état inchangé, jamais plus de 17 | Réussi |
| 17 caractères | 17 conservés | Réussi |
| 18, 25, 40 caractères | longueur 17 | Réussi |
| collage de 40 / minuscules | normalisé puis tronqué | Réussi |
| espaces et tirets | supprimés avant troncature | Réussi |
| caractères I/O/Q | rejetés par `VIN_PATTERN` | Réussi |
| suppression puis ressaisie | état vide puis nouvelle valeur | Réussi (helper) |
| fermeture/réouverture Atelier | `setExternalForm(emptyExternal())` | Réussi (preuve structurelle) |
| Stock VN/VO | état normalisé et payload `normalizedVin` | Réussi (preuve structurelle) |
| réception Atelier | état normalisé avant création/recherche | Réussi (preuve structurelle) |
| doublon | contraintes et contrôles backend existants conservés | Non rejoué sur MySQL dans cette passe |

Commande exécutée : `node --import tsx --test test/vin-documentation-lca.test.ts` dans `frontend`.

Résultat : 3 tests, 3 réussis, 0 échec. Le test couvre également la livraison sans PNG. Aucun test d’écriture MySQL n’a été lancé afin de protéger la base métier.
