# STABILISATION-ERP-02 — Verdict A–Z

| Axe | État, preuve et réserve | Verdict |
|---|---|---|
| A Architecture isolée | projet, réseaux et volumes dédiés | VALIDÉ |
| B Bootstrap | build courant puis bootstrap, logs 072–079 | VALIDÉ |
| C Configuration | `.env.recette` ignoré, ports locaux | VALIDÉ |
| D Données | données fictives conservées | VALIDÉ |
| E Environnement | trois services sains | VALIDÉ |
| F Frontend | parcours admin/limité réel, console propre | VALIDÉ AVEC RÉSERVES |
| G Gestion des accès | 15 logins et 15 refus admin | VALIDÉ |
| H Historique | 37 audits persistés | VALIDÉ AVEC RÉSERVES |
| I Intégrité | 152 tables, 525 FK, concurrence sans doublon | VALIDÉ |
| J Jeux de tests | scripts reproductibles, couverture ciblée | VALIDÉ AVEC RÉSERVES |
| K Contrôles API | 401/403/409 et succès vérifiés | VALIDÉ |
| L Logs | démarrage/migrations sans erreur critique | VALIDÉ |
| M Migrations | max 079, migrations exécutées | VALIDÉ |
| N Navigation | menus autorisés et refus direct testés | VALIDÉ |
| O Organisation | 4 agences ; seconde concession indisponible | VALIDÉ AVEC RÉSERVES |
| P Permissions | 252 actives, 402 attributions métier | VALIDÉ |
| Q Qualité corrections | correctif Compose minimal et isolé | VALIDÉ |
| R RBAC | dynamique, rechargé, protégé | VALIDÉ |
| S Sécurité | sans auth, désactivation, système, élévation | VALIDÉ AVEC RÉSERVES |
| T Traçabilité | audit présent ; exhaustivité métier à poursuivre | VALIDÉ AVEC RÉSERVES |
| U Utilisateurs | 15 métiers + admin, 4 agences | VALIDÉ |
| V Validation fonctionnelle | initialisation réelle, pas les 120 scénarios | VALIDÉ AVEC RÉSERVES |
| W Workflows administratifs | créations/modifications/statuts exécutés | VALIDÉ |
| X Scopes | quatre scopes représentés ; ressource par ressource à poursuivre | VALIDÉ AVEC RÉSERVES |
| Y Risques résiduels | inter-concessions bloqué, last-write-wins | RÉSERVES |
| Z Verdict final | environnement exploitable et conservé | **PRÊT AVEC RÉSERVES** |

Décompte de la matrice : 31 scénarios, 29 validés (dont 3 validations avec réserve), 1 partiel, 1 bloqué et 0 échec fonctionnel. L'anomalie bloquante pour une prétention multi-concessions n'empêche pas la campagne CRM mono-concession/multi-agences.
