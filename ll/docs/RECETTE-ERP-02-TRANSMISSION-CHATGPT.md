# RECETTE-ERP-02 — Transmission ChatGPT

## Contexte et objectif

Recette finale du CRM après CORR-ERP-02E, sur la révision `bd88da9`. Objectif : vérifier prospects, pipeline, activités, rendez-vous, essais, Client 360, dashboard, notifications, RBAC, concurrence et intégrations, avec corrections minimales autorisées.

## État initial

Arbre Git propre au démarrage de cette reprise. Services existants détectés, dont le frontend sur le port 3001, laissés intacts. Migrations 077, 078 et 079 présentes et préservées. Documentation CORR/VALID ERP-02 et tests courants consultés.

## Environnement créé

Une base MySQL 8.4 sans volume a été initialisée de zéro et migrée jusqu'à 079. Un administrateur, un conseiller, deux véhicules, deux visites et un prospect jetables ont servi aux contrôles. Le backend courant a tourné sur 3002 et le frontend courant sur 4174. Aucun identifiant ou compte de production n'a été utilisé.

## Recette exécutée

Connexion authentifiée, dashboard, navigation CRM, création et consultation d'un prospect, recherche temporisée, Kanban/liste, compteurs, activité avec auteur/responsable, transition Nouveau → Contacté, historique et refus métier d'une qualification sans commercial. La conversion, les rendez-vous et le cycle complet d'essai n'ont pas été terminés dans le navigateur et restent explicitement réservés.

## Anomalie et correction

Le test d'intégration de concurrence des essais échouait avant même d'exercer les verrous : sa requête directe ne fournissait pas `driver_name` et `mileage_out`, colonnes obligatoires. La seule modification de code est l'actualisation de cette fixture dans `backend-node/test/corr-erp-02e-test-drive-mysql.integration.test.ts`. Aucun SQL, frontend, backend métier ou migration n'a été modifié.

## Résultats exacts

- ciblés backend CRM : 6 fichiers, 6 réussis ;
- concurrence MySQL : 1 test, 1 réussi ;
- backend global : 217 fichiers, 177 réussis, 40 échoués ;
- frontend global : 785 tests, 751 réussis, 34 échoués ;
- lint et builds backend/frontend : réussis ;
- navigateur : parcours détaillé ci-dessus réussi, couverture partielle.

Les échecs globaux incluent des tests hors CRM. Dans le CRM, trois fichiers endpoint backend et plusieurs assertions frontend commerciales historiques restent à qualifier. Aucun skip n'a été ajouté, aucun test valide supprimé.

## SQL, fichiers et fonctions

- SQL persistant : aucun ; migrations : aucune ;
- fixture modifiée : fonction `reserve` du test MySQL d'essais ;
- documents ajoutés : les sept livrables RECETTE-ERP-02 ;
- ressources jetables seulement : base, comptes et fixtures isolés.

## Sécurité et RBAC

Les tests ciblés couvrent permissions dynamiques, scopes OWN/AGENCY/CONCESSION/GLOBAL, séparation auteur/responsable et transitions. La matrice navigateur multi-rôles n'a pas été intégralement exécutée. Aucun bypass par nom de rôle n'a été introduit.

## Verdict proposé

Technique : **VALIDÉ AVEC RÉSERVES**. Fonctionnel : **VALIDÉ AVEC RÉSERVES**. Navigateur : **VALIDÉ PARTIELLEMENT / AVEC RÉSERVES**. Sécurité : **VALIDÉ AVEC RÉSERVES**. Production : **NON TESTÉE**. Verdict CRM global : **VALIDÉ AVEC RÉSERVES**, non clôturable définitivement avant les scénarios E2E restants et la qualification des échecs historiques.

## Prochaine action

Provisionner quatre utilisateurs jetables avec scopes représentatifs, exécuter la chaîne qualification → RDV → essai → devis/conversion → Client 360, puis isoler les tests endpoint CRM historiques et rejouer les deux suites globales.
