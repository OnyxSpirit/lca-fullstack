# Tests GED

Les mécanismes GED historiques sont préservés : clé source unique, empreinte SHA-256, stockage contrôlé, agence, auteur, version et origine `generated`.

Le test MySQL `document-finalization-archive-mysql.integration.ts` a validé **12/12** archives officielles : remboursement, annulations paiement/facture/vente, essai, mouvement véhicule, réception et mouvement pièces, écriture comptable, relevé bancaire, contrôle qualité et restitution SAV. Pour chaque cas, le premier appel crée ou retrouve l’archive, le rejeu retourne le même identifiant avec `created=false`, et une seule ligne GED porte la clé source.

La campagne HTTP officielle a contrôlé que les 22 GET PDF laissent le compteur GED inchangé (**16 avant, 16 après**). Les inventaires restent correctement non archivés. L’accès anonyme renvoie 401 et l’accès croisé agence renvoie 404.

Résultat : **FIN-001 clôturée**.
