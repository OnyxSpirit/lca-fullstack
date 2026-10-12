# Guide d'utilisation fonctionnelle

L'affichage dépend des permissions. L'absence d'un menu ou d'une action peut être normale pour le profil connecté.

| Domaine | Capacités présentes | Niveau de preuve |
|---|---|---|
| CRM/Clients | prospects, activités, suivi, conversion, fiche client 360° | validé dans le périmètre mono-concession ; règle générique de conversion à confirmer métier |
| Showroom | visites, essais, réception et origine CRM/Showroom | testé et consolidé |
| Véhicules | catalogue et stock VN/VO, affectations, transferts, coûts, véhicules extérieurs Atelier | testé ; isolation multi-concession sous réserve |
| Ventes | devis, vente, réservation, annulation, marges | testé avec concurrence/idempotence |
| Facturation | factures, paiements, avoirs, remboursements, documents officiels | testé ; paramétrage financier requis |
| Livraison | préparation, checklist, services additionnels, PV et dérogation financière | présent et testé par campagnes ciblées |
| SAV/Atelier | réception, OR, diagnostic, planning, interventions, garanties, restitution | testé et consolidé |
| Pièces | catalogue, fournisseurs, stocks, mouvements, réservations OR, commandes | testé, dont concurrence ERP-19 |
| GED | dépôt, rattachement, aperçu, téléchargement, archivage | testé ; crash brutal sous réserve |
| Trésorerie | comptes, mouvements, mappings, transferts, rapprochement | présent et testé par lots financiers ciblés |
| RH/Admin | personnel, contrats, congés, primes, rémunérations, budgets, stocks internes | présent et testé par campagnes ciblées ; pas un moteur de paie complet |
| Pilotage | tableaux de bord, rapports, notifications et activité | présent ; couverture navigateur non exhaustive pour toutes combinaisons de scopes |

## Parcours conseillé

Commencer par contrôler l'agence active et le profil. Créer les référentiels avant les transactions. Pour un véhicule : prospect/client → véhicule/Showroom → devis/vente → facture/paiement → livraison. Pour l'après-vente : client/véhicule → OR → diagnostic/approbation → pièces/interventions → contrôle → facture → restitution.

Les documents finalisés sont archivés comme preuves historiques et ne sont pas régénérés silencieusement. Les actions refusées doivent être signalées à l'administrateur ; ne pas élargir un rôle sans validation métier.

