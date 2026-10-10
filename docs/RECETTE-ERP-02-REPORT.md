# RECETTE-ERP-02 — Rapport final CRM

Date : 10 octobre 2026. Révision examinée : `bd88da9 CORR-ERP-02E`.

## Verdict

**CRM : VALIDÉ AVEC RÉSERVES.** La création, la recherche temporisée, les vues Kanban/liste, les compteurs, le journal d'activité et une transition autorisée ont été exécutés dans un navigateur authentifié sur une instance isolée. La qualification sans commercial est correctement refusée. Les contrats CRM ciblés, le lint, les builds et la concurrence MySQL 8.4 passent.

La clôture complète n'est toutefois pas proposée : la recette navigateur n'a pas couvert de bout en bout la conversion Client 360, les rendez-vous et le cycle complet d'un essai (création, reprogrammation, démarrage, annulation). Les suites globales conservent en outre des échecs, dont plusieurs tests CRM historiques.

## Environnement réel de recette

- frontend courant : `http://127.0.0.1:4174` ; backend courant : `http://127.0.0.1:3002` ;
- MySQL 8.4 jetable : conteneur sans volume, port local 33319 ;
- migrations appliquées sur base vide jusqu'à 079 ; migrations 077/078/079 inchangées ;
- utilisateur et données exclusivement jetables ; service existant sur le port 3001 non interrompu.

## Parcours navigateur exécuté

- connexion authentifiée réussie ;
- tableau de bord chargé avec indicateurs CRM ;
- ouverture CRM et affichage Kanban ;
- création de `Alice Recette CRM`, budget 25 000 000 FCFA, téléphone, e-mail et véhicule cible ;
- compteur passé de 0 à 1 et total de colonne cohérent ;
- fiche consultée, activité d'appel ajoutée, auteur et responsable distincts affichés ;
- transition Nouveau → Contacté réussie et historisée ;
- tentative Contacté → Qualifié refusée avec le message métier exigeant commercial, besoin, coordonnées et budget ;
- recherche par prénom réussie après debounce ;
- vue Liste cohérente avec le Kanban.

## Résultats techniques

- backend ciblé : 6 fichiers / 6 réussis / 0 échec ;
- MySQL 8.4 concurrence essais : 1/1 réussi après actualisation de la fixture ;
- backend global : 217 fichiers, 177 réussis, 40 échoués, 0 ignoré ;
- frontend global : 785 tests, 751 réussis, 34 échoués, 0 ignoré ;
- lint backend et frontend : réussis ; builds backend et frontend : réussis ;
- build frontend : 2 487 modules, terminé en 34,83 s.

Les compteurs globaux ne sont pas comparables terme à terme au baseline CORR-ERP-02E (1 736 sous-tests backend et 151 tests frontend) : la suite actuelle et la granularité du runner ont évolué. Ils sont donc rapportés avec leur unité exacte.

## Correction effectuée

Le test MySQL `corr-erp-02e-test-drive-mysql.integration.test.ts` utilisait une insertion devenue invalide après renforcement du schéma : `driver_name` et `mileage_out` sont obligatoires. La fixture a été complétée, sans modifier la logique applicative ni le schéma. Le test démontre ensuite : collision même véhicule, collision même commercial, bornes adjacentes autorisées et réservations indépendantes autorisées.

## Conclusion

Les fondations CRM examinées sont cohérentes et aucune fuite de données n'a été démontrée par les tests ciblés. Les réserves navigateur et les échecs historiques empêchent un verdict « VALIDÉ » sans réserve et toute validation de production.
