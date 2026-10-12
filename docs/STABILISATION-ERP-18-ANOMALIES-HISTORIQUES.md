# ERP-18 — Audit des anomalies historiques

| Sujet | Preuve actuelle | Verdict |
|---|---|---|
| CRM « Toute l'équipe » | filtre visible et sélectionné ; 11 prospects rendus dans le navigateur | CLÔTURÉ |
| Prospect → Client | aucun workflow officiel générique établi ; ne pas inventer la règle | DÉCISION MÉTIER |
| VIN | regex frontend/backend stricte à 17 caractères et tests verts | CLÔTURÉ |
| Emplacements véhicules/pièces | Stock expose Parc/Showroom ; Pièces reste sur emplacements magasin | CLÔTURÉ |
| Véhicules vendus disponibles | vue `Stock actif` et verrouillage des statuts vendus/livrés couverts | CLÔTURÉ |
| Filtres marque/modèle | contrôles visibles dans le navigateur avec valeurs réelles | CLÔTURÉ |
| Vente annulée terminale | ventes 4/7 annulées ; transitions, facture et livraison après annulation protégées | CLÔTURÉ |
| Confirmation commande/vente | transitions séquentielles ; préparation/prêt bloqués sans facture soldée ou autorisation | VALIDÉ AVEC RÈGLE ACTUELLE |
| Showroom compteurs/colonnes | tests agrégats/pagination et dix colonnes verts | CLÔTURÉ |
| GED depuis véhicule | onglet GED, action `Ajouter un document`, prévisualisation et téléchargement présents | CLÔTURÉ |

## Réserves non bloquantes

Le dialogue natif `window.prompt` subsiste pour le motif d'annulation d'une vente. La conversion générique Prospect → Client reste une décision produit. Aucune nouvelle règle de facturation n'a été imposée aux transitions commerciales.

## Anomalie nouvelle

`ERP18-PARTS-01`, décrite dans le rapport Pièces, est la seule anomalie P1 nouvelle démontrée.
