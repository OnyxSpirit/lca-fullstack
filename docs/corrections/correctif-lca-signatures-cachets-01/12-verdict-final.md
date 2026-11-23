# Verdict final

## VALIDÉ AVEC RÉSERVES

Les cinq anomalies correctives sont traitées dans le code et les preuves ciblées sont vertes. La lecture des politiques est persistante et cloisonnée, les formulaires sont indépendants, la résolution multi-agences utilise les affectations actives, et la Livraison respecte les rôles autorisés du cachet. L'interface distingue clairement éligibilité et règle d'émission. La suite backend complète termine avec **2 092 réussites, 0 échec et 104 tests optionnels ignorés**.

## Réserves ouvertes

1. LOT13 se bloque dans un ancien scénario de concurrence après sept sous-tests réussis ; sa terminaison complète doit être rétablie.
2. La suite frontend complète contient l'échec hors périmètre `LOT14B2B-02`.
3. La matrice MySQL exhaustive des dix cas de signature multi-agences doit être complétée ; la correction est actuellement prouvée structurellement et par les contrôles généraux.
4. La recette UI manuelle, notamment deux sauvegardes concurrentes, reste à exécuter avec le guide fourni.
5. Incident local majeur : le nettoyage Compose a supprimé les conteneurs et volumes du projet Docker local `lca`, au-delà de l'environnement fictif dédié. Les volumes concernés sont listés dans `01-rapport-general.md`; une restauration nécessite une sauvegarde externe.

Le correctif de code est prêt pour recette contrôlée, mais ces réserves empêchent honnêtement le verdict **VALIDÉ** sans réserve. Aucun commit, push ou déploiement n'a été réalisé. L'incident Docker local doit être traité avant toute reprise de l'environnement `lca`.
