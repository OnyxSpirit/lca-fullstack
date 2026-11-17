# Tests des avoirs et remboursements

FIN-006 incohérent exécuté sur fixture isolée de 118 000 XAF. Le diagnostic a détecté : avoir annulé, remboursement supérieur au paiement, mouvement de trésorerie absent et écriture comptable absente. Décision retournée : `HUMAN_REVIEW_REQUIRED`, sans écriture en base.

Les scénarios normaux ont également été exécutés : deux avoirs (60 000 et 40 000 XAF), un remboursement partiel puis deux requêtes concurrentes portant la même clé. Une requête concurrente a créé le remboursement et l’autre a retourné `duplicate: true`. MySQL confirme deux remboursements et deux mouvements, total 100 000 XAF ; le rejeu complet retourne uniquement des doublons. Aucun historique réel n’a été modifié.

Qualification finale : le cas 118 000 XAF n’est pas une opération métier réelle mais une fixture SQL documentaire directe (`official-document-mysql-fixture.sql`). L’absence de trésorerie, comptabilité et audit est donc expliquée ; aucune correction financière n’a été appliquée.

Revalidation finale sur la facture 1 : avoirs de 60 000 et 40 000 XAF, remboursement partiel puis deux requêtes concurrentes identiques. Résultat : remboursement 2 créé une seule fois et second appel `duplicate: true`.
