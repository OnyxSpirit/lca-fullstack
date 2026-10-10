# RECETTE-CORR-01 — Matrice CORR-01 à CORR-50

| ID | Objet | Résultat | Statut |
|---|---|---|---|
| CORR-01 | Diagnostic backend global | 1688/1433/182/73; variante mocks 1693/1439/181/73 | RÉUSSI |
| CORR-02 | Diagnostic frontend global | 772/720/52 puis 774/735/39 | RÉUSSI |
| CORR-03 | Assertions obsolètes | Dépense brouillon et confirmation livraison réalignées | RÉUSSI |
| CORR-04 | Régressions réelles | Défaut jsdom corrigé; aucune régression financière démontrée | RÉUSSI |
| CORR-05 | Isolation des tests | MySQL tmpfs et journaux `/tmp` | RÉUSSI |
| CORR-06 | RBAC Treasury | Preuves FIN-09 antérieures; exhaustivité absente | BLOQUÉ |
| CORR-07 | RBAC réservations | Preuves ciblées FIN-03/09 | RÉUSSI |
| CORR-08 | RBAC budgets | Fixture corrigée, relance finale bloquée | BLOQUÉ |
| CORR-09 | RBAC dépenses | Règle d'approbation confirmée | RÉUSSI |
| CORR-10 | RBAC facturation | Audit statique, matrice dynamique absente | BLOQUÉ |
| CORR-11 | RBAC fournisseurs | Concurrence réelle antérieure, scopes incomplets | BLOQUÉ |
| CORR-12 | RBAC rémunérations | Workflow réel antérieur, matrice incomplète | BLOQUÉ |
| CORR-13 | RBAC reporting | Export authentifié antérieur, matrice incomplète | BLOQUÉ |
| CORR-14 | RBAC bancaire | Import/rapprochement réel antérieur, scopes incomplets | BLOQUÉ |
| CORR-15 | RBAC exports | CSV FIN-06 réel; hors-scope incomplet | BLOQUÉ |
| CORR-16 | OWN | Applicable RH; collectif financier refusé | BLOQUÉ |
| CORR-17 | AGENCY | Plusieurs preuves ciblées | RÉUSSI |
| CORR-18 | CONCESSION | Tests historiques présents, relance incomplète | BLOQUÉ |
| CORR-19 | GLOBAL | Tests historiques présents, relance incomplète | BLOQUÉ |
| CORR-20 | Non authentifié | 401 couvert | RÉUSSI |
| CORR-21 | Sans permission | 403 ciblés couverts | RÉUSSI |
| CORR-22 | Inter-agence | Couverture partielle | BLOQUÉ |
| CORR-23 | Inter-concession | Couverture partielle | BLOQUÉ |
| CORR-24 | Identifiants manipulés | Couverture partielle | BLOQUÉ |
| CORR-25 | Filtres manipulés | Couverture partielle | BLOQUÉ |
| CORR-26 | Non-divulgation | Pas de matrice exhaustive des corps | BLOQUÉ |
| CORR-27 | Confidentialité RH | Architecture vérifiée, dynamique partielle | BLOQUÉ |
| CORR-28 | Confidentialité bancaire | Architecture vérifiée, dynamique partielle | BLOQUÉ |
| CORR-29 | Dialogues facturation | `prompt` notes subsiste | ÉCHOUÉ |
| CORR-30 | Dialogues Treasury | Transfert et contrepassation corrigés | RÉUSSI |
| CORR-31 | Dialogues RH | Rémunérations modales; décaissement à finir | BLOQUÉ |
| CORR-32 | Dialogues livraison | Dérogation et révocation corrigées | RÉUSSI |
| CORR-33 | Accessibilité modales | Contrat partagé + tests statiques | RÉUSSI |
| CORR-34 | Double soumission | Pending sur corrections | RÉUSSI |
| CORR-35 | Navigation navigateur | Stack 3001 : dashboard et Trésorerie chargés | RÉUSSI PARTIEL |
| CORR-36 | Parcours facturation | Non exécuté navigateur | NON EXÉCUTÉ |
| CORR-37 | Parcours fournisseurs | Non exécuté navigateur | NON EXÉCUTÉ |
| CORR-38 | Parcours RH | Non exécuté navigateur | NON EXÉCUTÉ |
| CORR-39 | Parcours Treasury | Page/onglets/actions chargés; nouvelles modales absentes de l'image courante | RÉUSSI PARTIEL |
| CORR-40 | Parcours bancaire | Non exécuté navigateur | NON EXÉCUTÉ |
| CORR-41 | Responsive 1440 | 1440/1440, aucun overflow global | RÉUSSI |
| CORR-42 | Responsive 1280 | Override demandé, viewport effectif resté à 1440 | BLOQUÉ |
| CORR-43 | Responsive 1024 | 1024/1024, aucun overflow global | RÉUSSI |
| CORR-44 | Responsive 768 | 768/768, aucun overflow global | RÉUSSI |
| CORR-45 | Concurrence RH | Réussie RECETTE-PROD-01, non rejouée ici | NON EXÉCUTÉ |
| CORR-46 | Concurrence fournisseurs | Réussie RECETTE-PROD-01, non rejouée ici | NON EXÉCUTÉ |
| CORR-47 | Réservations Treasury | Réussie RECETTE-PROD-01, code financier inchangé | NON EXÉCUTÉ |
| CORR-48 | Reporting FIN-06 | Réussi RECETTE-PROD-01, non rejoué ici | NON EXÉCUTÉ |
| CORR-49 | Non-régression FIN-01–09 | 15 tests UI financiers ciblés verts; globale rouge | BLOQUÉ |
| CORR-50 | Suites globales finales | Backend 181 échecs; frontend 39 | ÉCHOUÉ |
