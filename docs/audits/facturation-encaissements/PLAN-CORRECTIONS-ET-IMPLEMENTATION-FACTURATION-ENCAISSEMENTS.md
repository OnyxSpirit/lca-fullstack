# Plan de corrections et d'implémentation — Facturation & Encaissements

Ce plan est préparatoire. Aucune étape ci-dessous n'a été implémentée pendant l'audit.

## Principes d'exécution

- Travailler uniquement sur une base de recette explicitement jetable et isolée.
- Sauvegarder et contrôler le statut des migrations avant toute écriture.
- Livrer par dépendances : schéma et comptabilité avant UI.
- Maintenir l'atomicité paiement + mouvement + solde.
- Ne jamais déduire l'autorisation depuis le frontend.
- Conserver les clés d'idempotence et les sources financières stables.

## Phase 0 — Arbitrages et critères d'acceptation

1. Décider le scope des comptes de concession pour les encaissements d'agence.
2. Décider si un compte unique doit rester un choix explicite.
3. Définir date de saisie/date de valeur et politique de justificatif.
4. Définir le traitement métier de `BANK_FINANCING`.
5. Définir l'annulation d'un paiement erroné, distincte du remboursement.
6. Décider si l'absence de mapping comptable bloque l'encaissement ou entraîne une régularisation supervisée.
7. Valider les 16 scénarios d'acceptation du dossier de conception.

Livrable de sortie : décision métier signée et contrats API approuvés.

## Phase 1 — Rétablir la comptabilisation existante

Priorité : P1, avant toute évolution de la modale.

1. Corriger le cutover de découverte des paiements : ajouter une colonne technique `created_at` avec stratégie de reprise contrôlée ou employer une date existante explicitement validée.
2. Faire joindre par le découvreur le mouvement `PAYMENT/CONFIRMED` et inclure `treasuryAccountId` dans `PAYMENT_CONFIRMED`.
3. Faire joindre le mouvement `PAYMENT_REFUND/REFUNDED` et inclure le compte originel dans `PAYMENT_REFUNDED`.
4. Préserver l'exclusion de ces sources du flux Treasury générique pour éviter la double comptabilisation.
5. Ajouter des tests MySQL réels : découverte, traitement, journal, grand livre, balance, retry et unicité.
6. Tester l'échec contrôlé quand le mapping comptable est absent.

Critère de sortie : un paiement et son remboursement produisent chacun exactement une écriture équilibrée vers le compte comptable lié à leur compte de trésorerie.

## Phase 2 — Migration additive pour destinations multiples

1. Ajouter `payments.treasury_account_id` nullable, FK et index.
2. Transformer l'unicité de `treasury_account_mappings` pour autoriser plusieurs comptes par agence/moyen tout en interdisant les doublons exacts.
3. Ajouter l'index de recherche des compatibilités actives.
4. Convertir chaque mapping existant en compatibilité active sans changer son identifiant si possible.
5. Backfiller les paiements uniquement depuis un mouvement originel unique et vérifié.
6. Produire un rapport des paiements historiques sans destination déterminable ; ne pas inventer de valeur.
7. Tester migration aller, état idempotent, contraintes et volumes.

Critère de sortie : anciens flux inchangés, plusieurs comptes configurables par moyen, historique non ambigu enrichi.

## Phase 3 — Services Treasury et backend de compatibilité

1. Extraire une fonction serveur unique de validation : moyen, compatibilité, compte actif, scope, agence/concession, devise, readiness.
2. Ajouter `GET /invoices/:id/payment-destinations?paymentMethodId=...` sous `billing.payment.collect`.
3. Retourner uniquement des champs nécessaires et respecter les scopes AGENCY/CONCESSION/GLOBAL.
4. Étendre `POST /invoices/:id/payments` avec `treasuryAccountId`.
5. Revalider et verrouiller compte/configuration dans la transaction.
6. Persister la destination, la passer à `postAutomaticMovement`, auditer compte et mouvement.
7. Interdire tout fallback silencieux lorsque la requête fournit une destination.
8. Conserver une fonction distincte de résolution automatique pour les appels système qui en ont encore besoin.
9. Exposer la destination dans l'historique des paiements selon `billing.payment.view`.

Critère de sortie : paiement, mouvement et facture restent atomiques ; le mouvement utilise exactement le compte demandé.

## Phase 4 — RBAC et cohérence de navigation

1. Corriger AUDIT-FE-003 : garde de module composée ou garantie de provisionnement `billing.view`.
2. Autoriser la consultation des destinations avec `billing.payment.collect`, sans conférer `treasury.account.manage`.
3. Réserver la gestion des compatibilités à `treasury.account.manage`.
4. Tester changement d'agence, compte agence, compte concession et accès refusé.
5. Vérifier les rôles dynamiques réels plutôt que des listes de rôles frontend codées en dur.

Critère de sortie : aucune fuite inter-agence et aucun faux refus pour un détenteur de permissions granulaires valides.

## Phase 5 — Modale frontend

