# Intégrité des données

La base de recette historique et son journal partiel ont été laissés intacts. Les essais destructifs ou métier ont été confinés à deux espaces neufs : le schéma `qualification_lca_02_20261125` et la base de la pile `lca-qualification-02`. Aucun reset ou nettoyage Docker n’a été effectué.

Les reprises de finalisation ont créé uniquement de nouveaux schémas additifs dans MySQL de qualification. Aucun schéma existant n’a été vidé, supprimé ou réinitialisé ; les bases principale et de recette n’ont reçu aucune donnée fictive.
