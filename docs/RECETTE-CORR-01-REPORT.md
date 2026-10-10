# RECETTE-CORR-01 — Rapport de correction préproduction

## A. État initial

Branche `main`, HEAD `8bcbadb`. Les sept livrables non suivis de RECETTE-PROD-01 ont été préservés. La dernière migration reste `076_bank_reconciliation.sql`; aucune migration n'a été modifiée ou créée.

## B–F. Diagnostic et corrections des suites

Backend initial : 1 688 tests, 1 433 réussis, 182 échecs, 73 ignorés, durée 92,4 s. Une exécution directe avec les mocks de modules Node activés donne 1 693 tests, 1 439 réussis, 181 échecs et 73 ignorés : l'option environnementale n'explique donc qu'un échec. La cause dominante est le test monolithique historique `app.test.ts`, qui forge des rôles dans le JWT alors que l'autorisation courante relit les permissions persistées. Le convertir en faux RBAC affaiblirait la preuve; il doit être remplacé progressivement par des fixtures MySQL/session réelles.

Frontend initial : 772 tests, 720 réussis, 52 échecs, durée 40,3 s. Treize échecs comportementaux partageaient une cause démontrée : les JSDOM concernés n'activaient pas l'API `requestAnimationFrame` utilisée par React 19. Les cinq fixtures concernées utilisent désormais `pretendToBeVisual:true`. Après correction et ajout de deux tests, la suite compte 774 tests, 735 réussis et 39 échecs, durée 42,2 s. Les échecs restants sont principalement des assertions textuelles historiques désynchronisées; ils ne sont pas masqués ni supprimés.

Les fixtures MySQL RH historiques ont aussi dérivé : jetons sans `sid` actif, profils salariés sans les colonnes obligatoires actuelles, et ancienne attente selon laquelle une dépense brouillon consommait immédiatement le budget. Les fixtures et cette assertion ont été réalignées sur la règle actuelle d'approbation. Leur dernière relance a été bloquée par le délai du mécanisme d'autorisation de commande et n'est pas déclarée réussie.

## G–P. RBAC et confidentialité

L'architecture auditée reste fondée sur `requirePermission`, les permissions persistées et les scopes OWN/AGENCY/CONCESSION/GLOBAL. Les modules financiers refusent OWN lorsqu'aucun propriétaire métier n'existe. Les tests MySQL FIN-04 à FIN-09 exécutés lors de RECETTE-PROD-01 restent les preuves dynamiques disponibles pour concurrence, Treasury, fournisseurs, reporting et banque.

RECETTE-CORR-01 a créé une base MySQL 8.4 vierge et confirmé le bootstrap 071–076. Les anciennes matrices RH de scopes n'ont pas pu être certifiées vertes après correction des fixtures. La matrice exhaustive des douze familles n'est donc pas levée. Aucun élargissement de permission ni bypass Super Admin n'a été ajouté.

La confidentialité salariale reste conditionnée par `hr.salary.view`; la permission de paiement ne remplace pas la permission de lecture salariale. Les comptes, relevés et rapprochements restent protégés par leurs permissions Treasury distinctes. La preuve dynamique exhaustive de non-divulgation inter-concession reste ouverte.

## Q–R. Dialogues et accessibilité

Les dialogues natifs ont été supprimés des deux parcours les plus sensibles traités :

- transfert et contrepassation Treasury;
- autorisation et révocation financière de livraison.

Ils utilisent maintenant le composant `Modal` partagé, présentent la ressource, le montant/devise, la conséquence, le motif, l'annulation, les erreurs et l'état de chargement. Les mutations sont protégées contre la double soumission. Les rémunérations utilisaient déjà cette modale. Quinze tests financiers UI ciblés, dont trois nouveaux contrôles CORR-30/31/32, sont verts. Les dialogues natifs de facturation et du décaissement budgétaire restent ouverts.

## S–T. Navigateur et responsive

La stack Docker locale exposée sur `http://127.0.0.1:3001` a été ouverte dans le navigateur intégré avec une session Super Administrateur existante. Le tableau de bord puis `/treasury` ont chargé sans dialogue JavaScript natif actif. La page Trésorerie a affiché ses onglets, ses actions et ses soldes dérivés.

Le contrôle responsive réel de `/treasury` a été exécuté à 1440, 1280, 1024 et 768 px. À chaque largeur, `scrollWidth` est resté égal à `clientWidth` : aucun débordement horizontal global n'a été constaté. À 1280 px, le moteur a conservé un viewport effectif de 1440 px; ce point reste donc une réserve de preuve spécifique. Le viewport temporaire a ensuite été réinitialisé.

L'image Docker déjà démarrée sur 3001 est antérieure aux corrections de ce lot : elle ne permet pas de valider visuellement les nouvelles modales Treasury/livraison. Ces corrections sont prouvées par le build de la source et les 15 tests UI ciblés, mais leur recette graphique après reconstruction de l'image reste à faire. Les parcours métier exhaustifs A–L restent partiels.

## U–W. Finance, MySQL et suites finales

Le bootstrap MySQL 8.4 niveau 076 est réussi. Aucun calcul financier n'a été modifié. Les lint/build backend ainsi que le lint/build frontend passent après les corrections. Les preuves Treasury 5 M / 4 M / 3 M, concurrence RH/fournisseur, reporting et rapprochement restent celles rejouées avec succès dans RECETTE-PROD-01; elles ne sont pas présentées comme rejouées dans cette phase lorsque ce n'est pas le cas.

Les suites globales ne sont pas vertes : backend 181 échecs avec le meilleur harnais diagnostique; frontend 39 échecs après correction. Cela demeure bloquant pour la production.

## X–Z. Réserves, fichiers et verdict

Fichiers applicatifs modifiés : `TreasuryPage.tsx` et `DeliveryFinancialAuthorizationPanel.tsx`. Tests modifiés : cinq fixtures JSDOM, trois fixtures MySQL RH et l'assertion de dialogue de livraison. Test ajouté : `recette-corr01-financial-dialogs.test.ts`. Documentation ajoutée : les trois livrables RECETTE-CORR-01.

**Verdict technique : VALIDÉ AVEC RÉSERVES.**

**Aptitude production : NON APTE.** Les suites globales, la matrice RBAC exhaustive et la recette navigateur métier complète sur une image reconstruite restent bloquantes.
