# Rapport général — audit SAV, OR et magasin pièces

Date : 2026-11-14  
Schéma audité : `lca_recette` (aucune opération sur `concession_erp`)  
Révision : état du dépôt au début de campagne, sans commit ni modification métier.

## Synthèse exécutive

| Domaine | Verdict | Motif principal |
|---|---|---|
| SAV & ordres de réparation | CONFORME AVEC RÉSERVES | Couverture automatisée solide ; parcours authentifiés réels bloqués par 2FA humain. |
| Véhicules extérieurs | CONFORME AVEC RÉSERVES | Gestion intégrée à l'OR, mais aucune donnée extérieure présente pour un E2E réel. |
| Caisse de transit SAV | NON CONFORME | Le scope `GLOBAL` du Super Administrateur produit `Périmètre SAV insuffisant`. |
| Journal et reporting SAV | NON CONFORME | Même défaut de prédicat de scope ; journal sans pagination/export. |
| Magasin des pièces | CONFORME AVEC RÉSERVES | Invariants et tests passent ; faible volumétrie de recette. |
| Intégration SAV ↔ Magasin | CONFORME AVEC RÉSERVES | Verrous, idempotence et mouvements testés ; E2E navigateur non exécuté. |
| RBAC multi-agences | PARTIELLEMENT CONFORME | Modèle dynamique présent, mais régression Super Admin sur trois vues SAV. |
| PDF / GED | CONFORME AVEC RÉSERVES | Générateurs et archivage testés ; contrôle visuel de documents réels non réalisable sans session. |

## Preuves exécutées

- Services recette sains : frontend `4176`, API `3004`, MySQL `33321`.
- Connexion administrateur : mot de passe accepté, challenge 2FA exigé ; aucun contournement.
- Tests backend ciblés : **308/308 réussis**.
- Tests frontend ciblés : **161/161 réussis**.
- TypeScript : backend et frontend sans erreur.
- MySQL : 1 OR clôturé, 1 pièce, 1 stock, 1 mouvement, 1 demande interne, 1 commande, 16 documents GED ; 0 transfert SAV et 0 facture atelier.
- Invariants présents : 0 stock négatif/surréservé ; 0 incohérence de quantités de demande interne.
- Suite backend globale exploratoire interrompue après blocage prolongé ; plusieurs échecs hors périmètre ont été observés et ne sont pas utilisés pour le verdict.

## Limite majeure de campagne

Le seul compte fonctionnel de recette impose un second facteur humain. Les interactions authentifiées réelles, les captures après connexion et les E2E A–I ne peuvent donc pas être déclarés réussis. Les résultats correspondants sont marqués BLOQUÉ ou PARTIEL, jamais assimilés à des tests E2E.

