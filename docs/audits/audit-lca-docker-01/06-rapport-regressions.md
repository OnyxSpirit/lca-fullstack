# Régressions des évolutions

La régression bloquante provient d’EVOLUTION-LCA-02, migration 135 :

- une exécution partielle a été laissée dans la base principale ;
- l’étape 7 n’est pas compatible telle quelle avec la contrainte existante ;
- le contenu de l’étape 2 a changé après son enregistrement.

EVOLUTION-LCA-03 rend la panne visible lors d’un nouveau build/démarrage, mais la migration 136 n’est pas exécutée. Les changements applicatifs LCA-03 ne peuvent donc pas être la cause du crash de démarrage.

Les migrations 133 et 134 sont cohérentes avec leurs fichiers actuels. Les applications recette, financière et reporting montrent la même erreur 135 parce qu’elles montent le même répertoire de migrations actuel et possèdent des journaux partiels similaires.

