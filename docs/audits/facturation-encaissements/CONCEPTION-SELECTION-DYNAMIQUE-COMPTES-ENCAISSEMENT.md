# Conception — Sélection dynamique des comptes d'encaissement

## Besoin et principe

Lors d'un règlement, l'utilisateur choisit d'abord le moyen de paiement, puis un compte de trésorerie réel compatible. Le compte sélectionné n'est pas un compte général SYSCOHADA : son imputation comptable est résolue par `accounting_treasury_mappings`.

La conception réutilise `treasury_accounts`, `treasury_movements`, les contrôles de scope, l'idempotence, les transactions et les mappings comptables existants. Elle ne crée pas une seconde architecture de trésorerie.

## État actuel à faire évoluer

- La modale contient montant, moyen, référence conditionnelle et notes.
- `payments` ne persiste pas le compte destinataire.
- `treasury_account_mappings` contient un seul compte par `(agency_id,payment_method_id)` à cause de `uq_treasury_mapping_context`.
- `postAutomaticMovement` choisit ce compte unique sans entrée utilisateur.
- Le mouvement garde déjà `account_id`, ce qui permet au remboursement de reprendre le compte originel.
- Les comptes portent scope agence/concession, type, devise et activité.

## Comportement de la future modale

### État initial

- Montant prérempli avec le solde, modifiable sans dépasser le solde.
- Moyen de paiement vide.
- Sélecteur de compte invisible.
- Référence invisible tant que le moyen ne l'exige pas.
- Bouton Valider désactivé tant que les champs obligatoires ne sont pas valides.

### Après sélection du moyen

1. Effacer immédiatement `treasuryAccountId`.
2. Afficher un squelette/texte « Chargement des comptes compatibles… ».
3. Appeler l'endpoint contextuel avec l'identifiant de facture et le moyen.
4. Afficher code, libellé, type, agence/concession et devise de chaque compte autorisé.
5. N'effectuer aucune présélection, même avec un seul compte, sauf arbitrage métier explicite ultérieur.

### Changement de moyen ou d'agence

- Annuler/invalider la requête précédente.
- Effacer le compte choisi et la référence dépendante du moyen.
- Recharger sous une clé de cache incluant facture, moyen et agence active.
- Fermer la modale ou la remettre à zéro si l'agence active change pendant l'opération.

### Aucun compte compatible

Message proposé : « Aucun compte de trésorerie actif et compatible n'est configuré pour ce moyen de paiement dans l'agence active. Contactez un administrateur Trésorerie. »

La validation reste bloquée. Aucun compte ne doit être créé ni choisi automatiquement.

### Succès et erreurs

- Afficher le succès uniquement après réponse 200/201.
- Invalider factures, détail, paiements, trésorerie et, si visible, supervision comptable.
- Conserver les données saisies en cas d'erreur récupérable, sauf si le serveur indique que le compte est devenu incompatible : effacer alors la destination et recharger.
- Afficher les erreurs 403 (périmètre), 409 (configuration/statut/solde/concurrence) et 400 (contrat) avec un message actionnable.

## Moyens existants et compatibilité

Référentiel observé dans la base isolée :

| Code | Libellé | Référence requise actuellement | Compatibilité cible à configurer |
|---|---|---:|---|
| `CASH` | Espèces | Non | comptes `CASH` / caisses physiques |
| `CARD` | Carte bancaire | Oui | comptes bancaires/monétiques explicitement compatibles |
| `BANK_TRANSFER` | Virement bancaire | Oui | comptes bancaires acceptant les virements |
| `CHECK` | Chèque | Oui | comptes/circuits de chèques configurés |
| `MOBILE_MONEY` | Mobile Money | Oui | comptes dédiés configurés |
| `BANK_FINANCING` | Financement bancaire | Oui | comptes bancaires autorisés selon arbitrage |

Le seul `account_type` (`CASH|BANK|OTHER`) ne suffit pas à exprimer toutes les compatibilités, notamment carte, chèque et Mobile Money. La relation moyen ↔ compte doit donc rester explicite. Les types servent de garde supplémentaire, pas de déduction unique.

## Règles serveur de filtrage

Un compte est proposé et accepté seulement si toutes les conditions sont réunies :

1. le moyen est actif ;
2. la configuration de compatibilité moyen/compte est active ;
3. le compte est actif ;
4. le compte appartient à la même concession que la facture ;
5. un compte d'agence correspond à l'agence de la facture ;
6. un compte de concession est autorisé par la politique et le scope de l'utilisateur ;
7. la devise du compte égale celle de la facture ;
8. le flux Treasury de la concession est prêt ;
9. l'utilisateur possède `billing.payment.collect` avec accès à l'agence de la facture.

Le serveur recalcule ces règles dans la transaction de paiement. La liste frontend n'est jamais une autorisation.

## RBAC

- **Lister/sélectionner pour encaisser :** `billing.payment.collect` au scope applicable. Ne pas exiger `treasury.account.manage`, qui est un droit d'administration.
- **Afficher l'historique et la destination :** `billing.payment.view`.
- **Administrer les compatibilités :** `treasury.account.manage`.
- **Comptabiliser/superviser :** permissions `accounting.*` existantes, sans rôle codé en dur.

Les requêtes doivent employer l'agence de la facture validée côté serveur, et non une agence libre fournie par le navigateur.

## Architecture API proposée

### Consultation

`GET /invoices/:id/payment-destinations?paymentMethodId=:methodId`

Permission : `billing.payment.collect`.

Réponse minimale :

