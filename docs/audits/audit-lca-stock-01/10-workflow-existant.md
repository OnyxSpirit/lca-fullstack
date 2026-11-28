# Workflow réellement implémenté

```mermaid
flowchart TD
  A[/vehicles/] --> B{vehicles.catalog.view ?}
  B -->|oui| C[Onglet Modèles sur commande]
  C --> D[GET commercial-models]
  C --> E[GET vehicle-orders paginé / agence]
  D --> F[Sélection ou création profil]
  F --> G[POST/PATCH commercial-models]
  F --> H[Quantité + Enregistrer la commande]
  H --> I[POST vehicle-orders + UUID]
  I --> J[Transaction: vehicle_orders]
  J --> K[N vehicles VIN NULL / ordered / FK commande]
  K --> L[Historique + audit]
  L --> M[Invalidation commandes et véhicules]
  E --> N[Réceptionner]
  N --> O[POST receipts quantité + UUID]
  O --> P[Verrou commande et unités ordered]
  P --> Q[Update mêmes IDs vers received]
  Q --> R[Reçu JSON + historiques + audit]
  R --> M
  M --> S[Véhicules visibles dans stock]
```

Workflow secondaire : `/vehicles/catalog` → redirection `/vehicles` → vue « Véhicules en stock »; l'utilisateur doit cliquer l'onglet. Aucun workflow de détail/annulation de commande.

