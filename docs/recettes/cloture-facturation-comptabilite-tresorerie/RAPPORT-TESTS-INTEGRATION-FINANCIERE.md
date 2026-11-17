# Tests d’intégration financière

Chaîne API/MySQL réussie : facture → paiements → mouvements de trésorerie → événements → écritures comptables. Le reporting, la trésorerie, le Grand livre et les intégrations ont été observés au navigateur.

La chaîne SAV confirme à nouveau cette intégration avec 53 505 XAF, mouvement 18, trois événements `POSTED`, écritures 12 et 13 équilibrées et documents GED archivés.

Revalidation finale : migration 129 sur base vide, provisionnement des flux prêt, facture 400 000 XAF, quatre mouvements d’encaissement, remboursements, mouvements manuels, transfert et contrepassation. Les suites globales ne détectent aucune régression.
