# Rapport CRM et pro forma

Le bouton de création de devis commercial et sa modale ont été retirés du CRM. L'API conserve les consultations/historiques mais refuse toute nouvelle création avec HTTP 410. L'opportunité ouvre directement la création de pro forma lorsque `proformas.create` est accordé. La configuration pro forma dispose désormais de son propre endpoint. La liste n'applique aucun prédicat de statut lorsque « Tous les statuts » est choisi et recalcule correctement la pagination.
