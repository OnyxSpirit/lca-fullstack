# ERP-16 — GED, concurrence et rejeu

## Résultats réels

- livraison 6 : une signature, une transition terminale et une archive `delivery:6:finalized:v2` malgré la double finalisation et le rejeu ;
- facture Atelier 23 : deux appels concurrents renvoient le même ID, une seule facture métier et une seule archive `invoice:23:issued:v2` ;
- aucun document orphelin observé ;
- facture véhicule 22 : un paiement tenté alors que la facture était encore brouillon et sans archive a été refusé `409` ; la finalisation officielle `PATCH /invoices/22/status` a créé l'archive, puis l'encaissement a pu continuer.

Ce dernier cas valide la barrière GED et le rejeu réparateur officiel, mais ne constitue pas une panne du moteur d'archivage : la cause était une lecture incomplète de la réponse de création dans le script de recette.

## Injection d'erreur

Le dépôt possède une injection d'échec isolée pour la Livraison (`businessArchiveTestHooks.afterDeliveryFileStored`) avec compensation du fichier, de la base, des snapshots, des audits et du temps réel. Il n'existe pas de crochet équivalent ciblé Facture Atelier. Le test d'intégration Livraison, qui construit ses fixtures par SQL, n'a pas été détourné pour simuler une panne Atelier sur les données REC16. Cette branche est donc classée **PARTIELLE** pour l'injection d'erreur Atelier, sans invalider l'idempotence réelle de la facture 23.

Le test ciblé `GED-AUTO-05B facture atelier émise avec archive obligatoire` passe.

