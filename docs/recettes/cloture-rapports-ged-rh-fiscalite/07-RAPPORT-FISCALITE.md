# Rapport Fiscalité

La migration additive 130 crée un référentiel fiscal générique, historisé et auditable. Une règle comporte période d’effet, paramètres, référence juridique, source et statut de vérification. Seule une règle `VERIFIED` peut être rattachée à une obligation.

Aucun taux réglementaire n’est amorcé. Cette décision est volontaire : le droit comptable OHADA (AUDCIF/SYSCOHADA) organise la comptabilité, tandis que les obligations et taux fiscaux relèvent des textes nationaux et communautaires applicables. Sources de cadrage consultées : [Ministère des Finances — Loi de finances 2026](https://www.finances.gouv.cg/sites/default/files/documents/LOI%20DE%20FINANCES_2026.pdf), [instruction DGID 2026](https://www.finances.gouv.cg/sites/default/files/documents/Instruction%20d%27application%20de%20la%20Loi%20de%20finances%202026.pdf), [OHADA — droit comptable](https://www.ohada.org/le-droit-comptable-ohada/).

Fonctions livrées : types, règles, vérification, obligations, workflow, paiements, historique, audit, reporting et GED.

## Corrections et preuve finale

La fenêtre « Configurer une nature » était pilotée par un état React mais n’était pas rendue : elle a été ajoutée avec code, libellé, autorité et fréquence française. Les fenêtres ne se ferment plus lorsque l’API refuse l’enregistrement. Toutes les actions sont verrouillées pendant une mutation et les règlements nuls, négatifs ou non numériques sont refusés au frontend et au backend.

Le test MySQL réel couvre migration 130 sans alerte, règles brouillon/vérifiée, obligation, RBAC lecture/soumission/approbation/paiement, même acteur autorisé, isolation inter-agence, événements/auteurs, synthèse et deux règlements concurrents de 60 sur une dette de 100 : un seul est accepté, l’autre reçoit un conflit, sans dépassement. Verdict : **VALIDÉ APRÈS CORRECTIONS**.
