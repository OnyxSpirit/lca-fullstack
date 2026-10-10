# VALID-ERP-02 — Rapport final

Date de validation : 10 octobre 2026. Périmètre : CORR-ERP-02A, 02B et 02C, workspace courant uniquement.

## Verdict

**CRM : NON VALIDÉ globalement.** La migration 077, les rendez-vous CRM et leur sérialisation MySQL sont validés. Une fuite de scope de dérogation et la conversion entreprise ont été corrigées et couvertes. En revanche, les essais automobiles restent sans durée, sans contrôle transactionnel du véhicule ou du commercial et sans route de modification : un double démarrage concurrent reste possible. Ce blocage interdit une validation complète au sens des critères de mission. Ce verdict ne constitue pas une appréciation d'aptitude globale de l'ERP à la production.

| Domaine | Statut | Motif synthétique |
|---|---|---|
| Migration 077 | VALIDÉ | Frais, pré-077, conservation et réexécution validés sur MySQL 8.4.11 jetable. |
| Paramètres | VALIDÉ AVEC RÉSERVES | Défaut 30, bornes 1–1440, persistance et non-rétroactivité couvertes ; recette de redémarrage UI non exhaustive. |
| Rendez-vous | VALIDÉ AVEC RÉSERVES | Création sûre ; aucune route de modification/réaffectation du rendez-vous. |
| Collisions | VALIDÉ AVEC RÉSERVES | Formule correcte et création concurrente sérialisée ; modifications non testables car API absente. |
| Dérogations | VALIDÉ AVEC RÉSERVES | Permission, motif, trace et scopes corrigés ; UI de dérogation absente. |
| Essais | NON VALIDÉ | Double réservation véhicule/commercial possible ; durée et modification absentes. |
| Activités | VALIDÉ AVEC RÉSERVES | Auteur/responsable distingués ; les activités de retour d'essai n'enregistrent pas encore l'auteur. |
| Prospects | VALIDÉ AVEC RÉSERVES | Contrats particulier/entreprise et contact alternatif ; type TS implicite et parcours de conversion navigateur incomplet. |
| Pipeline | VALIDÉ | Matrice et protections CRM ciblées sans régression démontrée. |
| Kanban | VALIDÉ AVEC RÉSERVES | Pagination et agrégats serveur vérifiés ; jeux 0/50/51/200/201/500 non rejoués intégralement au navigateur. |
| Recherche | VALIDÉ AVEC RÉSERVES | Contrats serveur et recherche UI observés ; matrice volumétrique exhaustive non rejouée. |
| RBAC | VALIDÉ AVEC RÉSERVES | Scope de dérogation fermé ; attribution automatique de la permission à SUPER_ADMIN par 077 à revoir en gouvernance. |
| Client 360° | VALIDÉ AVEC RÉSERVES | Contrats et scopes ciblés couverts ; parcours navigateur complet non exécuté. |
| Frontend | VALIDÉ AVEC RÉSERVES | Build/lint et tests ciblés ; recette multi-résolution non réalisable avec le pilote disponible. |
| Tests globaux | VALIDÉ AVEC RÉSERVES | Backend 172/213, frontend 125/151 ; périmètre augmenté, échecs globaux non CRM historiques/concurrentiels. |

## Résultats essentiels

- MySQL 8.4.11 : migration normale jusqu'à 077 sur base vide et depuis 076, sans perte des fixtures historiques ; relance arrêtée par le registre `schema_migrations`.
- Rendez-vous : durée par défaut 30 minutes, durée individuelle 1–1440, intervalle semi-ouvert `début A < fin B AND fin A > début B`, seuls les `pending` bloquent, créneaux adjacents acceptés.
- Concurrence : deux créations identiques simultanées donnent exactement une création et un conflit grâce au verrou de la ligne utilisateur.
- Dérogation : motif obligatoire et audit persisté ; le scope OWN/AGENCY/CONCESSION/GLOBAL est désormais contrôlé sur le prospect avant l'écriture.
- Activités : la timeline affiche séparément auteur et responsable, sans auteur fictif pour l'historique.
- Prospects : particulier et entreprise acceptent téléphone ou e-mail ; la conversion crée maintenant un client `company` quand une raison sociale existe.
- Kanban : page de 50, total et agrégats serveur observés sur le bundle isolé.

## Recette navigateur isolée

- Backend temporaire : `127.0.0.1:33301`, base MySQL jetable uniquement.
- Frontend temporaire : `http://127.0.0.1:4175`, build du workspace avec `VITE_API_URL=http://127.0.0.1:33301/api`.
- Empreinte du bundle parcouru avant les deux derniers ajustements de libellé : `955afa5b92b4ddb6dcbfbe585bdaa43e5c6760b5e2da27e415809789cee95865`. Empreinte du build final revalidé par build/lint/tests ciblés : `84772d5210892ba38d3660e7c8a642977a81841faca549ec8c58736b582a95cd` (`frontend/dist/index.html`, SHA-256).
- Vérifié réellement : authentification, dashboard, Kanban, pagination 50 et compteurs serveur, création d'un particulier avec e-mail seul, création d'une entreprise avec e-mail seul, affichage du réglage de durée à 30 minutes.
- Non déclaré comme vérifié : 1440/1024/768/375 (le pilote ne permettait pas de fixer la fenêtre), clavier complet, états erreur, dérogation UI, modification de rendez-vous et Client 360° complet.
- Le service existant sur le port 3001 et son bundle n'ont été ni arrêtés, ni remplacés, ni reconfigurés.

## Modifications minimales réalisées

1. Contrôle du scope de `crm.appointment.override_conflict` avant toute dérogation.
2. Conversion CRM entreprise vers un client de type `company`.
3. Affichage explicite auteur/responsable dans la timeline.
4. Libellés téléphone/e-mail et sauvegarde des paramètres alignés sur le comportement réel.
5. Mise à jour de deux tests frontend devenus obsolètes après pagination et réglage de durée.
6. Ajout de tests de contrat CRM et d'un test de concurrence MySQL 8.4.

## Garanties de fin de mission

Aucun commit, push ou déploiement n'a été effectué. Aucune migration historique n'a été modifiée. Aucune permission n'a été affaiblie. Aucune base persistante ni aucun volume Docker existant n'a été modifié ou supprimé. Les détails figurent dans les cinq rapports spécialisés.

L'état Git initial était propre. L'état final ne contient que les fichiers source/tests/documents listés ci-dessus et le JavaScript backend compilé correspondant ; tous sont volontairement laissés non commités. `git diff --check` est sans erreur. Après nettoyage, les seuls conteneurs actifs sont les trois services initiaux, dont `lca-frontend-1` toujours publié sur le port 3001.
