# Rapport d'intégration des prestataires — B.3.4.2.3 LOT 6

Date de qualification : 19 octobre 2026.

## Périmètre livré

Le LOT 6 relie une rémunération prestataire préalablement validée au circuit financier central existant. La constatation RH reste distincte : elle crée une dépense budgétaire au statut `draft`, puis les mécanismes centraux existants assurent l'approbation, la réservation, le décaissement, le mouvement de trésorerie, les contrôles de solde et l'idempotence.

Aucun paiement, dette ou engagement n'est créé lors de la préparation ou de la validation de la rémunération. Aucun code relatif aux salaires n'a été réutilisé ou modifié.

## Fichiers modifiés ou ajoutés

- `backend-node/database/migrations/101_provider_remuneration_finance.sql`
- `backend-node/src/config/env.ts`
- `backend-node/.env.example`
- `backend-node/src/modules/hr/provider-payment-crypto.ts`
- `backend-node/src/modules/hr/hr-provider-remuneration.routes.ts`
- `backend-node/src/modules/treasury/treasury.service.ts`
- `backend-node/test/provider-remuneration-finance-b3423-lot6.test.ts`
- `backend-node/test/provider-remunerations-b3423-lot5.test.ts`
- `backend-node/test/migration-101-mysql.integration.test.ts`
- `frontend/src/modules/hr/ProviderFinanceAdministration.tsx`
- `frontend/src/modules/hr/ProviderRemunerationsAdministration.tsx`
- `frontend/test/provider-remuneration-finance-b3423-lot6.test.ts`

## Migration et modèle de données

La migration additive 101 :

- ajoute à `provider_remunerations` un lien 1:1 optionnel et unique vers `budget_expenses` ;
- crée `provider_payment_instruments` pour les virements, Mobile Money, chèques et espèces ;
- crée `provider_remuneration_payment_snapshots`, snapshot immuable du moyen utilisé à chaque décaissement ;
- crée `provider_document_exceptions` avec états demandé, approuvé et refusé ;
- ajoute cinq permissions séparées de gestion, lecture sensible, demande financière, décaissement et décision d'exception.

Les clés étrangères utilisent `RESTRICT`. La migration ne backfille aucun moyen de règlement et ne crée aucune dette artificielle.

## Circuit financier

1. Une rémunération `VALIDATED` peut faire l'objet d'une demande financière unique.
2. Le budget doit être actif, compatible avec l'agence/concession de la rémunération, dans le scope `hr.expense.create` de l'utilisateur et disposer d'un solde approuvé suffisant.
3. La dépense centrale est créée en `draft`, pour le montant net dû, avec historique de création.
4. L'approbation reste celle du circuit budgétaire central, qui interdit l'auto-approbation.
5. Le décaissement réutilise `budgetExpenseDisburse` et exige aussi les permissions centrales de dépense et de trésorerie.
6. Les paiements partiels sont bornés au solde net restant. Le `clientRequestId` central assure l'idempotence et l'unicité du mouvement.
7. Le snapshot du moyen de règlement est inséré dans la même transaction que le décaissement et le mouvement de trésorerie.

## Moyens de règlement et chiffrement

Les coordonnées bancaires et Mobile Money sont chiffrées en AES-256-GCM avec une clé dédiée `PROVIDER_PAYMENT_ENCRYPTION_KEY`, distincte des clés 2FA et JWT. Le démarrage valide que la valeur Base64 représente exactement 32 octets. En absence de clé, aucune persistance en clair n'est tolérée : l'opération sensible retourne une indisponibilité contrôlée.

Les listes ne retournent par défaut que le type, le libellé et la référence masquée. Le déchiffrement nécessite la permission supplémentaire `hr.provider.payment_method.sensitive.view`. Les chèques et espèces ne portent pas de payload sensible.

La clé réelle n'est ni générée ni stockée dans le dépôt. Exemple d'injection hors dépôt :

```bash
export PROVIDER_PAYMENT_ENCRYPTION_KEY="$(openssl rand -base64 32)"
export PROVIDER_PAYMENT_ENCRYPTION_KEY_VERSION="v1"
```

## GED et exceptions

Le décaissement vérifie les types documentaires contractuellement obligatoires à l'étape `PAYMENT`. Une personne morale exige en plus une facture typée (`INVOICE` ou `FACTURE`). Une exception doit être demandée, puis approuvée ou refusée par un autre utilisateur habilité ; chaque décision est journalisée. Une exception refusée ou encore demandée ne permet pas le paiement.

## RBAC et territorialité

Les permissions RH du LOT 6 sont distinctes des permissions centrales. Le scope `OWN` est refusé. Les scopes agence et concession sont contrôlés sur la rémunération, le prestataire et le budget. La demande financière croise explicitement le scope prestataire et le scope `hr.expense.create`. Le backend demeure l'autorité même si les actions sont masquées dans l'interface.

## Interface

La vue des rémunérations validées expose, selon les permissions : création de la demande financière, enregistrement d'un moyen de règlement et décaissement. Les quatre types de moyens sont disponibles. Les erreurs backend sont présentées sans effacer le formulaire, et la liste est invalidée après succès.

Réserve ergonomique : les identifiants de budget, compte, catégorie et moyens sont encore saisis dans des champs techniques, faute de catalogue filtré dédié livré dans le périmètre. La sécurité et les validations serveur ne sont pas affectées, mais une recette navigateur métier et des sélecteurs guidés restent recommandés avant ouverture aux utilisateurs finaux.

## Tests exécutés

- Backend `npm run lint` : PASS.
- Backend `npm run build` : PASS.
- Tests ciblés LOT 6 : 5/5 PASS.
- Non-régression ciblée LOT 5 adaptée à l'évolution autorisée : 5/5 PASS.
- Frontend `npm run lint` : PASS.
- Frontend `npm run build` : PASS.
- Test frontend ciblé LOT 6 : PASS.
- MySQL 8.4 isolé sur `tmpfs`, migration 101 avec le runner officiel : PASS, 6 étapes appliquées.
- MySQL : contrôle du CHECK des moyens sensibles, unicité du lien budgétaire, cinq permissions, enregistrement préservé et traçabilité `schema_migrations` : PASS.
- `git diff --check` : PASS après finalisation.

La tentative de qualification séquentielle depuis la baseline 071 s'est arrêtée sur `094_notification_historical_context.sql`, étape 1, avec `MIGRATION_FAILED_PARTIAL`. Cette anomalie préexistante est indépendante de la migration 101. Elle n'a pas été contournée et aucune correction hors périmètre n'a été appliquée. La migration 101 a donc été qualifiée séparément avec ses prérequis minimaux et le même runner résilient.

## Risques résiduels et verdict

- La recette HTTP/navigateur avec utilisateurs réels, permissions territoriales réelles et données représentatives n'a pas été exécutée, car aucun environnement applicatif isolé complet n'a été reconstruit.
- La chaîne de migrations complète nécessite la levée séparée de la divergence 094 avant qu'une installation neuve puisse être déclarée globalement validée jusqu'à 101.
- La rotation de la clé de chiffrement est versionnée dans le schéma, mais le processus opérationnel de rechiffrement doit être défini avant une première rotation.

**Verdict : LOT 6 techniquement qualifié avec réserves de recette intégrée.** Le schéma 101, le backend et le frontend compilent et les contrôles ciblés passent. Une validation fonctionnelle complète ne doit être prononcée qu'après résolution de la migration 094 et recette HTTP/navigateur isolée. Le LOT 7 n'a pas été commencé.
