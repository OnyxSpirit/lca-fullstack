# ERP-15 — Plan d'exécution préalable

Environnement exclusif : frontend `4176`, API `3004/api`, MySQL `33321`. Les conteneurs historiques et le port `3001` restent en lecture seule et ne seront ni arrêtés ni redémarrés.

## Ordre et réutilisation des ressources

1. Snapshot initial et preuve d'isolation.
2. Création officielle d'un client et d'un véhicule REC15 dans une agence disposant des acteurs requis.
3. Vente positive : réservation, confirmation, facture, paiement intégral, préparation, livraison.
4. Contrôles financiers, PDF, disponibilité, audits et notifications.
5. Ouverture SAV sur le même client/véhicule livré : réception, diagnostic, devis, intervention, pièce, facture, paiement, restitution.
6. Garantie et kilométrage uniquement par les workflows réellement présents.
7. Concurrence sur des ressources REC15 dédiées, sans compromettre les deux cycles principaux.
8. Contrôles RBAC, multi-agences, navigateur, MySQL et non-régression.

## Matrice prévisionnelle

| ID | Parcours | Acteurs / périmètre | Préconditions et ressources | Étapes et contrôles | Risque / irréversibilité | Statut initial |
|---|---|---|---|---|---|---|
| REC15-VENTE-01 | Vente complète | Commercial, Comptable, Livraison ; agence choisie | Client, véhicule disponible, moyens de paiement | vente→confirmation→facture→paiement→livraison | véhicule vendu/livré, écritures financières | NON EXÉCUTÉ |
| REC15-FINANCE-01 | Cohérence financière | Comptable/Finance | vente et facture REC15 | HT/remise/TVA/TTC, paiements, solde, arrondis | écriture de trésorerie | NON EXÉCUTÉ |
| REC15-DOC-01 | Documents | rôles de lecture | vente/facture/paiement/livraison | PDF réel + inspection visuelle | archivage documentaire | NON EXÉCUTÉ |
| REC15-STOCK-01 | Stock véhicule | Commercial/Stock | livraison terminée | API/UI/MySQL, filtres, non-disponibilité | statut terminal du véhicule | NON EXÉCUTÉ |
| REC15-SAV-01 | SAV complet | SAV, Chef atelier, Technicien, Comptable | client/véhicule REC15 livré | dossier/OR→diagnostic→intervention→facture→paiement→restitution | restitution terminale | NON EXÉCUTÉ |
| REC15-PIECES-01 | Pièce sur OR | Magasinier/Responsable pièces | pièce stock 5, OR REC15 | réserver→consommer→mouvement→facturer | décrément stock | NON EXÉCUTÉ |
| REC15-PIECES-02 | Dernière unité concurrente | Responsable pièces | pièce REC15 dédiée stock 1 | deux demandes simultanées, un gagnant | consommation/transfert irréversible | NON EXÉCUTÉ |
| REC15-GARANTIE-01 | Garantie constructeur | SAV/Atelier | vente/livraison, contrat officiel | éligibilité→prise en charge→facture | dépend du contrat réel | NON EXÉCUTÉ |
| REC15-KM-01 | Kilométrage | Livraison/SAV/Atelier | véhicule REC15 | livraison→entrée atelier→restitution→fiche | kilométrage monotone | NON EXÉCUTÉ |
| REC15-NOTIF-VENTE | Notifications vente | producteurs et destinataires existants | cycle vente | persistance, Socket.IO, affichage, permission | aucune notification inventée | NON EXÉCUTÉ |
| REC15-NOTIF-SAV | Notifications SAV | SAV/Atelier | cycle SAV | événements, persistance, absence de fuite | aucune notification inventée | NON EXÉCUTÉ |
| REC15-NOTIF-PIECES | Notifications pièces | Pièces | stock REC15 | faible/rupture/réservation/consommation | contrat persistant à établir | NON EXÉCUTÉ |
| REC15-NOTIF-RECONNECT | Reconnexion | deux sessions autorisées | producteur persistant identifié | hors ligne→événement→reconnexion→lecture | ciblage nominatif | NON EXÉCUTÉ |
| REC15-RBAC-01 | RBAC transversal | rôles réellement présents | comptes de recette | navigation/API/actions/scopes | pas de GLOBAL ajouté | NON EXÉCUTÉ |
| REC15-AGENCES-01 | Multi-agences | agences existantes | ressources REC15 agence source | accès source/autre agence, lecture/mutation | scopes variables par ressource | NON EXÉCUTÉ |
| REC15-CONCESSIONS-01 | Multi-concessions | — | deuxième concession officielle requise | vérifier disponibilité du workflow | aucun contournement SQL | BLOQUÉ |
| REC15-AUDIT-01 | Audits | acteurs des cycles | cycles réalisés | auteur/action/ressource/date/scope/avant-après | données sensibles exclues | NON EXÉCUTÉ |
| REC15-CONCURRENCE-01 | Concurrence | acteurs métier | ressources REC15 dédiées | vente/paiement/pièce/OR/livraison | un seul effet et aucun négatif | NON EXÉCUTÉ |

Une ligne ne sera marquée `VALIDÉ` que si toutes ses étapes obligatoires ont été réellement exécutées. Les écritures passent exclusivement par les API officielles.
