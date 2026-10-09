# FIN-04 — Rapport final

## A à D — État initial, cartographie et architecture

- Départ : branche `main`, HEAD `fb99164`, travaux FIN-03 locaux préservés.
- Sources de vérité : employé `employee_profiles`, salaire daté `salary_history`, contrat `employee_contracts`, prime `employee_bonuses`, engagement `budget_expenses`, paiement `budget_expense_disbursements`, liquidité `treasury_movements`, réservation `treasury_reservations`.
- Architecture : un dossier `hr_remunerations` fige les montants RH puis référence une unique dépense FIN-02. Il ne porte aucun registre financier concurrent.

## E à I — Préparation, salaires, primes et validation

- Préparation mensuelle pour les employés actifs avec contrat actif chevauchant la période.
- Salaire retenu : dernière ligne dont `effective_date` est antérieure ou égale à la fin de période; aucune rétroactivité ni proratisation.
- Primes : uniquement `APPROVED`, comprises dans la période et non déjà liées; snapshot et unicité globale par prime.
- Le montant payable est explicite et figé à validation. Aucune cotisation, retenue ou charge n'est inventée.
- États de validation séparés du paiement. Le préparateur, le soumetteur et l'employé concerné ne peuvent valider.

## J à M — Engagements, paiements, réservations et corrections

- L'imputation contrôle budget actif, périmètre, devise, période et disponible, puis crée une dépense FIN-02 `draft` unique.
- La dépense suit ensuite l'approbation FIN-02 existante. Une rémunération non validée ou un engagement non approuvé ne peut être payé.
- Le paiement appelle le décaissement budgétaire existant : partiels, plafond, idempotence, GED et contrepassation restent ceux de Treasury.
- Une réservation FIN-03 optionnelle est consommée par le même décaissement, sans second mouvement.
- Les contrepassations restent append-only dans Treasury et ne recréent aucune réservation automatiquement.

## N à S — Confidentialité, RBAC, compatibilité, migration et interface

- Toute route requiert à la fois `hr.salary.view` et la permission `hr.remuneration.*`; le scope effectif est le plus restrictif. `OWN` est consultatif uniquement.
- Six permissions granulaires sont ajoutées sans nouveau rôle; aucun bypass SUPER_ADMIN n'existe dans le runtime.
- Migration additive `074`, sans backfill ni modification des salaires, contrats, primes ou paiements historiques.
- Interface intégrée à RH & Administration : période, montants, validation, paiement, actions conditionnelles et dialogues natifs du projet; aucun `window.prompt` ou `window.confirm`.

## T à V — Tests, MySQL 8.4 et non-régression

| Scénarios | Preuve | Verdict |
|---|---|---|
| FIN04-01 à 06 | période, salaire effectif, non-rétroactivité, primes approuvées et unicité | VALIDÉ |
| FIN04-07 à 11 | soumission, validation, auto-validation, rejet, immutabilité | VALIDÉ |
| FIN04-12 à 13 | dépense FIN-02 unique et budget insuffisant refusé | VALIDÉ |
| FIN04-14 à 21 | paiement partiel/total, plafonds, idempotence, contrepassation et réservation | VALIDÉ |
| FIN04-22 à 25 | unicité SQL, préparation concurrente, agences et concessions | VALIDÉ |
| FIN04-26 à 30 | permissions, confidentialité, historique, compatibilité et mouvement unique | VALIDÉ |

Recette MySQL 8.4.11 authentifiée : migrations 072, 073 et 074 appliquées; deux préparations concurrentes donnent un seul dossier; salaire octobre 425 000 + prime 25 000 = 450 000; auto-validation 403; engagement approuvé; réservation 450 000; paiement partiel 200 000; reste dû et réservation 250 000; un seul mouvement de décaissement. Conteneur en `tmpfs` supprimé après succès.

Typages backend/frontend, tests FIN-04 et build frontend sont verts. La réserve historique FIN-03 sur deux anciennes assertions de `treasury-foundation.test.ts` demeure séparée et non modifiée.

## W à Z — Documentation, fichiers, réserves et Git final

- Documentation migrations et rapports FIN-03/FIN-04 présents.
- Fichiers FIN-04 : migration 074, routeur backend, branchement application, composant RH, tests backend/frontend/MySQL.
- Réserve fonctionnelle : le montant de `salary_history` est présenté comme montant contractuel de référence, pas comme net légal calculé.
- Aucun commit, push, VPS, volume existant ou base persistante. Les migrations 072 et 073 n'ont pas été modifiées.

## Verdict

Préparation, salaires historiques, primes, validation, engagements, paiements, réservations, confidentialité, RBAC, MySQL 8.4 : **VALIDÉ**. Non-régression : **VALIDÉ AVEC RÉSERVE** pour les assertions historiques déjà signalées. Verdict global : **VALIDÉ AVEC RÉSERVE**.
