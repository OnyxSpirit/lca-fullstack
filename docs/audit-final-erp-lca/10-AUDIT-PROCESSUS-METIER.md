# Audit des processus métier

## Parcours transverses

| Parcours | Contrôles statiques examinés | Constat/verdict |
|---|---|---|
| CRM → Client 360 → Vente | identité/contact, stages, conversion, scopes | AUD-LCA-005 et 008 ; transition concurrente prioritaire |
| Vente → Facture → Encaissement → Livraison | références, totaux, transactions, idempotence, PDF | mécanismes ERP-16 présents ; AUD-LCA-006/012 sur consultation documentaire |
| Stock véhicule → réservation → vente → sortie | verrous, statut, double réservation, images | protections historiques retrouvées ; aucune nouvelle corruption démontrée |
| Réception SAV → OR → atelier → pièces → facture → clôture | préconditions, sessions, consommation, facturation | correctifs RBAC ERP-19 présents ; AUD-LCA-002 peut bloquer le multi-agence |
| Commande pièces → réception → stock → réservation → consommation | quantités, emplacements, transactions, UI | backend transactionnel ; AUD-LCA-017 peut bloquer la réception lorsque le jeton expire |
| GED → association → version → archive/restaure | scope entité, fichiers, versions, audit | AUD-LCA-009, 010, 012 et 014 |
| RH → personnel → salaires → budgets → dépenses | scopes, agrégations, montants | pas de défaut de paie démontré ; AUD-LCA-011 omet les budgets concession du rapport |
| Utilisateur → rôle/agence → session/socket | délégation, scopes, révocation, rooms | AUD-LCA-001 à 004, frontière la plus exposée |

## États terminaux, annulations et doublons

Les campagnes historiques ont ajouté transactions, `FOR UPDATE`, idempotence et validations de transitions dans les ventes, paiements, livraisons, garanties, atelier et pièces. L'analyse courante ne démontre pas de régression de ces protections. La seule course de transition nouvelle établie est AUD-LCA-005.

## Traçabilité

Les écritures majeures disposent généralement d'audits transactionnels. AUD-LCA-010 constitue l'exception GED ; AUD-LCA-021 peut créer une session non remise au client après erreur tardive. Les historiques ne doivent pas être utilisés seuls comme preuve de fonctionnement.

## Verdict par famille

- **Commercial :** à corriger sur transitions et invariants CRM.
- **Financier :** écritures protégées ; reporting budgets concession à corriger.
- **Logistique/atelier :** protections présentes, validation multi-agence encore requise.
- **Documentaire :** traçabilité/charge à renforcer.
- **Administration/RBAC :** P1 bloquants avant qualification.

Verdict global métier : **parcours mono-agence largement consolidés, parcours multi-agence et mutations d'habilitation non qualifiables sans correction/validation ciblée**.
