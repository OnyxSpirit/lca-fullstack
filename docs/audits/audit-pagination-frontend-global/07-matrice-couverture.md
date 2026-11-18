# Matrice de couverture

Audit statique du 18 novembre 2026. `S` = serveur, `C` = client, `P` = partielle, `N` = absente, `E` = exemptée. Une pagination n'est marquée correcte que lorsque page, taille, total et navigation sont raccordés dans le code.

| ID | Module | Sous-module | Tableau ou liste | Pagination actuelle | API paginée | Anomalie | Priorité | Recommandation |
|---|---|---|---|---|---|---|---|---|
| PAG-001 | Activité | Journal | Événements d'activité | S correcte | Oui `/activity` | — | — | Conserver page/total/filtres |
| PAG-002 | Activité | Détail | Sections et changements d'un événement | E | Non, ressource unique | Volume borné par événement | — | Aucune pagination |
| PAG-003 | Authentification | Appareils | Appareils de confiance personnels | S correcte | Oui `/auth/2fa/devices/me` | — | — | Conserver |
| PAG-004 | Authentification | Administration 2FA | Appareils autorisés | S correcte | Oui `/auth/2fa/devices` | — | — | Conserver |
| PAG-005 | Authentification | Administration 2FA | Politiques individuelles utilisateurs | S correcte | Oui `/auth/2fa/users` | — | — | Conserver |
| PAG-006 | Authentification | Politiques | Politiques 2FA par rôle | E | Non | Petit référentiel de rôles | — | Exemption |
| PAG-007 | Facturation | Factures | Liste des factures | S correcte | Oui `/invoices` | — | — | Conserver |
| PAG-008 | Facturation | Détail facture | Lignes de facture | E | Dans la ressource | Bornées par document | — | Exemption |
| PAG-009 | Facturation | Détail facture | Paiements | N | Non `/invoices/:id/payments` | Historique croissant | Majeure | Pagination S, 20 |
| PAG-010 | Facturation | Détail facture | Remboursements | N | Non `/invoices/:id/refunds` | Historique croissant | Modérée | Pagination S, 20 |
| PAG-011 | Facturation | Détail facture | Avoirs et crédits disponibles | N | Non | Peut croître, liste secondaire | Modérée | Pagination S ou plafond explicite |
| PAG-012 | Facturation | Encaissements | Historique des règlements | N | Collection embarquée | Croissance continue | Majeure | Pagination S, 20, total |
| PAG-013 | Facturation | Nouvelle facture | Clients proposés | N | `/customers` non paginé via hook legacy | Charge un catalogue métier complet | Majeure | Recherche S asynchrone |
| PAG-014 | Facturation | Nouvelle facture | Ventes proposées | N | `/sales` hook legacy | Charge toutes les ventes | Majeure | Recherche S paginée |
| PAG-015 | CRM | Prospects liste | Vue Liste | S correcte | Oui `/leads` | — | — | Conserver 7/15/25 |
| PAG-016 | CRM | Kanban | Colonne Nouveau | P, page 1 + limite | Oui | Suite inaccessible au-delà de la limite | Majeure | Chargement progressif par colonne |
| PAG-017 | CRM | Kanban | Colonne Contacté | P, page 1 + limite | Oui | Suite inaccessible | Majeure | Chargement progressif |
| PAG-018 | CRM | Kanban | Colonne Qualifié | P, page 1 + limite | Oui | Suite inaccessible | Majeure | Chargement progressif |
| PAG-019 | CRM | Kanban | Colonne Rendez-vous | P, page 1 + limite | Oui | Suite inaccessible | Majeure | Chargement progressif |
| PAG-020 | CRM | Kanban | Colonne Essai | P, page 1 + limite | Oui | Suite inaccessible | Majeure | Chargement progressif |
| PAG-021 | CRM | Kanban | Colonne Proposition | P, page 1 + limite | Oui | Suite inaccessible | Majeure | Chargement progressif |
| PAG-022 | CRM | Kanban | Colonne Négociation | P, page 1 + limite | Oui | Suite inaccessible | Majeure | Chargement progressif |
| PAG-023 | CRM | Kanban | Colonnes Gagné/Perdu | P, page 1 + limite | Oui | Historique tronqué | Majeure | Pagination/archives dédiées |
| PAG-024 | CRM | Fiche prospect | Activités | N | Non `/leads/:id/activities` | Journal croissant | Majeure | Pagination S, 20 |
| PAG-025 | CRM | Fiche opportunité | Devis liés | N | Non `/quotations/opportunity/:id` | Collection croissante | Modérée | Pagination S, 10 |
| PAG-026 | CRM | Création | Doublons détectés | E | Non | Résultat de détection borné | — | Exemption avec plafond API |
| PAG-027 | Clients | Annuaire | Liste clients | S correcte | Oui `/customers` | — | — | Conserver 15/25/50 |
| PAG-028 | Client 360 | Chronologie | Timeline | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-029 | Client 360 | Opportunités | Opportunités | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-030 | Client 360 | Véhicules | Véhicules liés | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-031 | Client 360 | Commercial | Devis | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-032 | Client 360 | Commercial | Ventes | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-033 | Client 360 | SAV | Ordres de réparation | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-034 | Client 360 | Facturation | Factures | S correcte | Oui, pages 360 | — | — | Conserver |
| PAG-035 | Client 360 | Contacts | Contacts | E | Non | Liste volontairement bornée au client | — | Exemption, surveiller volume |
| PAG-036 | Client 360 | GED | Documents | E | Non | Dossier d'un client | — | Exemption conditionnelle |
| PAG-037 | Tableau de bord | Alertes | Notifications récentes | E, limite 5 | Oui, page 1 | Widget résumé avec lien | — | Exemption |
| PAG-038 | Tableau de bord | Atelier | OR actifs | E, widget | Non legacy | Résumé borné visuellement | Mineure | Plafond API explicite |
| PAG-039 | Livraisons | Planning | Liste/cartes livraisons | S correcte | Oui `/deliveries` | — | — | Conserver |
| PAG-040 | Livraisons | Création | Ventes candidates | N | Non `/deliveries/candidates` | Catalogue croissant | Majeure | Recherche S paginée |
| PAG-041 | Livraisons | Détail | Checklist | E | Non | Configuration bornée | — | Exemption |
| PAG-042 | Livraisons | Détail | Documents remis | E | Non | Borné par livraison | — | Exemption |
| PAG-043 | Livraisons | Détail | Services complémentaires | E | Non | Borné par livraison | — | Exemption |
| PAG-044 | Livraisons | Finance | Autorisations financières | N | Non | Historique décisionnel | Modérée | Pagination S si >20 |
| PAG-045 | GED | Répertoire | Documents | S correcte | Oui `/documents` | — | — | Conserver 10/25/50 |
| PAG-046 | GED | Upload | Recherche d'entités | N, suggestions | Non | Résultats potentiellement larges | Modérée | Limite serveur + top 20 |
| PAG-047 | GED | Fiche entité | Documents liés | N | Non `/documents/entity/...` | Dossier croissant | Majeure | Pagination S, 20 |
| PAG-048 | Notifications | Centre | Notifications | S correcte | Oui `/notifications` | — | — | Conserver |
| PAG-049 | RH | Personnel | Annuaire unifié | S correcte | Oui | — | — | Conserver |
| PAG-050 | RH | Salariés | Liste salariés | C correcte | API complète | Adapté seulement à volume moyen | Modérée | Migrer S à terme |
| PAG-051 | RH | Dossier salarié | Contrats | N | Non | Historique croissant | Modérée | Pagination S, 10 |
| PAG-052 | RH | Dossier salarié | Congés | N | Non | Historique croissant | Majeure | Pagination S, 20 |
| PAG-053 | RH | Dossier salarié | Primes | N | Non | Historique croissant | Majeure | Pagination S, 20 |
| PAG-054 | RH | Dossier salarié | Documents | N | Non | Dossier croissant | Modérée | Réutiliser pagination GED |
| PAG-055 | RH | Congés | Administration des demandes | S correcte | Oui | — | — | Conserver |
| PAG-056 | RH | Primes | Administration des primes | S correcte | Oui | — | — | Conserver |
| PAG-057 | RH | Rémunérations | Préparations | C correcte | API complète | Volumétrie périodique croissante | Modérée | Pagination S à terme |
| PAG-058 | RH | Rémunérations | Paiements/décaissements | S correcte | Oui | — | — | Conserver |
| PAG-059 | RH | Stock interne | Articles | C correcte | API complète | Volume potentiellement important | Modérée | Pagination S, 20 |
| PAG-060 | RH | Stock interne | Mouvements d'un article | C correcte | API complète | Historique croissant chargé entier | Majeure | Pagination S, 25 |
| PAG-061 | RH | Budgets | Budgets | C correcte | Non | Volume annuel modéré | Mineure | Conserver C ou S à terme |
| PAG-062 | RH | Budgets | Dépenses | S correcte | Oui `/hr/expenses` | — | — | Conserver |
| PAG-063 | RH | Budgets | Mouvements de fonds | N | Non | Journal financier croissant | Majeure | Pagination S, 25 |
| PAG-064 | RH | Budgets | Historique d'approbation | N | Non | Historique borné par budget | Mineure | Pagination si >20 |
| PAG-065 | RH | Prestataires | Profils/rattachements | S correcte | Oui annuaire unifié | — | — | Conserver |
| PAG-066 | RH | Prestataires | Contrats | N | Non | Historique croissant | Majeure | Pagination S, 10 |
| PAG-067 | RH | Prestataires | Historique contrat | N | Non | Journal croissant | Majeure | Pagination S, 20 |
| PAG-068 | RH | Prestataires | Rémunérations | N | Non | Données financières croissantes | Majeure | Pagination S, 20 |
| PAG-069 | RH | Prestataires | Paiements | N | Non | Journal financier croissant | Majeure | Pagination S, 20 |
| PAG-070 | RH | Référentiels | Types contrat/congé/prime | E | Non | Petits référentiels | — | Exemption |
| PAG-071 | RH | Fiscalité | Obligations fiscales | N | Non | Historique périodique croissant | Majeure | Pagination S, 20 |
| PAG-072 | Pièces | Catalogue | Pièces | S correcte | Oui `/parts` | — | — | Conserver |
| PAG-073 | Pièces | Catalogue | Catégories | E | Non | Référentiel borné | — | Exemption |
| PAG-074 | Pièces | Achats | Commandes fournisseur | S correcte | Oui, 7/page | — | — | Conserver, taille configurable |
| PAG-075 | Pièces | Achats directs | Achats | N | Non | Historique croissant | Majeure | Pagination S, 20 |
| PAG-076 | Pièces | Emplacements | Emplacements de stock | E | Non | Référentiel agence | — | Exemption conditionnelle |
| PAG-077 | Pièces | Ventes | Ventes comptoir | N | Non | Historique financier croissant | Majeure | Pagination S, 20 |
| PAG-078 | Pièces | Ventes | Lignes/retours d'une vente | E | Non | Bornées par document | — | Exemption |
| PAG-079 | Pièces | File atelier | Demandes internes | N | Non | File opérationnelle croissante | Majeure | Pagination S, 20 |
| PAG-080 | Pièces | Détail pièce | Mouvements | S correcte | Oui | — | — | Conserver |
| PAG-081 | Pièces | Détail pièce | Commandes/approvisionnements | N | Embarqué | Historique croissant | Modérée | Pagination S, 10 |
| PAG-082 | Pièces | Factures fournisseur | Factures | P | Endpoint reçoit filtres, hook attend tableau | Métadonnées non exploitées/contrat ambigu | Majeure | Normaliser PagedResult |
| PAG-083 | Pièces | Factures fournisseur | Rapprochements/avoirs | E | Détail | Bornés par facture | — | Exemption |
| PAG-084 | Proformas | Liste | Proformas | S correcte | Oui `/proformas` | — | — | Conserver |
| PAG-085 | Reporting | Garanties | Lignes garanties | N | Non | Rapport potentiellement volumineux | Majeure | Pagination S + export exhaustif |
| PAG-086 | Reporting | Finance | Lignes financières | N | Non | Rapport volumineux | Majeure | Pagination S + export séparé |
| PAG-087 | Reporting | Activité consolidée | Répartition par module | E | Agrégat | Cardinalité fixe | — | Exemption |
| PAG-088 | Reporting | Agences | Comparaison agences | E | Agrégat | Nombre d'agences borné | — | Exemption |
| PAG-089 | Reporting | Commercial | Performance vendeurs | N | Non | Effectif potentiellement élevé | Modérée | Pagination S, 20 |
| PAG-090 | Reporting | Atelier | Répartition origines | E | Agrégat | Trois origines | — | Exemption |
| PAG-091 | Ventes | Ventes | Liste ventes | S correcte | Oui `/sales` | — | — | Conserver |
| PAG-092 | Ventes | Devis | Liste devis | S correcte | Oui `/quotations` | — | — | Conserver |
| PAG-093 | Ventes | Détail | Paiements de la vente | N | Embarqué facture | Historique croissant | Modérée | Pagination S via facture |
| PAG-094 | SAV | Tableau de bord | Ordres de réparation | S correcte | Oui `/repair-orders` | — | — | Conserver |
| PAG-095 | SAV | Clients externes | Clients | S correcte | Oui | — | — | Conserver |
| PAG-096 | SAV | Client externe | Véhicules | E | Détail | Borné par client | — | Exemption |
| PAG-097 | SAV | Client externe | OR historiques | N | Détail | Historique croissant | Majeure | Pagination S, 10 |
| PAG-098 | SAV | Détail OR | Interventions | N | Embarqué | Peut croître mais borné par OR | Mineure | Pagination locale au-delà de 20 |
| PAG-099 | SAV | Détail OR | Pièces/réservations | N | Embarqué | Peut devenir longue | Mineure | Pagination locale au-delà de 20 |
| PAG-100 | SAV | Détail OR | Historique de statuts | N | Embarqué | Journal croissant | Modérée | Pagination S, 20 |
| PAG-101 | SAV | Caisse | Factures/soldes | P | Factures paginées, sous-listes non | Pages et soldes mélangés | Modérée | Séparer les contrats |
| PAG-102 | SAV | Transferts | Transferts de caisse | N | Non | Journal financier croissant | Majeure | Pagination S, 20 |
| PAG-103 | Atelier | Planning | Planning période | E | Fenêtre temporelle | Borné par dates/agence | — | Exemption |
| PAG-104 | Atelier | Historique | Interventions | S correcte | Oui, 7/page | — | — | Conserver |
| PAG-105 | Atelier | Ressources | Techniciens/ponts/indisponibilités | E | Fenêtre/agence | Référentiel opérationnel borné | — | Exemption |
| PAG-106 | Showroom | Visites | Tableau/cartes visites | S correcte | Oui `/showroom` | — | — | Conserver 6/page |
| PAG-107 | Showroom | Détail visite | Essais routiers | N | Détail | Historique limité par visite | Mineure | Exemption avec seuil |
| PAG-108 | Showroom | Sélecteurs | Véhicules/candidats commerciaux | N | Non legacy | Catalogue potentiellement large | Majeure | Recherche S paginée |
| PAG-109 | Véhicules | Stock | Cartes véhicules | S correcte | Oui `/vehicles` | — | — | Conserver 20/page |
| PAG-110 | Véhicules | Détail 360 | Historique statuts | N | Embarqué | Journal croissant | Modérée | Pagination S, 20 |
| PAG-111 | Véhicules | Détail 360 | Mouvements/transferts | N | Embarqué | Journal croissant | Majeure | Pagination S, 20 |
| PAG-112 | Véhicules | Détail 360 | Documents/réservations/ventes/livraisons/OR | N | Embarqué | Plusieurs historiques croissants | Majeure | Pages indépendantes par collection |
| PAG-113 | Véhicules | Catalogue commercial | Modèles/versions | N | Non | Référentiel qui peut grandir | Modérée | Recherche + pagination S |
| PAG-114 | Véhicules | Transferts | Transferts interagences | N | Non `/vehicle-interagency-transfers` | Historique global chargé entier | Majeure | Pagination S, 20 |
| PAG-115 | Comptabilité | Écritures | Écritures comptables | P, limite fixe 50 | Oui probablement | Aucun bouton/page transmis | Majeure | Raccorder page, total, taille |
| PAG-116 | Comptabilité | Plan comptable | Comptes | P | Réponse items/total, UI sans navigation | Résultats au-delà de la limite inaccessibles | Majeure | Navigation S |
| PAG-117 | Comptabilité | Journaux | Journaux | P, pageSize=100 fixe | Oui | Au-delà de 100 inaccessible | Majeure | Pagination S |
| PAG-118 | Comptabilité | Historique compte | Modifications | N | Non | Journal croissant | Modérée | Pagination S, 20 |
| PAG-119 | Comptabilité | Exercices/périodes | Exercices et périodes | E | Non | Petit référentiel annuel | — | Exemption |
| PAG-120 | Comptabilité | Automatisation | File d'événements | S correcte | Oui | — | — | Conserver |
| PAG-121 | Comptabilité | Avancée | Grand livre/balance/auxiliaire | S correcte | Oui | — | — | Conserver |
| PAG-122 | Comptabilité | Avancée | Contrôles, clôtures, modèles, profils | N | Non | Historiques croissants | Majeure | Pagination S par panneau |
| PAG-123 | Trésorerie | Comptes | Comptes | C correcte | Non | Volume modéré | Mineure | Conserver ou migrer S |
| PAG-124 | Trésorerie | Catégories | Catégories | C correcte | Non | Référentiel modéré | — | Conserver C |
| PAG-125 | Trésorerie | Journal | Mouvements | S correcte | Oui | — | — | Conserver |
| PAG-126 | Trésorerie | Couverture | Budgets et réservations | C correcte | Non | Peut croître | Modérée | Pagination S à terme |
| PAG-127 | Trésorerie | Rapprochement | Relevés bancaires | N | Non | Historique croissant | Majeure | Pagination S, 20 |
| PAG-128 | Trésorerie | Rapprochement | Lignes/propositions/écarts/non rapprochés | N | Non | Volumes bancaires élevés | Majeure | Pagination S indépendante |
| PAG-129 | Trésorerie | Rapprochement | Groupes d'affectation | N | Non | Historique croissant | Majeure | Pagination S, 20 |
| PAG-130 | Trésorerie | Dashboard | Activités financières | S correcte | Oui, 20/page | — | — | Conserver |
| PAG-131 | Trésorerie | Mappings | Mappings de flux | C correcte | Non | Référentiel borné | — | Conserver C |
| PAG-132 | Utilisateurs | Annuaire | Utilisateurs | S correcte | Oui `/users` | — | — | Conserver |
| PAG-133 | Utilisateurs | Rôles | Rôles | N | Non | Référentiel généralement borné | Mineure | Recherche/client si >50 |
| PAG-134 | Utilisateurs | Rôle | Catalogue permissions | N | Non | Grand référentiel, regroupé par module | Modérée | Recherche + virtualisation |
| PAG-135 | Utilisateurs | Affectations | Agences et rôles d'un utilisateur | E | Non | Borné par utilisateur | — | Exemption |
| PAG-136 | Paramètres | Agences | Agences | N | Non | Peut croître mais administration centrale | Mineure | Pagination C/S au-delà de 50 |
| PAG-137 | Paramètres | Constructeurs | Constructeurs et marques | N | Non | Référentiel croissant | Modérée | Pagination S + recherche |
| PAG-138 | Paramètres | Ressources | Ponts et fournisseurs | N | Non | Fournisseurs potentiellement nombreux | Majeure | Pagination S fournisseurs |
| PAG-139 | Paramètres | Documents | Catégories/types/cachets/politiques | E | Non | Référentiels configurables bornés | — | Exemption surveillée |
| PAG-140 | Paramètres | Atelier | Barèmes de main-d'œuvre | E | Non | Petit référentiel agence | — | Exemption |
| PAG-141 | Paramètres | Emplacements véhicules | Emplacements | N | Non | Référentiel multiagence croissant | Modérée | Pagination S ou recherche |

## Totaux

- Modules fonctionnels inspectés : **20**.
- Surfaces recensées : **141**.
- Pagination correcte : **48** (`39 S` et `9 C`).
- Pagination partielle : **13**.
- Sans pagination : **54**.
- Exemptées : **26**.
- Surfaces avec anomalie/recommandation : **75**.
- Critiques : **0** ; majeures : **44** ; modérées : **22** ; mineures : **9**.

Les totaux incluent les listes en cartes et les sous-listes de détail, pas seulement les 62 balises `<table>`.
