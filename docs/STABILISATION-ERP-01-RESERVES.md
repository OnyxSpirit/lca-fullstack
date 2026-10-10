# STABILISATION-ERP-01 — Réserves et obstacles

| ID | Niveau | Réserve | Traitement avant recette générale |
|---|---:|---|---|
| R-01 | Haute | suites globales rouges : backend 178/217 fichiers, frontend 755/786 tests | qualifier/corriger sans supprimer les assertions valides |
| R-02 | Haute | 490 routes rendent une recette monolithique irréaliste | campagnes et traçabilité ID fonctionnalité/scénario |
| R-03 | Haute | certains tests lisent le texte source et cassent sur refactoring | migrer vers comportement/API/MySQL |
| R-04 | Haute | matrice navigateur multi-rôles jamais exécutée exhaustivement | campagne 02 dédiée |
| R-05 | Moyenne | bootstrap depuis `dist` périmé peut ignorer des migrations récentes | build obligatoire avant bootstrap, contrôle niveau 079 |
| R-06 | Moyenne | démarrage essai planifié manuel | décision métier scheduler/rappel |
| R-07 | Moyenne | `window.prompt` subsiste sur certaines actions | modales contrôlées/accessibilité avant démo |
| R-08 | Moyenne | cachet réellement démontré seulement sur PV livraison | ne pas promettre son usage sur autres PDF |
| R-09 | Moyenne | signature visuelle non qualifiée juridiquement | communication client explicite |
| R-10 | Moyenne | livraison partiellement payée dépend d’une autorisation sensible | séparation des rôles, échéance et audit à tester |
| R-11 | Moyenne | traitements financiers après paiement/annulation nécessitent règles explicites | ne pas inventer; faire valider avoir/remboursement |
| R-12 | Moyenne | parcours RH/finance complets surtout prouvés par tests ciblés antérieurs | navigateur + MySQL frais requis |
| R-13 | Faible | cohérence traduction, encodage, dates/XAF et responsive non balayée partout | grille visuelle multi-résolutions |
| R-14 | Faible | aucune mesure de performance générale actuelle | campagne 14 instrumentée |

## Limites de cette cartographie

Mission sans exécution métier, sans création de données et sans modification des tests. Les nombres de routes/tables/permissions sont issus d’une analyse statique du dépôt; la campagne 01 doit confirmer le catalogue effectif après bootstrap. Les rapports antérieurs donnent l’historique mais ne transforment aucun scénario actuel en `VALIDÉ`.
