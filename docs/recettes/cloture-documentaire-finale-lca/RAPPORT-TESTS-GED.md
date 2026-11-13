# Tests GED

Les mécanismes GED historiques ont été préservés : clé source unique, empreinte SHA, stockage contrôlé, reprise sur doublon et archives commerciales existantes.

Les nouveaux endpoints GET ne créent aucune archive, conformément à la séparation consultation/mutation.

Réserve majeure : les nouvelles archives ABS finalisées ne sont pas toutes branchées sur leurs transitions métier. L’idempotence et l’immuabilité de ces nouvelles archives ne peuvent donc pas être déclarées réussies. Les inventaires restent correctement non archivés.
