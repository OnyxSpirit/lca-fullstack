# Rapport final — SAV / Atelier et Pièces / Magasin

**Date :** 7 novembre 2026  
**Verdict :** VALIDÉ SUR BUILD, TESTS AUTOMATISÉS ET BASE MYSQL ISOLÉE

## Réalisation

- Parcours OR raccordé à la logistique interne : demande automatique à l'acceptation du devis, préparation, réservation, bon de livraison, réception SAV, consommation et retour explicite des reliquats.
- Sortie physique du stock au départ magasin, sans seconde décrémentation à la consommation ; réintégration uniquement après décision contrôlée.
- Facture définitive bloquée tant que l'OR n'a pas atteint le contrôle qualité et tant qu'une pièce reçue n'est ni consommée ni retournée.
- Restitution avec impayé gouvernée par `service.order.handover_unpaid`, puis clôture automatique sans effacer la créance.
- Devis accepté conservé ; compléments séparés, décidés et générant leur propre demande de pièces.
- Dérogation du tarif de main-d'œuvre permissionnée, motivée et auditée.
- Ventes directes : disponibilité, réservation, facture centrale, paiements/avoirs/remboursements centraux, remise physique et sortie définitive seulement à la remise.
- Retours : réception, état, justificatif GED, garantie, quarantaine, retour fournisseur, rebut, réintégration contrôlée, avoir, remboursement et échange relié à une vente de remplacement.
- Achats directs, urgents et occasionnels sans fiche fournisseur obligatoire, avec crédit fournisseur, avance agent ou décaissement central ; réceptions partielles et rapprochement avec des mouvements de trésorerie réels.
- Suppression des restrictions de validation fournisseur fondées sur l'identité du créateur ; RBAC dynamique et scopes conservés.
- Planning Atelier & Ponts masqué et redirigé, sans suppression de code ni de données. Aucun transfert inter-agences ajouté.

## Migrations

| Version | Objet | Validation |
|---|---|---|
| 106 | Logistique interne SAV/pièces et permissions | Appliquée |
| 107 | Ventes comptoir, réservations et retours | Appliquée |
| 108 | Achats directs/occasionnels et règlements | Appliquée |
| 109 | Compléments de devis | Appliquée |
| 110 | Justificatifs, garanties, échanges et historique des retours | Appliquée |

Les migrations additives ont été appliquées jusqu'au niveau 110 sur la base isolée `lca_sav_parts_recette_20261107`. Aucune base de production ni base de recette partagée n'a été modifiée.

## Validation

- Backend : build TypeScript et lint réussis.
- Tests backend ciblés du lot : réussis, notamment fondations et finalisation SAV/pièces, RBAC, workflow pièces, documents Atelier et tarifs de main-d'œuvre.
- Frontend : build Vite et lint TypeScript réussis.
- Suite frontend complète : **995 tests réussis, 0 échec**.
- Tests ciblés après la dernière correction échange/garantie : workflow ERP19, absence de dialogues natifs et chargement différé des routes réussis.
- `git diff --check` : aucun défaut d'espacement.

La suite backend globale historique a également été lancée mais contient des échecs préexistants hors périmètre et ne constitue pas une preuve verte globale. Le verdict ci-dessus est donc limité aux builds, aux tests du lot, à la suite frontend et à la migration isolée explicitement vérifiés.

## Sécurité et exploitation

- Les opérations stock sensibles sont transactionnelles, verrouillées et idempotentes.
- Les remises impayées, décisions de retour, achats et validations utilisent des permissions granulaires et les scopes agence/concession/global.
- Les encaissements, avoirs et remboursements réutilisent Billing et Treasury ; aucune écriture financière fictive n'est créée.
- Aucun commit, push ou déploiement n'a été effectué.
