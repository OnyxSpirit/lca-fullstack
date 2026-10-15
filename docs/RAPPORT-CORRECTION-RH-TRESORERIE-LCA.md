# Rapport de correction RH & Trésorerie — ERP LCA

Date : 15 octobre 2026  
Périmètre : anomalies A-01 à A-08 du rapport `AUDIT-RH-TRESORERIE-COUVERTURE-LCA.md`.

## 1. Résumé exécutif

Les blocages fonctionnels prioritaires ont été corrigés sans migration, sans écriture dans la base métier, sans reconstruction Docker et sans modification de l'archive officielle. La clôture budgétaire est désormais transactionnelle et refuse les demandes financières non résolues. Les fonctions d'administration, les historiques, la préparation diagnostiquée des rémunérations, les sélecteurs financiers et la réduction des réservations sont accessibles depuis le frontend.

La qualification statique et TypeScript est positive. La qualification MySQL et navigateur réelle n'a pas été exécutée, conformément à l'interdiction de reconstruire/redémarrer Docker et d'écrire dans la base métier. L'anomalie A-08 reste partiellement ouverte : les nouveaux tests ciblés sont robustes et verts, mais plusieurs anciens tests contractuels restent sensibles au formatage.

## 2. A-01 — Clôture budgétaire sécurisée

- Verrouillage transactionnel du budget, des dépenses, demandes de rallonge et réservations.
- Blocage des dépenses `draft` et `submitted`.
- Conservation de `rejected` comme état terminal non bloquant.
- Blocage des dépenses approuvées non soldées, réservations actives et rallonges soumises.
- Ordre de verrouillage cohérent avec la création et l'approbation des dépenses.
- Motif obligatoire, persisté dans le budget, l'historique d'approbation et l'audit.

## 3. A-02 — Confirmation explicite

Les interfaces RH et Trésorerie utilisent désormais une fenêtre de confirmation présentant le budget, les montants initial, rallonges, engagé et disponible, les conséquences et un motif obligatoire. Il n'existe aucune réouverture automatique d'un budget clôturé.

## 4. A-03 — Historiques

Un composant réutilisable `OperationTimeline` expose :

- historique d'approbation des budgets ;
- historique des rémunérations et paiements ;
- historique des réservations ;
- historique des imports de relevés bancaires.

Les acteurs, dates, actions, transitions, motifs et montants disponibles sont présentés sans dupliquer la logique backend.

## 5. A-04 — Diagnostic de préparation des rémunérations

La préparation renvoie maintenant les candidats, les identifiants préparés et les exclusions agrégées : employé inactif, absence de contrat actif, absence de salaire applicable et rémunération déjà préparée. L'interface affiche le diagnostic, notamment lorsque zéro rémunération est créée.

## 6. A-05 — Workflow de paie exploitable

- Filtres période, statut, employé et agence.
- Préparation globale ou ciblée par salarié.
- Ajustement des brouillons avec motif.
- Soumission, validation et rejet.
- Sélection dynamique d'un budget compatible.
- Affichage et actions sur la dépense liée.
- Sélecteurs dynamiques de compte, catégorie et réservation de trésorerie.
- Paiements partiels ou complets ; affichage payé/reste à payer.
- Aucun identifiant technique brut demandé à l'utilisateur.

La chaîne financière existante est conservée : l'imputation crée la dépense, l'approbation engage le budget, le paiement réutilise le service de décaissement et son idempotence.

## 7. A-06 — Administration frontend

Sont désormais exposés : édition et annulation ciblées des budgets, réouverture des budgets rejetés, édition et annulation des dépenses autorisées, ajustement des rémunérations brouillon. Le backend refuse l'édition d'une dépense hors états `draft` ou `rejected`.

## 8. A-07 — Réservations

Les réservations actives disposent d'une réduction motivée et d'un accès à leur historique. La valeur proposée ne peut pas dépasser le montant actif. Les actions existantes de libération, rejet, annulation et expiration sont conservées.

