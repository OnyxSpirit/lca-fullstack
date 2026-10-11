# STABILISATION-ERP-02 — Organisation

La concession initiale `LCA` a été conservée. Quatre agences existent dans la base isolée : Agence principale (`LCA-BZV`), Agence Recette Nord (`REC01-A2`), Agence Recette Sud (`REC01-A3`) et Agence Recette Support (`REC01-A4`). Les trois agences de recette ont été créées par `POST /api/agencies`, puis relues par l'API et observées dans les filtres du frontend.

Les quinze comptes métier sont répartis cycliquement sur ces quatre agences. Cela rend testables les périmètres propre utilisateur, même agence, autre agence et même concession.

Le modèle et les workflows actuels n'exposent aucune API ni interface de création d'une seconde concession. Conformément à la mission, aucune insertion SQL de contournement n'a été faite. Le scénario inter-concessions est donc **BLOQUÉ** ; la portée `CONCESSION` a été validée dans une concession unique, pas contre une autre concession.

