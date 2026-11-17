# 07 — Audit Paramètres concession

## Couverture

Les dix sections accessibles respectent les habilitations et chargent leurs composants à la demande. La section générale expose l'identité légale, coordonnées, RIB, devise, fuseau, TVA, durées CRM/essai, main-d'œuvre forfaitaire et logo documentaire. Les autres sections couvrent GED, cachets, constructeurs, livraison, atelier, fournisseurs, emplacements et 16 agences.

## Cohérence intermodule

Les réglages TVA, devise, fuseau, durées et main-d'œuvre sont résolus côté service et consommés par les modules concernés. Les invalidations de cache frontend ciblent paramètres, concession et référentiels associés.

## Anomalie

À 375×812, largeur utile 360 px, `documentElement` et `#root` mesurent 453 px en défilement horizontal. Le défaut est reproductible uniquement sur Paramètres parmi les quatre routes testées.

Verdict : **non prêt** tant que le débordement mobile n'est pas corrigé et revalidé.

