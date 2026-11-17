# Tests des caisses et transferts

API exécutée puis rejouée : les opérations manuelles ressortent `duplicate: true`, un seul transfert porte la référence `FIN-E2E-TRANSFER-001`, avec un débit et un crédit de 50 000 XAF.

Le navigateur a ensuite affiché le journal de trésorerie, ses filtres et le mouvement d’encaissement SAV de 53 505 XAF dans l’agence Pointe-Noire.

La reconstruction finale confirme les comptes BZV/PNR, le transfert unique de 50 000 XAF, les actions « Nouvelle entrée » et « Nouvelle sortie » et la séparation RBAC du profil Trésorerie.
