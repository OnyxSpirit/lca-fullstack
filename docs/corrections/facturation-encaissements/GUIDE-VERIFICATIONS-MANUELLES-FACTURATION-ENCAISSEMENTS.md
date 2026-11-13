# Guide de vérifications manuelles

## Prérequis

Utiliser exclusivement une base fictive explicitement jetable, appliquer les migrations jusqu'à 125, configurer le flux Trésorerie, au moins deux comptes et leurs liaisons comptables. Ne jamais utiliser `concession_erp`.

## Encaissement et comptes multiples

Chemin : **Facturation → Factures → Détail → Encaisser**. Permission : `billing.payment.collect`.

1. Ouvrir la modale : moyen vide, compte invisible, montant égal au solde, date courante.
2. Choisir Virement : vérifier tous les comptes compatibles XAF autorisés, sans présélection.
3. Choisir un compte et confirmer ; vérifier paiement, mouvement entrant, solde et compte identiques.
4. Passer d'Espèces à Virement avant validation : l'ancienne caisse doit disparaître.
5. Désactiver le compte dans une autre session : la confirmation doit répondre 409 sans effet partiel.

## Paiements partiels et mixtes

Sur une facture fictive de 14 000 000 XAF, encaisser 5 000 000 en espèces sur Caisse A puis 9 000 000 par virement sur Banque B. Attendu : deux paiements, deux mouvements, solde nul. Refaire avec 10 000 000 au second paiement : refus sans mouvement parasite.

## Date et justificatif

Vérifier une date passée autorisée, le refus d'une date future et l'immutabilité de `created_at`. Activer `requires_attachment` sur un moyen : la modale et l'API doivent exiger un justificatif GED ; le reçu ERP reste distinct.

## Annulation

Permission : `billing.payment.cancel`. Dans l'historique, cliquer **Annuler**, saisir un motif et confirmer. Vérifier conservation du paiement, ligne d'annulation, mouvement OUT avec `reversal_of_id`, solde rouvert et événement comptable. Une seconde tentative, un paiement remboursé ou rapproché doit être refusé/idempotent selon la clé.

## Remboursement et comptabilité

Créer un avoir puis rembourser. Vérifier que la sortie utilise le compte originel. Lancer le worker : paiement, remboursement et annulation doivent produire chacun une seule écriture ou un état `REGULARIZE` explicite si un schéma/mapping manque. Contrôler grand livre et balance.

## RBAC multi-agences

Avec deux agences fictives, alterner l'agence active. La modale ouverte doit se fermer ; aucune destination de l'autre agence ne doit être visible ou acceptée. Un utilisateur avec `billing.invoice.view` sans `billing.view` doit pouvoir ouvrir la page.
