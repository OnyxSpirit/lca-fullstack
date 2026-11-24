# Tests frontend et recette

## Tests automatisés observables

Les tests ne se limitent pas à lire le code source. Ils montent `RoleManagementPanel`, simulent les réponses HTTP et observent le DOM et le store de notifications.

- désactivation : Actif/Désactiver devient Inactif/Réactiver ;
- réactivation : retour à Actif/Désactiver ;
- double clic : une seule requête ;
- erreur 500 : état Actif conservé et message d'échec.

Résultat ciblé : **3/3 réussis**.

## Recette navigateur

Aucun outil de navigateur interactif n'était disponible dans cette session. Aucune recette navigateur n'est donc annoncée. La procédure reproductible figure dans `11-guide-utilisateur.md`.
