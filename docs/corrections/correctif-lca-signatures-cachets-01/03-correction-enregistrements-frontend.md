# Enregistrements frontend indépendants

`DocumentPolicyForm` encapsule un document, son formulaire et sa propre mutation. La clé est `['document-marks','policy',type.code]` et seul le bouton du composant concerné lit `save.isPending`.

Les notifications citent le libellé du document. Après succès, la famille de politiques est invalidée pour relire l'état serveur. La clé React du formulaire intègre la version de la politique afin qu'une actualisation serveur réhydrate les valeurs sans écraser les autres documents.

Trois tests frontend ciblés vérifient l'autonomie de la mutation, l'état de chargement local, les notifications contextualisées et les libellés. Résultat : **3/3 réussis** en 385 ms.
