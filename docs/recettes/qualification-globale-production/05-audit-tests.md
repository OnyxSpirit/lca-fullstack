# Audit des tests

Les tests ciblés `agency-rbac-context`, `rbac-core-alignment` et `rbac-persisted-authority` réussissent après modernisation des attentes obsolètes `CONCESSION` et `GLOBAL`. Les matrices `app`, documents de livraison, véhicules, Showroom et pagination Showroom ont également été alignées sur le contrat strict `OWN`/`AGENCY`.

Résultats constatés le 18 novembre 2026 :

- TypeScript frontend et backend : réussis ;
- lint frontend et backend : réussi ;
- build Vite : réussi, 2 551 modules ;
- suite frontend : 44/44 réussis ;
- matrice Showroom : 105/105 réussis ;
- pagination Showroom : 12/12 réussis ;
- suite backend exhaustive séquentielle : 2 067 réussis, 0 échec, 104 ignorés, soit 2 171 tests déclarés en 269,4 secondes.

Les 104 tests ignorés sont principalement des scénarios d'intégration MySQL/WSS protégés par une garde d'environnement. Ils ne sont pas comptés comme exécutés et restent à rejouer explicitement contre le conteneur isolé avant un verdict de production favorable.
