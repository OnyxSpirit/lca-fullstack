# AUDIT-LCA-SIGNATURES-CACHETS-01 — Rapport général

## Verdict

**NON CONFORME.** Le modèle de données distingue correctement l’éligibilité d’un cachet et la politique d’un document, mais la lecture des politiques contient un défaut de cloisonnement SQL démontré qui explique leur disparition après actualisation. L’interface partage aussi un unique état de mutation entre tous les formulaires.

## Fonctionnel

- Opérationnel : versionnement des images, catégories concession, affectations multi-documents, partage inter-agences, révocation, historique PDF et workflow explicite du PV de livraison.
- Partiellement opérationnel : politiques automatiques pour devis, bon de commande, facture et reçu ; leur écriture est cohérente mais leur relecture est défaillante.
- Défaillant : hydratation fiable des politiques par agence et indépendance visuelle des boutons.
- Non couvert : pro forma, documents SAV/comptables et la majorité des PDF officiels n’emploient pas le moteur de politiques.

## Preuves

- `backend-node/src/modules/document-marks/document-mark.routes.ts`, routes `/policies` et `/policies/:documentType`.
- `backend-node/src/modules/document-marks/document-mark-policy.service.ts`, `resolveDocumentMarks`.
- `backend-node/src/modules/documents/business-document.service.ts`, quatre intégrations automatiques et un workflow livraison explicite.
- 40 tests statiques/PDF ciblés exécutés : 40 réussis, 0 échec.
- Docker présent, mais aucun conteneur neuf dédié à cet audit n’a été créé ; les scénarios MySQL en écriture sont donc réservés.

Aucun fichier applicatif n’a été modifié pendant cet audit.
