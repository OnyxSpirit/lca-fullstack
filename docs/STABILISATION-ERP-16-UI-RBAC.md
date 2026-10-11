# ERP-16 — Recette RBAC navigateur et API

## Navigateur

La session Super Administrateur accède aux écrans Vente, Livraison, Client 360, SAV, Garantie et Notifications. La campagne n'a pas saisi de mots de passe de profils secondaires dans le navigateur.

## API authentifiée

- Pièces A2 : catalogue autorisé ; ajustement forgé sur agence 3 refusé `403`.
- Commercial A3 : stock collectif véhicules 11/12 refusé `403` sous scope OWN.
- Finance A3 : factures A2 et A3 autorisées sous scope CONCESSION.
- Livraison A3 : livraison A3 autorisée, livraison A2 masquée `404`.
- Technicien A3 et conseiller SAV A4 : OR hors propriété/agence masqués `404`.
- Super Administrateur : lectures A2/A3 autorisées.
- Pièces A2 : mutation de la notification personnelle admin refusée `403`.

Statut : **PARTIEL** pour la couverture navigateur multi-profils ; **VALIDÉ** pour les contrôles API directs.

