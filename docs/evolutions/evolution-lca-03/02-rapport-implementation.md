# Implémentation finalisée

Le schéma nécessaire était déjà fourni par la migration immuable 136 : aucune migration 138 n'a été créée. Le backend calcule et snapshotte salaire, primes, retenues d'absence, cotisations salariales, charges patronales et net. Les routes stock conservent les coûts par entrée, exposent valorisation, acquisitions, affectations et retours, et permettent une référence comptable unique sans écriture automatique.

Le frontend expose désormais la valorisation dans RH et les acquisitions dans Comptabilité, avec recherche, pagination existante et export CSV. Les cotisations sont modifiables, activables/désactivables et affectables en nombre avec période et historique. La configuration des modèles de contrat est uniquement dans Configuration ; la fiche employé ne fait que les attribuer.