## 9. A-08 — Tests

Nouveaux tests :

- `backend-node/test/hr-treasury-corrections.test.ts` : 3/3 réussis ;
- `frontend/test/hr-treasury-corrections.behavior.test.ts` : 3/3 réussis.

Tests existants vérifiés :

- `fin04-remunerations.test.ts` : réussi ;
- `rbac-scope-reliability.test.ts` : réussi ;
- suite historique ciblée : six fichiers échouent encore sur des assertions regex/textuelles dépendantes des espaces, guillemets ou de l'ancien agencement du code.

Ces tests historiques n'ont pas été assouplis artificiellement. Leur conversion vers des tests comportementaux/AST reste nécessaire pour clôturer entièrement A-08.

## 10. RBAC et territorialité

Les composants continuent à conditionner les actions par les permissions existantes. Les sélecteurs utilisent les API déjà filtrées par scopes. Aucun contournement SUPER_ADMIN, aucune permission codée en dur et aucune modification de catalogue RBAC n'ont été ajoutés.

## 11. Intégrité financière

- Aucun changement de calcul des soldes ou de double consommation budgétaire.
- Aucune nouvelle table ou comptabilité parallèle.
- Aucun mouvement Treasury créé lors d'une réservation.
- Aucun mouvement financier créé par cette mission.
- Les contrôles transactionnels, verrous, quatre yeux et idempotence existants restent en place.

## 12. Fichiers applicatifs modifiés

- `backend-node/src/modules/hr/hr.routes.ts`
- `backend-node/src/modules/hr/hr-remuneration.routes.ts`
- `frontend/src/api/hrHooks.ts`
- `frontend/src/api/treasuryHooks.ts`
- `frontend/src/components/common/OperationTimeline.tsx`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/modules/hr/RemunerationsAdministration.tsx`
- `frontend/src/modules/treasury/BudgetTreasuryPanel.tsx`
- `frontend/src/modules/treasury/TreasuryPage.tsx`
- `frontend/src/modules/treasury/BankReconciliationPanel.tsx`

## 13. Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| TypeScript backend (`tsc --noEmit`) | Réussi |
| TypeScript frontend (`tsc --noEmit`) | Réussi |
| Tests ciblés nouveaux backend | 3/3 réussis |
| Tests ciblés nouveaux frontend | 3/3 réussis |
| Test rémunérations existant | Réussi |
| Test scopes RBAC existant | Réussi |
| Écritures MySQL métier | Aucune |
| Reconstruction/redémarrage Docker | Aucun |
| Migration | Aucune |

## 14. Tests non exécutés

- Parcours navigateur multi-rôle.
- Tests MySQL d'intégration, concurrence réelle et rollback.
- Paiement partiel/complet réel et contrôle de doublon sur base isolée.
- Recette PDF/CSV hors périmètre de modification.

Ces scénarios nécessitent un environnement isolé autorisant les écritures ou une reconstruction Docker, explicitement interdite dans cette mission.

## 15. Risques résiduels

1. A-08 reste partiellement ouverte tant que les anciens contrats textuels ne sont pas remplacés.
2. Les parcours financiers modifiés doivent être rejoués sur MySQL 8.4 isolé avant livraison.
3. La recette navigateur doit confirmer les habilitations OWN/AGENCY/CONCESSION/GLOBAL avec des comptes représentatifs.

## 16. Verdict

**CORRECTIONS CIBLÉES IMPLÉMENTÉES — QUALIFICATION STATIQUE POSITIVE — RECETTE RÉELLE À PLANIFIER.**

Les anomalies fonctionnelles A-01 à A-07 sont traitées dans le code. A-08 est couverte par de nouveaux tests ciblés, mais n'est pas totalement close à cause des anciens tests fragiles. Aucun déploiement ni changement d'environnement n'est autorisé sur la base de ce seul rapport.
