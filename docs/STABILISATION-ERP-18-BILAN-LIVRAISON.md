# ERP-18 — Bilan de livraison

| Domaine | Validé | Réserve/anomalie | Confiance |
|---|---|---|---|
| Infrastructure | six conteneurs sains, isolation historique, sauvegardes | dérive Compose MySQL connue | élevée |
| Auth/RBAC API | 12 profils métier connectés officiellement, 401/403 cohérents | navigateur multi-profils absent | élevée côté API, moyenne côté UI |
| Pièces | catalogue/stock/commandes/fournisseurs et gardes UI | cumul de permissions Atelier/Pièces impossible hors Super Admin | faible pour workflow OR/Pièces |
| CRM | filtre Toute l'équipe fonctionnel | conversion générique non décidée | élevée hors conversion |
| Stock véhicules | VIN, filtres, actifs/terminaux, GED véhicule | aucune anomalie bloquante | élevée |
| Vente/Livraison | annulation terminale et préconditions financières | libellés métier à confirmer ; dialogue natif | élevée |
| Showroom | colonnes, agrégats et pagination | aucune réserve bloquante | élevée |
| GED/PDF | reprise isolée, immuabilité, rendus ERP-17 | harnais GED ancien et crash processus | moyenne |
| Multi-concessions | multi-agences déjà couvert | une seule concession | faible pour inter-concessions |

## Verdict

**NON PRÊT POUR LIVRAISON générale.** L'application est techniquement stable et la majorité des anomalies historiques sont closes, mais le workflow métier Atelier/Pièces ne possède actuellement aucun profil métier opérationnel autre que Super Administrateur. Ce P1 doit être arbitré, corrigé par configuration ou conception autorisée, puis validé API et navigateur.

Une livraison limitée excluant explicitement le workflow réservation/consommation Pièces depuis un OR pourrait être qualifiée **PRÊTE SOUS RÉSERVES**, sous acceptation formelle de R2 à R8.
