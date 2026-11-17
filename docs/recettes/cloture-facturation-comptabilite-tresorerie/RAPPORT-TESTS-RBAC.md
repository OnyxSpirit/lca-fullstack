# Tests RBAC

## Matrice navigateur et API définitive

| Profil | Agence | Facturation UI/API | Trésorerie UI/API | Comptabilité UI/API | Actions visibles | Résultat |
|---|---|---|---|---|---|---|
| Super Administrateur | BZV + PNR | Autorisé | Autorisé | Autorisé | Toutes les actions granulaires | Réussi |
| Responsable facturation | BZV + PNR | Autorisé / 200 | Refusé / 403 | Refusé / 403 | Créer, émettre, exporter selon permission | Réussi |
| Agent de facturation | BZV | Autorisé / 200 | Refusé / 403 | Refusé / 403 | Créer ; aucun export | Réussi |
| Agent de facturation | PNR, rôle sans droit | Refusé / 403 après recalcul | Refusé / 403 | Refusé / 403 | Aucun menu financier | Réussi |
| Agent d’encaissement | BZV + PNR | Autorisé / 200 | Refusé / 403 | Refusé / 403 | Encaissement ; aucune création de facture | Réussi |
| Comptable | BZV + PNR | Refusé / 403 | Refusé / 403 | Autorisé / 200 | Écritures, intégrations, états selon permission | Réussi |
| Responsable trésorerie | BZV + PNR | Refusé / 403 | Autorisé / 200 | Refusé / 403 | Entrée, sortie, transfert, rapprochement, paramétrage | Réussi |
| Utilisateur sans permission | BZV + PNR | Refusé / 403 | Refusé / 403 | Refusé / 403 | Aucun menu ni bouton financier | Réussi |

Les routes directes `/billing`, `/treasury`, `/treasury/operations`, `/treasury/reconciliation`, `/treasury/settings` et `/treasury/accounting` ont été parcourues. Les refus affichent « Accès refusé / Permission insuffisante » et annoncent qu’aucun appel métier n’est lancé.

Le changement BZV → PNR recalcule les rôles et masque les menus/actions ; une navigation directe confirme le 403. La révocation de PNR force le repli sur BZV, la sélection révoquée retourne 403, puis la réactivation rétablit l’affectation. Les permissions collectives utilisent `AGENCY`; aucun scope `OWN` collectif ni séparation demandeur/approbateur n’a été introduit.

Les combinaisons non applicables sont celles où le profil ne possède aucune permission du module : UI masquée et API 403, ce qui constitue le résultat attendu.
