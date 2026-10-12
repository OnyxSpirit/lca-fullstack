# STABILISATION-ERP-20 — Consolidation des campagnes ERP-01 à ERP-19

Date de consolidation : 12 octobre 2026  
Périmètre : code et rapports présents dans le dépôt, environnement historique `lca` et environnement de recette `lca-recette` inspectés sans mutation.

## Méthode et portée des preuves

La décision capitalise sur les rapports ERP-01 à ERP-19. Un résultat ancien n'est considéré ouvert que lorsqu'aucune campagne ultérieure ne le clôt. ERP-20 n'a pas rejoué les campagnes complètes : les contrôles complémentaires ont été limités aux trois assertions historiques, au RBAC dynamique, au workflow Pièces ERP-19, à la reprise GED, au build frontend et à l'état runtime en lecture seule.

Les statuts signifient : **livrable** = pas de défaut bloquant connu dans le périmètre éprouvé ; **livrable sous réserve** = limite de couverture ou mesure opérationnelle explicite ; **décision métier** = comportement volontaire restant à arbitrer.

## Matrice consolidée des modules

| Module | Campagnes principales | Fonctions et preuves consolidées | Corrections clôturées | Ouvert / limite | Confiance | Statut |
|---|---|---|---|---|---|---|
| CRM et prospection | 03, 12, 14, 15, 18 | listes, filtres, ownership/scopes, parcours prospect | filtre « Toute l'équipe » et persistance des notifications | conversion générique prospect→client à confirmer comme règle produit | Élevée sur l'existant | Livrable sous réserve produit |
| Fiches clients 360 | 03, 14, 15 | fiche, rattachements véhicules/ventes/SAV/documents, isolation agence | agrégations et accès associés | parcours navigateur multi-concession non exécuté | Élevée en mono-concession | Livrable sous réserve |
| Stock VN/VO | 04, 14, 15, 18 | VIN, statuts, emplacements, filtres, détail véhicule, concurrence | VIN strict 17 caractères, emplacements physiques, filtres VN/VO, véhicules vendus | preuve réelle inter-concessions absente | Élevée | Livrable sous réserve |
| Vente automobile | 05, 14, 15, 16, 18 | devis/commande/vente, annulation, transitions, paiements, concurrence | vente annulée terminale, contrôles de transition et concurrence | confirmation native d'annulation perfectible en UX | Élevée | Livrable |
| Livraison | 06, 14–17 | préparation, autorisation financière, checklist, remise, idempotence, PDF/GED | contrôles financiers et création documentaire idempotente | fenêtre de panne processus GED, voir registre des risques | Élevée | Livrable sous réserve |
| Facturation et encaissements | 05, 07, 13–17 | facture, émission, encaissement, avoir/remboursement, total positif, autorisation | conditions de facturation et enchaînements financiers | pas de rejeu exhaustif ERP-20 des parcours réels | Élevée | Livrable |
| SAV et ordres de réparation | 08, 09, 14–18, 20 | réception, diagnostic, approbation, affectation, contrôle, prêt, facture, restitution, clôture/annulation | kilométrage, transitions et messages ; trois assertions obsolètes réalignées | couverture navigateur exhaustive par profil non rejouée | Élevée | Livrable |
| Atelier | 08, 09, 14–18 | planification, temps, main-d'œuvre, garantie, documents, reporting | séparation temps opérationnel / tarification et garantie constructeur | panne processus GED non simulée sur conteneur | Élevée | Livrable sous réserve |
| Pièces et magasin | 10, 14–19, 20 | catalogue, stock, inventaire, transferts, commandes, réservations/consommations/libérations | doublon métier 500→409 ; ERP18-PARTS-01 clôturée par file autonome ERP-19 ; concurrence `[201,409]` | aucun défaut bloquant connu | Élevée | Livrable |
| Showroom et réception | 12, 14, 15, 18 | files, compteurs, colonnes, réception et accès | compteurs/colonnes et cohérence d'affichage | profondeur navigateur moindre que ventes/SAV | Moyenne à élevée | Livrable |
| RH et administration | 11, 13, 14 | dossiers, congés, rémunérations, budgets, administration | contrôles et droits associés | multi-concession réel non démontré | Moyenne à élevée | Livrable sous réserve |
| Notifications | 12, 14, 16 | persistance, lecture, temps réel Socket.IO, permissions | cohérence intermodules et persistance | matrice navigateur complète par profil non rejouée | Élevée | Livrable |
| Paramètres | 02, 11–14 | référentiels, ressources, ateliers, documents, gouvernance | protections et permissions dynamiques | changements de paramétrage en production à encadrer | Élevée | Livrable |
| GED | 04, 06, 14–18, 20 | création, lecture protégée, rattachement, hash, conservation, rejeu/idempotence, nettoyage après erreur contrôlée | accès depuis véhicule, insert/rendu échoués sans résidu dans le test isolé | crash brutal entre écriture fichier et commit SQL non démontré ; réconciliation automatique non prouvée | Élevée hors crash brutal | Livrable sous réserve |
| Tableaux de bord / reporting | 03, 12–15 | agrégats commerciaux, atelier et financiers, filtres d'origine | reporting atelier par origine et incohérences ciblées | couverture fonctionnelle moins profonde que les transactions | Moyenne | Livrable sous réserve |
| Utilisateurs et RBAC | 02, 11–19, 20 | permissions effectives, scopes OWN/AGENCY/CONCESSION/GLOBAL, navigation, ressources, profils métier | droits Atelier/Pièces ERP-19 sans `service.order.update` ni rôle codé en dur | adversarial réel entre deux concessions absent | Élevée en mono-concession et multi-agences | Livrable sous réserve |

