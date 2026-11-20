# Matrice de qualification — francisation des tableaux et exports

Date de qualification : 20 novembre 2026  
Périmètre : ERP LCA, interfaces métier et exports CSV/XLSX.

## Règles vérifiées

- Les valeurs techniques restent inchangées dans les requêtes, filtres, transitions et données persistées.
- Les utilisateurs voient des libellés français, y compris dans les filtres et les fichiers exportés.
- Une valeur inconnue produit un libellé explicite et ne disparaît pas silencieusement.
- Les CSV conservent l’UTF-8 avec BOM, neutralisent les formules et préservent les valeurs numériques.
- Les classeurs XLSX conservent les nombres, formules et formats monétaires.

## Matrice

| Domaine | Écran / export | Codes couverts | Preuve automatisée | Résultat |
|---|---|---|---|---|
| Comptabilité | Journaux, liaisons, écritures, contrôles, clôtures, relevés et rapprochements | statuts, types d’états, sens d’échange, correspondances, écarts | `frontend/test/qgp-server-pagination.test.ts` FR-UI-002 ; lint frontend | Conforme |
| Comptabilité | Plan comptable CSV/XLSX | types de comptes | `backend-node/test/francisation-tableaux-exports.test.ts` ; lint backend | Conforme |
| Finance | Centre de pilotage CSV/XLSX | sections, colonnes, événements, sens, statuts | test du classeur réel et registre `business-labels.ts` | Conforme |
| Reporting | Rapport financier CSV/XLSX | nom du rapport, périmètre, colonnes dynamiques | lint backend et tests de libellés | Conforme |
| SAV | Factures, transit et journal | statuts financiers et événements SAV | FR-UI-001 ; test backend des événements SAV | Conforme |
| SAV | Journal CSV | type d’opération et événements | génération CSV réelle dans `francisation-tableaux-exports.test.ts` | Conforme |
| Pièces | Achats directs, ventes et retours | nature, financement, statuts, état, décision | FR-UI-003 | Conforme |
| Pièces | Commandes, mouvements, demandes internes, factures fournisseurs | statuts, types de mouvement, règlement | FR-UI-004 | Conforme |
| Véhicules | Transferts et ressources opérationnelles | statuts de transfert et de ressource | lint frontend ; registre centralisé | Conforme |
| Paramètres | Checklist livraison | catégories, types, obligation et statuts | tests delivery-checklist-configurable frontend/backend | Conforme |
| Garanties | Tableau du reporting | décision et statut de créance | FR-UI-004 | Conforme |
| Fiscalité | Tableau des obligations | statut | lint frontend ; registre centralisé | Conforme |

## Qualification technique

| Contrôle | Résultat observé |
|---|---|
| TypeScript frontend (`npm run lint`) | Réussi |
| Suite frontend globale | 1 071 réussis, 0 échec |
| TypeScript backend (`npm run lint`) | Réussi |
| Test backend d’application hors restriction de port | 119 réussis, 0 échec |
| Test ciblé de fichiers CSV/XLSX réels | Réussi |
| Intégrité du diff (`git diff --check`) | Réussie |

## Limite de recette interactive

La recette navigateur des écrans protégés s’arrête au second facteur d’authentification : aucun secret TOTP autorisé n’est disponible dans le périmètre de qualification. Aucun contournement de sécurité n’a été utilisé. La couverture est donc assurée par compilation, tests statiques, tests d’intégration et génération effective des fichiers.
