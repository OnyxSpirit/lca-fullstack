# STABILISATION-ERP-03 — Clients 360

Deux dossiers réutilisables ont été créés par leurs propriétaires dans leur agence légitime : `CLI-000001` (Élodie-Anne Mavoungou, particulier VIP) et `CLI-000002` (REC03 Transports & Fils Client, entreprise). Un troisième client technique prouve la protection concurrente d'identité.

La recherche API et navigateur par nom accentué retrouve `CLI-000001`. La fiche 360 s'ouvre réellement, affiche identité, coordonnées, classification et collections vides cohérentes. L'API 360 retourne les sections autorisées et une timeline de création. Un contact d'entreprise a été créé puis modifié.

Le doublon client de même identité dans la même agence est refusé 409. Deux créations simultanées avec le même courriel donnent 201/409 : un seul enregistrement est conservé.

Le CRM et Customers sont deux modèles liés par `customer_id`, mais aucune action officielle de conversion/liaison d'un prospect existant vers un client n'est exposée dans le périmètre actuel. Les clients créés dans Clients 360 sont visibles dans cet espace, mais ne deviennent pas automatiquement des prospects. Ce contrat est documenté sans insertion SQL de contournement.

