# ERP-07 — Facturation

## Validé

- création manuelle idempotente, consultation, édition du brouillon et émission ;
- double émission sans doublon documentaire ;
- blocage de l'édition après émission ;
- refus : clé absente, échéance antérieure, total nul, client hors agence, vente déjà facturée, vente annulée ;
- calcul autoritaire backend : 1 000 000 HT + 189 000 TVA = 1 189 000 TTC ;
- facture non payée annulable, facture payée non annulable ;
- références séquentielles et audits présents.

La facture nulle #3, créée uniquement pendant la reproduction du défaut, a été annulée par le workflow officiel après correction. Aucun SQL d'écriture n'a été utilisé.

## Correction

`billing.routes.ts` rejette désormais tout agrégat TTC inférieur ou égal à zéro avant persistance. Test ciblé : `billing-positive-total.test.ts`.
