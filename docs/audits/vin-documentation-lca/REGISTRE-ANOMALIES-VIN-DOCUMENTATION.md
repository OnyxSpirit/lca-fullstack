# Registre des anomalies VIN et documentation

| ID | Gravité | Module | Constat et cause | Reproduction / actuel | Attendu | Fichiers | Proposition future |
|---|---|---|---|---|---|---|---|
| VIN-01 | P1 | Stock | Défaut historique : `maxLength` limitait le DOM, pas l'état React brut | version antérieure à `af4414d`, coller >17 puis soumettre | état/payload limités | `NewVehicleModal.tsx`, `vehicleVin.ts` | déjà corrigé ; recette navigateur/cache à confirmer |
| VIN-02 | P1 | Atelier | Champ VIN extérieur sans normalisation, maxLength ni majuscules UI | saisir/coller 18+ ; backend 400 | tronquer à 17 avant état/payload | `NewRepairOrderModal.tsx` | réutiliser `normalizeVinInput` |
| VIN-03 | P2 | VIN transversal | Stock refuse espaces internes, Atelier les supprime | saisir VIN avec espace | règle unique documentée | deux normaliseurs frontend/backend | centraliser contrat |
| VIN-04 | P3 | MySQL | colonne `VARCHAR(50)` sans CHECK longueur | écriture hors API possible | défense DB additive éventuelle | baseline + migration 070 | analyser CHECK sans casser historiques |
| DOC-01 | P1 | Tous PDF centraux | pied ne commence pas par raison sociale + forme | générer tout PDF central | ordre demandé | `document-layout.ts` | enrichir `documentFooterLines` |
| DOC-02 | P1 | Comptabilité | PDF grand livre/balance hors modèle LCA | exporter PDF | document officiel complet | `accounting-advanced.routes.ts` | renderer partagé dédié |
| DOC-03 | P1 | Reporting | PDF financier local sans identité/pied | export PDF | identité LCA | `financial-dashboard.routes.ts` | renderer rapport central |
| DOC-04 | P1 | Livraison | capture manuscrite client PNG obligatoire | finaliser sans signatureData | ne pas imposer capture applicative | `delivery.routes.ts` | découpler consentement, remise et signature externe |
| DOC-05 | P1 | Magasin | aucun bon officiel | commander/réceptionner/sortir | documents traçables | routes parts | templates par événement |
| DOC-06 | P1 | SAV | contrôle qualité/restitution sans PDF autonome | terminer workflow | pièce officielle selon décision métier | workshop routes | renderers centralisés |
| DOC-07 | P1 | Encaissement | aucun document remboursement/annulation | rembourser/annuler | justificatif officiel lié à l'origine | billing routes | nouveaux documents archivés |
| DOC-08 | P1 | Comptabilité | journal/écriture/rapprochement sans PDF officiel | consulter/exporter | PDF imprimable | accounting/treasury routes | ajouter renderers officiels |
| DOC-09 | P2 | Exports | fallback `labels[k] ?? k` expose clés anglaises | nouvelle clé non mappée | libellé français obligatoire | financial report/dashboard | registre de labels exhaustif + test |
| DOC-10 | P2 | Excel | feuilles et formats monétaires hétérogènes | ouvrir XLSX | dates/montants/XAF cohérents | routes accounting/reports | helper Excel commun |
| DOC-11 | P2 | Permissions | génération, impression et téléchargement partagent souvent `view` | télécharger devis/facture | politique documentée | routes PDF | décider permissions distinctes sans les inventer |
| DOC-12 | P2 | Marques | zones présentes mais marques chargées surtout en livraison | générer devis/facture | règles par type | layout, business service | matrice de compatibilité + snapshots |
| DOC-13 | P2 | Pro-forma | annexes traduisent les clés techniques mécaniquement | champ technique anglais | libellé métier français | `commercial-document.ts` | dictionnaire technique partagé |
| DOC-14 | P2 | Archives | brouillons rendus live, officiels archivés : statut peu visible UI | demander PDF selon statut | distinction explicite | routes commerciales | afficher nature live/archive |
| DOC-15 | P2 | Administration/CRM | fiches prospect/client/showroom absentes | chercher action d'impression | décision produit explicite | modules concernés | prioriser selon usage réel |
| DOC-16 | P2 | Pagination | PDF comptables tronquent le grand livre à 200/1500 lignes | exporter gros volume | pagination complète/avertie | accounting advanced | streaming/pagination et totaux |
| DOC-17 | P2 | Dates | ISO et formats français mélangés | comparer CSV/XLSX/PDF | format français uniforme | exports multiples | helper date métier |
| DOC-18 | P2 | Documents SAV | OR et devis partagent un renderer piloté par statut | changer statut | identité documentaire stable | `renderRepairOrderDocument` | séparer vues explicites sans dupliquer layout |
| DOC-19 | P3 | Terminologie | “NIU” dans le code, exigence écrite “NU” | lire pied | terminologie validée | `document-layout.ts` | arbitrage métier avant correction |
| DOC-20 | P3 | Noms fichiers | sections internes anglaises dans certains noms | exporter financial section | noms français | financial report | table noms de fichiers française |

## Décompte

- P0 : 0.
- P1 : 10, dont `VIN-01` historique déjà corrigée dans le code courant.
- P2 : 11.
- P3 : 3.

`VIN-01` est conservée dans le décompte pour traçabilité, mais n'est plus active dans le code courant. Toute correction de `DOC-04` requiert d'abord l'arbitrage métier prévu par la mission.
