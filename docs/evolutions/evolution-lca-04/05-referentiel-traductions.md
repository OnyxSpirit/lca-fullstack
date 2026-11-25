# Référentiel de traductions

Le référentiel maintenable se trouve dans `backend-node/src/shared/business-labels.ts`.

- Champs véhicules : brand/make → Marque ; model → Modèle ; engine_type → Motorisation ; mileage → Kilométrage ; vin → Numéro de châssis (VIN).
- États : DRAFT → Brouillon ; PENDING → En attente ; APPROVED → Approuvé ; POSTED → Comptabilisé ; CANCELLED → Annulé ; PARTIALLY_PAID → Partiellement payée.
- Paiements : CASH → Espèces ; CARD → Carte bancaire ; BANK_TRANSFER → Virement bancaire ; CHECK/CHEQUE → Chèque ; MOBILE_MONEY reste Mobile Money.
- Stocks : ENTRY → Entrée de stock ; EXIT → Sortie de stock ; REPAIR_ORDER → Consommation atelier ; SALE_RETURN → Retour de vente.
- Contrats : FIXED_TERM → Durée déterminée ; INDEFINITE → Durée indéterminée.

Une valeur inconnue n'est pas assimilée à un état existant. Les références techniques nécessaires restent dans les données, pas dans le libellé utilisateur.
