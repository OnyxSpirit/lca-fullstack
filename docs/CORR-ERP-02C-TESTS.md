# CORR-ERP-02C — Tests

Vérifications réalisées :

- build TypeScript backend : réussi ;
- build Vite frontend : réussi ;
- tests CRM ciblés : 3 fichiers, 3 réussis, 0 échec ;
- lint backend/frontend : réussis ;
- suite backend globale : 211 fichiers, 170 réussis, 41 échecs (même niveau de dette historique recensé avant le lot) ;
- suite frontend globale via `node --import tsx --test` : 151 fichiers, 122 réussis, 29 échecs. Le point de référence antérieur était 27 ; les deux écarts portent sur les tests processuels historiques rendez-vous/paramètres, tandis que les builds, lints et tests ciblés passent ;
- `npm test` frontend direct est bloqué dans le bac à sable par `listen EPERM` sur le pipe IPC de `tsx`; l’invocation Node équivalente a donc servi à la mesure globale.

Le test ciblé couvre le verrou transactionnel, la formule de chevauchement, la permission et la justification de dérogation, l’absence de réécriture historique et les règles de catégorie prospect.
