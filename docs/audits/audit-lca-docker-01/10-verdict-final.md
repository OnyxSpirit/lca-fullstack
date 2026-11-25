# Verdict final

## Réponses aux questions de clôture

1. Le backend est unhealthy parce qu’il quitte avant de servir HTTP ; le bootstrap refuse la migration 135.
2. Cause racine confirmée : migration 135 partiellement appliquée, étape 7 FAILED_PARTIAL, puis mutation de l’étape 2 entraînant un checksum incompatible.
3. Le frontend ne démarre pas parce que Compose attend un backend `service_healthy`.
4. La migration 136 n’est pas impliquée dans la panne immédiate : elle n’est jamais atteinte.
5. Les données ne présentent pas de perte confirmée, mais le schéma est intermédiaire ; toute réparation sans sauvegarde est risquée.
6. La régression bloquante vient de LCA-02/migration 135, révélée lors du redémarrage effectué après LCA-03.
7. Codex rencontre Docker à cause du sandbox et de l’absence d’accès direct au groupe/socket ; l’escalade contrôlée fonctionne.
8. Les qualifications souffrent de runtimes, UID, volumes, baselines et projets Compose divergents.
9. Les corrections prioritaires sont la sauvegarde, la réparation additive de 135, l’immuabilité des migrations, la correction baseline/094 et un job de migration séparé.
10. La stabilité exige un profil unique et versionné, Node 22/MySQL 8.4, ports isolés, UID cohérents, CI migrations fraîche/historique, Playwright et inventaire des ressources.

Verdict d’audit : cause racine identifiée avec preuves suffisantes. L’environnement ne doit pas être considéré prêt au démarrage tant que 135 et son journal n’ont pas été réconciliés par une procédure corrective dédiée.