## Historique des anomalies significatives demandé par ERP-20

| Anomalie | Statut réel | Preuve de clôture |
|---|---|---|
| CRM — filtre « Toute l'équipe » | CORRIGÉE ET VALIDÉE | campagnes CRM/transversales, consolidation ERP-18 |
| VIN — longueur maximale | CORRIGÉE ET VALIDÉE | validation stricte à 17 caractères, ERP-18 |
| Emplacements physiques véhicules | CORRIGÉE ET VALIDÉE | stock et paramètres, ERP-18 |
| Filtres VN/VO et véhicules vendus | CORRIGÉE ET VALIDÉE | stock/showroom, ERP-18 |
| Ventes annulées | CORRIGÉE ET VALIDÉE | statut terminal et contrôles de transition |
| Conditions de facturation | CORRIGÉE ET VALIDÉE | validations ventes/finance/SAV |
| Showroom | CORRIGÉE ET VALIDÉE | compteurs, colonnes et filtres consolidés ERP-18 |
| GED véhicules | CORRIGÉE ET VALIDÉE | accès et rattachement depuis la fiche véhicule |
| RBAC Atelier/Pièces — ERP18-PARTS-01 | CORRIGÉE ET VALIDÉE | ERP-19 : API 20/20, frontend 14/14, navigateur réel |
| Réservations Pièces | CORRIGÉE ET VALIDÉE | file autonome et permissions dédiées ERP-19 |
| Concurrence Pièces | CORRIGÉE ET VALIDÉE | résultat contrôlé `[201,409]` ERP-19 |
| Idempotence documentaire | CORRIGÉE ET VALIDÉE | ERP-16/17 et contrôle isolé ERP-20 |
| Génération PDF | CORRIGÉE ET VALIDÉE | ERP-16/17, génération et archivage validés |

**Comptage du registre demandé : 13 anomalies significatives, 13 clôturées, 0 ouverte.** Les réserves nouvelles ou transversales ne sont pas maquillées en anomalies historiques : elles figurent dans le registre ERP-20 des risques.

## Analyse des trois assertions historiques

Les trois échecs étaient des assertions statiques désynchronisées, et non trois défauts runtime :

1. Le message attendu pour une étape future imposait l'ancien texte « après finalisation du diagnostic et du chiffrage ». Le code applique désormais la règle documentée : action disponible pendant le diagnostic, avant décision client.
2. Le test d'annulation ne reconnaissait pas `ANNULE` dans l'ensemble des états terminaux. Le code masque bien l'annulation pour `PRET`, `FACTURE`, `LIVRE`, `CLOTURE` et `ANNULE`.
3. Le lot élargi recherchait l'ancien libellé combinant temps et tarif et, côté Pièces, l'ancienne permission générique `parts.stock.adjust`. Le modèle actuel sépare la saisie opérationnelle de la tarification et utilise les permissions `parts.reservation.view/create/consume/release`.

Les assertions ont été réalignées uniquement après lecture des règles réellement exécutées. Le lot concerné passe **33/33** ; aucune condition d'autorisation n'a été supprimée.

## Tests complémentaires ERP-20

| Contrôle | Résultat |
|---|---|
| Frontend SAV, RBAC, Pièces et workflow ERP-19 | 33/33 réussis |
| Backend RBAC dynamique, rôles runtime, Pièces et workflow ERP-19 | 4 fichiers sur 4 réussis |
| GED : rendu en erreur, insertion en erreur, reprise, rejeu sans doublon | réussi avec `--experimental-test-module-mocks` |
| TypeScript frontend (`npm run lint`) | réussi |
| Build Vite de production | réussi, 2 488 modules transformés |
| HTTP historique `:3001/api/health` | `status=ok` |
| HTTP recette `:3004/api/health`, frontend `:4176` | `status=ok`, HTTP 200 |

Le premier lancement GED sans le drapeau Node requis a échoué au chargement de `mock.module`; le même fichier, lancé avec son option d'exécution correcte, réussit. Ce n'est pas une régression applicative.

## Limites explicites

- Une seule concession est présente en recette : l'isolation inter-agences est prouvée, l'isolation réelle entre deux concessions ne l'est pas.
- Le crash brutal du processus entre stockage physique GED et insertion SQL n'a pas été provoqué sur un conteneur protégé.
- ERP-20 n'a pas rejoué tous les parcours navigateur ni toutes les campagnes financières ; il s'appuie sur leurs preuves historiques et des tests ciblés.
- Les tests réalignés et les présents rapports ne sont pas déployés dans Docker ; aucune validation runtime ne leur est attribuée.
