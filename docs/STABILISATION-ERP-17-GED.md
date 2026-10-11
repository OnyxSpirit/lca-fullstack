# ERP-17 — GED Atelier

Audit : facturation sous transaction et verrou OR ; facture existante retournée au rejeu. Commit facture/OR AVANT archiveInvoice. requireBusinessArchive transforme l'échec technique en503 explicite «Finalisation enregistrée… Réessayez».
Garantie réelle : reprise idempotente, pas atomicité facture+fichier. Le paiement et la lecture PDF exigent l'archive officielle.
archiveBusinessDocument cherche source_key, écrit fichier, insère document transactionnellement, supprime le fichier si insertion échoue, et gère le conflit d'unicité.

Test erp17-ged-recovery : modules DB/rendu/stockage/émission/fs simulés, aucun volume touché.
Échec rendu : aucun fichier/document ; facture simulée issued conservée.
Échec insertion : fichier simulé nettoyé ; aucun document.
Reprise puis rejeu : un document et un fichier, même ID. 1/1 validé.
Limites : test de la chaîne archiveInvoice/requireBusinessArchive, pas du routeur OR entier ni d'une panne processus. Crash après écriture avant INSERT, ou échec unlink ignoré, peuvent laisser un orphelin ; pas de réconciliation automatique prouvée. Réserve end-to-end PARTIELLE.

