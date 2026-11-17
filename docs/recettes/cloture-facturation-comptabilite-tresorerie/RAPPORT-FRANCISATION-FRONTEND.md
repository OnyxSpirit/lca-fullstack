# Rapport de francisation frontend

Inspection statique, build et navigation Chromium ciblée exécutés. Les libellés visibles « Treasury », « Reporting & BI » et « Posted » ont été remplacés dans le périmètre financier traité. La recette a détecté l’ancien mot « Treasury » dans le bundle Docker, puis a confirmé qu’il était déjà corrigé dans la source ; le bundle de recette a été reconstruit avec `VITE_API_URL=/api` et rejoué sans terme anglais ciblé.

Pages vérifiées : Facturation bureau/mobile, opérations de trésorerie, centre de pilotage tablette, Comptabilité (Grand livre, Intégrations) et détail SAV clôturé. Le build Vite réussit. Le 17 novembre, les statuts bruts `completed`, `invoiced`, `quality_control`, etc. ont été remplacés par des libellés français avec repli explicite « Statut inconnu (…) ». Le navigateur confirme `Terminée`, `Facturé → Clôturé` et l’absence des statuts bruts ciblés.
