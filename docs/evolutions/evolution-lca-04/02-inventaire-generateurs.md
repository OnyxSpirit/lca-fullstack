# Inventaire des générateurs

La recherche a recensé 31 routes PDF explicites, auxquelles s'ajoutent les générateurs indirects de livraison, fiche employé, ordre de réparation, planning et rapports financiers. Douze routes/familles d'export couvrent CSV et XLSX ; certains endpoints acceptent plusieurs formats.

| Domaine | Documents / exports | Format | Générateur principal | Permission / archivage |
|---|---|---|---|---|
| CRM / Client | Fiche prospect, fiche client | PDF | `official-document.routes.ts` | droits CRM/client, non archivé |
| Showroom | Visite, essai | PDF | official record / business archive | `showroom.view`, essai final archivé |
| Véhicules | Fiche, inventaire, mouvement | PDF | vehicle + official record | droits véhicules, mouvements archivés |
| Ventes | Bon de commande, devis, pro forma | PDF | `commercial-document.ts` | droits vente/devis/pro forma, archives immuables |
| Facturation | Facture, reçu, avoir, annulations, export opérations | PDF/CSV | commercial/business/billing export | droits facturation, archives GED |
| Livraison | PV, planning, documents remis | PDF | commercial/delivery document | droits livraison, PV archivé |
| SAV / Atelier | Devis diagnostic, OR, diagnostic, contrôle, restitution | PDF | business/commercial/official record | droits SAV, archives selon étape |
| Pièces | Demande, commande, réception, mouvement, inventaire | PDF/CSV/XLSX | official record, part routes | droits pièces, événements finalisés archivés |
| RH | Fiche employé, acquisitions internes | PDF/CSV | employee document / frontend CSV | permissions RH et stock interne |
| Comptabilité | Journal, pièce, plan, écritures, grand livre, balance | PDF/CSV/XLSX | accounting document / workbook | permissions comptables |
| Trésorerie | Rapprochement, relevé, mouvements | PDF/CSV | official record / financial CSV | permissions trésorerie |
| Reporting | synthèses métiers et financières | PDF/CSV/XLSX | report CSV, financial workbook, official record | `reporting.view/export` |
| Activité | rapport et fiche d'activité | PDF | activity document | périmètre activité |
| GED | téléchargement / aperçu des fichiers existants | format d'origine | document storage | aucune réécriture du contenu externe |

Les routes techniques de configuration des marques documentaires et les téléchargements GED ne sont pas comptés comme nouveaux générateurs. Les fichiers externes sont servis tels quels.
