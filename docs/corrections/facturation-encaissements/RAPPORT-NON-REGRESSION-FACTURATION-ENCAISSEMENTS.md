# Rapport de non-régression — Facturation & Encaissements

## Exécuté

- TypeScript backend : réussi.
- TypeScript frontend : réussi.
- Tests backend ciblés : `billing-dynamic-rbac`, `commercial-payments.behavior`, `lot4-accounting-automation`, `treasury-flow-integration` réussis.
- Tests frontend ciblés : `billing-dynamic-rbac`, `billing-pay-button`, `billing-stabilization`, `treasury-flow-integration` réussis.
- Tests dédiés destination/annulation : voir fichiers homonymes backend et frontend.
- `git diff --check` : réussi.
- Build Vite de production : réussi (2 546 modules transformés).
- Bootstrap MySQL réel isolé : niveau 126, zéro avertissement.
- Test MySQL de contrepassation d'annulation : 1/1 réussi.
- Suite frontend globale : 218 tests, 212 réussis, 6 en échec avant requalification ciblée ; les tests GED reçu et absence de dialogue natif sont ensuite repassés au vert.
- Suite backend globale : démarrée puis interrompue après de nombreux tests ; plusieurs tests d'endpoints sans rapport direct ont échoué dans l'environnement de test (`app`, authentification, CRM, clients, livraison). Les tests ciblés de la mission et `database-baseline` ont réussi. Ces échecs ne sont pas masqués et devront être requalifiés séparément.

## Scénarios couverts par contrat automatisé

Choix vide initial, changement de moyen, zéro/plusieurs comptes, destination obligatoire, revalidation backend, unicité exacte des compatibilités, payload comptable réel, annulation idempotente, refus après remboursement ou rapprochement confirmé, séparation annulation/remboursement.

## Non exécuté

La recette navigateur complète des scénarios A à J reste à réaliser. Les invariants critiques MySQL (migrations, idempotence comptable, neutralisation et contrepassation) ont en revanche été exercés sur la base isolée réelle.

La base protégée `concession_erp` n'a reçu aucune lecture destructive, écriture ou migration.
