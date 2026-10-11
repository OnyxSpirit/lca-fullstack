# ERP-17 — Réserves

Après Phase4, ERP-17 reste PARTIEL uniquement sur les points suivants.
- RBAC navigateur multi-profils : seul Super Administrateur est accessible ; profils métier secondaires NON EXÉCUTÉS.
- Pièces : gardes déployées et tests verts, mais preuve navigateur autorisé/refusé avec profils opposés NON EXÉCUTÉE.
- Deux tests MySQL de concurrence sont conditionnels et ignorés ; scénarios REC16 non rejoués.
- GED simulation d'archivage validée ; crash processus, échec nettoyage et route complète non couverts.
- Multi-concessions audit statique uniquement.
- Archives PDF historiques incorrectes non remplacées conformément à leur immuabilité : décision métier de rectification/versionnage nécessaire. Le renderer déployé est validé pour les nouveaux rendus.
- Dérive Compose du seul MySQL recette toujours présente ; sans impact sur la mise à jour ciblée, à normaliser dans une mission infrastructure séparée si souhaité.
Aucune permission à inventer pour fermer ces réserves.
