# Qualification de la migration 136

136 a été exécutée après récupération réelle de 135 sur la copie historique : 15 étapes `APPLIED`, puis journal global créé. Les tables, colonnes et FK RH, cotisations, rémunérations, affectations multiples, coûts d'acquisition, matériel et contrats ont été créés sans perte ni altération des objets historiques. Les DML permissions ont été appliqués idempotemment et les scopes interdits n'ont pas été introduits.

La même migration a réussi lors de l'installation fraîche baseline 071→137. Cette qualification est structurelle et ne vaut pas validation fonctionnelle complète d'EVOLUTION-LCA-03.