```json
{
  "invoiceId": "123",
  "paymentMethod": { "id": "3", "code": "BANK_TRANSFER", "name": "Virement bancaire", "requiresReference": true },
  "currencyCode": "XAF",
  "items": [
    { "id": "8", "code": "BGFI-XAF", "name": "Compte courant BGFI", "accountType": "BANK", "attachmentType": "AGENCY", "agencyId": "2", "currencyCode": "XAF" }
  ]
}
```

Erreurs : 404 facture/moyen, 403 hors scope, 409 flux non prêt. Une liste vide est un succès métier exploitable par l'UI.

### Enregistrement

Étendre `POST /invoices/:id/payments` avec `treasuryAccountId` obligatoire pour les nouveaux paiements. Le serveur :

1. verrouille facture et vente comme aujourd'hui ;
2. contrôle idempotence avant création d'un second effet ;
3. verrouille la compatibilité et le compte demandés ;
4. contrôle scope, activité, devise et readiness ;
5. insère le paiement avec la destination ;
6. appelle `postAutomaticMovement` avec l'identifiant explicitement validé ;
7. met à jour facture/vente et audit dans la même transaction.

La réponse devrait exposer `treasuryAccountId` et `treasuryMovementId`, sans révéler d'informations hors scope.

## Modèle MySQL proposé

Migration additive minimale :

1. ajouter `payments.treasury_account_id BIGINT UNSIGNED NULL` avec FK vers `treasury_accounts(id)` et index ;
2. ajouter une date technique `payments.created_at` si la correction comptable retient ce cutover ;
3. remplacer l'unicité `treasury_account_mappings(agency_id,payment_method_id)` par une unicité incluant le compte, par exemple `(agency_id,payment_method_id,treasury_account_id)` ;
4. conserver `is_active` et les champs d'audit du mapping ;
5. indexer la recherche active `(agency_id,payment_method_id,is_active,treasury_account_id)`.

Déploiement compatible historique :

- colonne destination d'abord nullable ;
- backfill uniquement lorsque le mouvement originel `PAYMENT/CONFIRMED` fournit une correspondance unique et vérifiable ;
- ne pas inventer une destination pour les paiements historiques ambigus ;
- rendre la colonne obligatoire pour les nouvelles écritures au niveau service immédiatement, puis éventuellement `NOT NULL` après assainissement contrôlé ;
- préserver les identifiants et mappings existants en les convertissant en première compatibilité active.

Alternative acceptable : utiliser `treasury_movements.account_id` comme seul snapshot et le joindre systématiquement. Elle évite la duplication, mais rend la lecture du paiement et l'intégrité du contrat plus indirectes. La FK nullable sur `payments` est recommandée car elle exprime l'intention validée avant le mouvement ; une contrainte/test d'intégration doit garantir son égalité avec le mouvement créé.

## Trésorerie

Faire évoluer `postAutomaticMovement` pour recevoir un `treasuryAccountId` déjà choisi et revalider sa compatibilité. Ne jamais retomber silencieusement sur le mapping par défaut si un identifiant demandé est invalide. Pour les anciens appels non interactifs (garantie, éventuels traitements système), conserver une API séparée explicitement nommée « résolution par défaut » si le besoin demeure.

Le remboursement continue d'utiliser le mouvement du paiement originel. Il ne demande pas un nouveau compte de destination.

## Comptabilité

Avant activation de l'évolution :

- corriger `payments.created_at`/cutover ;
- enrichir `PAYMENT_CONFIRMED` avec le compte réellement utilisé ;
- enrichir `PAYMENT_REFUNDED` avec le compte originel ;
- vérifier qu'un mapping comptable actif existe à la date de l'événement ;
- conserver l'unicité des `source_key` pour éviter le double posting ;
- tester écriture, journal, grand livre et balance pour deux paiements vers deux comptes différents.

Le journal provient du schéma comptable applicable ; l'utilisateur ne choisit ni journal ni compte SYSCOHADA dans la modale.

## Scénarios d'acceptation

1. ouverture : aucun moyen, aucun sélecteur de compte ;
2. CASH : seules les caisses actives XAF autorisées apparaissent ;
3. changement CASH → BANK_TRANSFER : destination effacée et liste rechargée ;
4. aucun compte : message et bouton bloqué ;
5. un compte : visible mais pas arbitrairement choisi ;
6. plusieurs comptes : tous affichés, choix obligatoire ;
7. compte désactivé après chargement : refus transactionnel sans paiement ;
8. changement d'agence : formulaire réinitialisé ;
9. compte d'une autre agence/concession : 403/409 ;
10. devise incompatible : 409 ;
11. facture 14 M, 5 M CASH + 10 M virement : second refusé, aucun mouvement de 10 M ;
12. facture 14 M, 5 M CASH compte A + 9 M virement compte B : facture soldée, deux mouvements distincts ;
13. double soumission même clé : un seul paiement/mouvement/événement comptable ;
14. deux utilisateurs sur le solde : un seul gagne, l'autre reçoit 409 ;
15. remboursement : sortie sur le compte originel du paiement ;
16. comptabilité : comptes de trésorerie distincts correctement imputés, sans double écriture.

## Arbitrages métier requis

- Un compte de concession peut-il recevoir un encaissement d'agence, et avec quel scope ?
- Le compte unique doit-il être auto-sélectionné ou seulement présenté ? Recommandation : choix explicite.
- La date de paiement est-elle la date de saisie, la date de valeur, ou les deux ?
- Quels moyens exigent un justificatif et quelles règles de conservation ?
- `BANK_FINANCING` est-il un encaissement client standard ou un parcours distinct ?
- Quelle procédure d'annulation/correction d'un paiement erroné, distincte du remboursement ?
- Le mapping comptable manquant doit-il bloquer l'encaissement ou seulement placer l'événement en régularisation ? Recommandation : décision explicite de contrôle interne.
