# Rapport d’implémentation

La migration 135 ajoute les diagnostics autonomes et leurs lignes, le lien historique multi-techniciens, l’indicateur RH technicien, les snapshots client tiers/fiscaux et les permissions indispensables. Le frontend réutilise le tableau SAV, la modale de réception, les composants UI, TanStack Query et la pagination existante. Le backend conserve les services de transaction, fiscalité, facturation, documents et stock existants. Les factures tiers utilisent désormais un LEFT JOIN et leurs snapshots, ce qui corrige la génération PDF sans fiche CRM.
