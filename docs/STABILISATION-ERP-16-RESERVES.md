# ERP-16 — Réserves et suite

`REC16-GAR-01` ne porte pas de réserve bloquante. Les ressources restent volontairement conservées dans `lca-recette` pour audit et rejeu en lecture.

La campagne ERP-16 n'est pas clôturée. Restent notamment à classer par exécution dédiée : concurrence, idempotence, GED et rejeu, contrôles navigateur complémentaires, Socket.IO, notifications Pièces, multi-agences, PDF complémentaires et audits ciblés. Le scénario multi-concessions demeure `BLOQUÉ` faute de deuxième concession et de workflow officiel.

Réserve de test : le fichier GED global reste rouge sur une assertion historique Livraison, sans défaut métier REC16 démontré.

## Après le bloc REC16-CONC

- l'injection d'échec GED disponible cible la Livraison, pas la facture Atelier ; l'idempotence réelle Atelier est validée, mais l'injection d'archivage Atelier reste `PARTIELLE` ;
- le harnais global `app.test.ts` échoue sans détail avec le filtre ciblé, tandis que les suites spécifiques Billing/GED/Garantie passent ;
- la facture Atelier 23 reste émise avec un solde de 41 615 XAF, état volontairement conservé pour la preuve d'idempotence ;
- les factures manuelles 19 à 21 conservent leurs soldes contrôlés ; elles ne doivent pas être artificiellement soldées.

## Réserves finales

- multi-concessions non exécutable : une seule concession disponible et aucun workflow officiel de création utilisé ;
- RBAC navigateur multi-profils partiel : les profils secondaires ont été contrôlés via API authentifiée, pas par saisie de leurs secrets dans le navigateur ;
- liste Facturation vide en UI malgré les factures présentes et accessibles ailleurs ;
- deux défauts PDF mineurs (format du plafond kilométrique, alignement ligne pièce) ;
- injection d'échec GED Atelier absente ; idempotence réelle et archive unique validées, mais rollback forcé reste partiel ;
- tests de contrat source à réaligner : backend ciblé 58/62 (+2 skips), frontend ciblé 53/62, tandis que les builds et les parcours réels sont verts ;
- la commande `npm test -- fichiers` backend ajoute encore le glob complet : la suite globale observée donne 184/223 et mélange de nombreuses dettes historiques hors ERP-16.

Verdict ERP-16 : **PARTIEL**. Les invariants métier prioritaires sont validés ; la clôture formelle attend les réserves ci-dessus.
