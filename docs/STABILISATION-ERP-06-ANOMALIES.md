# ERP-06 — Anomalies

## Corrigée — DEL-FIN-USED-01

Après consommation de l'autorisation, le détail d'une livraison partiellement payée affichait `financially_cleared=false`, « Livraison impossible » et « Aucune dérogation » alors que le dossier était livré légalement.

Cause : backend et composant frontend ne reconnaissaient que le statut `AUTHORIZED`, jamais le statut historique `USED` rattaché à la livraison.

Correction minimale : reconnaissance de `USED` seulement si `used_delivery_id` correspond au dossier ; présentation « Dérogation consommée » et maintien du détail justificatif. Aucun assouplissement avant signature.

Preuves : lint backend/frontend vert, tests frontend Livraison 9/9, API finale `financiallyCleared=true`, navigateur 4176 corrigé.

## Observations non corrigées

- Les suites globales comportent des tests historiques rouges sans rapport avec ERP-06.
- Le test backend Delivery financier contient une assertion de baseline obsolète (`baseline_001_064` alors que la baseline annonce 069) ; 6 sous-tests métier sur 7 passent.
- Les actions Reporter/Annuler utilisent encore `window.prompt`.
- La première page des PV utilise une mise en page très haute ; le contenu reste lisible et non chevauché, mais la marge supérieure mérite une revue documentaire ultérieure.
