# Réconciliation du journal

La réconciliation ne modifie aucun checksum enregistré. Les étapes 1–6 gardent leurs empreintes; l'étape 7 garde `affa2dc5…b2894`. Après vérification des postconditions, le runner officiel met l'étape 7 `APPLIED`, exécute les DML 8–9 puis enregistre 135 avec le SHA exact `ecf1175…fc8e`.

Sur copie historique, 135, 136 et 137 ont atteint `APPLIED`; un second bootstrap a produit « niveau 137, 0 avertissement » sans réexécution. La base principale est restée volontairement inchangée : étape 7 `FAILED_PARTIAL`, aucune ligne globale 135/136/137.
