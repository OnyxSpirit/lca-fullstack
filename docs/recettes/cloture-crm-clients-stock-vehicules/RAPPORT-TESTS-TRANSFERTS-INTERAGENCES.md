# Rapport de tests des transferts inter-agences

États implémentés : `PENDING_SHIPMENT`, `IN_TRANSIT`, `RECEIVED`, `RETURN_REQUIRED`, `CANCELLED`.

L’initiation contrôle les agences et permissions source/destination. L’expédition enlève l’emplacement fictif et place le véhicule en transit. La réception exige un emplacement actif destination. Une annulation en transit exige un retour physique confirmé par la source. Chaque transition est transactionnelle, historisée, notifiée aux deux agences et produit un mouvement archivable en GED. L’unicité d’un transfert actif par véhicule est protégée en base.

La suite MySQL réelle couvre permissions source/destination, destination inactive, véhicules réservés/vendus/livrés, doublon et concurrence, expédition/réception/double réception, emplacement invalide, historique, mouvement, GED, retour en transit et annulation idempotente. Le navigateur a confirmé le flux A→B complet avec bascule d’agence et choix du parc destination.