1. Initialiser le moyen à vide ; supprimer `methods[0]`.
2. Ajouter `treasuryAccountId` et le hook de comptes compatibles.
3. Charger uniquement après choix du moyen.
4. Effacer destination/référence lors d'un changement de moyen.
5. Gérer chargement, liste vide, erreur, un compte et plusieurs comptes.
6. Bloquer Valider tant que le compte obligatoire n'est pas choisi.
7. Réinitialiser/fermer lors d'un changement d'agence.
8. Envoyer la destination et conserver la clé d'idempotence pendant les retries.
9. Après succès, invalider factures, détail, paiements, trésorerie et supervision financière pertinente.
10. Ajouter date et justificatif uniquement après arbitrage de phase 0.

Critère de sortie : aucun compte arbitraire, aucun ancien compte conservé après changement de moyen, messages explicites.

## Phase 6 — Administration des compatibilités

1. Adapter l'écran Trésorerie existant pour afficher plusieurs comptes par moyen/agence.
2. Empêcher les doublons, comptes hors scope, inactifs ou devises incompatibles.
3. Préserver désactivation et historique ; interdire suppression destructive lorsqu'un mapping a servi.
4. Afficher les dépendances comptables et l'état readiness.
5. Ne pas créer automatiquement de compte ou mapping.

Critère de sortie : une configuration complète peut être préparée et auditée avant activation.

## Phase 7 — Annulation/correction et documents

Sous réserve des arbitrages :

1. Concevoir un endpoint de contrepassation, jamais une suppression de paiement.
2. Exiger permission, motif, idempotence et verrouillage.
3. Créer le mouvement inverse sur le compte originel et l'écriture de contrepassation.
4. Distinguer clairement dans l'historique « annulé/corrigé » et « remboursé ».
5. Intégrer le justificatif au service documentaire existant plutôt que dans une nouvelle table ad hoc.

Critère de sortie : piste d'audit complète et aucune réécriture de l'historique financier.

## Phase 8 — Batterie de tests

### Unitaires et contrats

- montant nul/négatif/excessif/exact ;
- compatibilité moyen/type/compte/devise ;
- mapping unique et multiple ;
- permissions et scopes ;
- sérialisation des payloads comptables.

### Intégration MySQL

- 5 M CASH compte A + 10 M virement compte B sur facture 14 M : second refus, aucune ligne/mouvement parasite ;
- 5 M + 9 M : deux paiements, deux comptes, solde zéro ;
- concurrence de deux utilisateurs sur le dernier solde ;
- retry idempotent ;
- compte désactivé entre chargement et validation ;
- remboursement sur compte originel malgré changement de mapping ;
- découverte et posting comptable avec deux comptes ;
- grand livre/balance équilibrés ;
- aucune double comptabilisation.

### Frontend et navigateur

- état initial, chargement, zéro/un/plusieurs comptes ;
- changement de moyen/agence ;
- erreurs 400/403/409 ;
- persistance après rechargement ;
- invalidations et temps réel ;
- navigation RBAC.

### Non-régression

- création/émission/PDF/archivage facture ;
- factures véhicule, atelier, pièces et livraison ;
- avoirs, reçus et remboursements ;
- exports ;
- garantie et autres appels de `postAutomaticMovement` ;
- Treasury readiness, rapprochement et reporting ;
- automatisation comptable globale.

## Phase 9 — Déploiement contrôlé

1. Sauvegarde et vérification de restauration.
2. Migration additive et rapport d'intégrité.
3. Backend compatible avec colonnes nullable et anciens historiques.
4. Configuration des compatibilités et mappings comptables.
5. Tests de fumée sur une agence pilote.
6. Activation frontend après validation de la chaîne comptable.
7. Supervision des événements `FAILED/REGULARIZE`, mouvements et écarts de balance.
8. Passage éventuel à `NOT NULL` uniquement après preuve d'exhaustivité.

## Ordre recommandé des lots

| Lot | Contenu | Dépend de | Bloque la mise en production |
|---|---|---|---:|
| L0 | Arbitrages | — | Oui |
| L1 | Corrections comptables P1 | L0 | Oui |
| L2 | Migration destinations multiples | L1 | Oui |
| L3 | API et Treasury | L2 | Oui |
| L4 | RBAC | L3 | Oui |
| L5 | Modale | L3, L4 | Oui |
| L6 | Administration | L2, L4 | Oui |
| L7 | Annulation/justificatifs | L0 ; peut être séparé | Selon décision |
| L8 | Tests complets | L1 à L7 | Oui |
| L9 | Déploiement contrôlé | L8 | — |

## Définition de terminé

- Les 7 anomalies sont corrigées ou font l'objet d'une décision documentée.
- Les comptes compatibles sont multiples, scoped, actifs et contrôlés par devise.
- Chaque nouveau paiement possède une destination explicite et un mouvement identique.
- Paiement, mouvement et solde sont atomiques et idempotents.
- Les écritures utilisent le compte lié à la destination réelle.
- Les scénarios 14 M, concurrence, remboursement et changement d'agence passent sur MySQL réel et navigateur.
- Aucun impact régressif sur les sources de factures, documents, exports, Treasury ou Comptabilité.
