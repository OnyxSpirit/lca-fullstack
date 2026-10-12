# LIVRAISON-LCA-03 Phase C — Traçabilité des comptes historiques

Date : 12 octobre 2026  
Périmètre : investigation locale en lecture seule

## 1. Origine établie

Les six références A1 à A6 proviennent d'un fichier de démonstration placé sous `frontend/src/services/`. Sa structure associait six libellés métier à six identifiants applicatifs et à un mot de passe commun. Le fichier n'était référencé par aucun code applicatif selon ERP-21 et les recherches actuelles.

| Événement | Date documentée | Preuve | Conclusion |
|---|---|---|---|
| création du projet historique `lca-fullstack-lca-redesign` | 1er septembre 2026, 06:59 UTC | métadonnées Docker du MySQL et volume nommé | installation antérieure au commit, contenu non contrôlé |
| ajout du fichier au dépôt | 1er septembre 2026, 22:18:56 +01:00 | métadonnée Git du premier commit `454de3b` | exposition Git certaine à partir de ce commit |
| création du projet historique `lca-fullstack` | 4 septembre 2026, 07:30 UTC | métadonnées Docker du MySQL et volume nommé | installation postérieure à l'exposition, contenu non contrôlé |
| retrait du fichier de l'arbre suivi | 12 octobre 2026, 06:05:11 +01:00 | commit `63fa2f9`, rapports ERP-21 | retrait courant prouvé, historique non purgé |
| contrôle Phase B des cinq bases actives | 12 octobre 2026 | requêtes anonymisées sur 33 utilisateurs | aucune des six références, aucune session associée |

La présence du fichier dans le dépôt ne démontre pas que les comptes ont été provisionnés dans une base. Inversement, l'absence de référence applicative ne démontre pas qu'un opérateur ne les a jamais créés manuellement ou via un ancien seed.

## 2. Environnements actifs confirmés

| Projet | Nature | État | Utilisateurs | A1–A6 | Conclusion locale |
|---|---|---|---:|---:|---|
| `lca` | historique/principal | 3 services actifs et sains | 2 | 0 | identifiants inutilisables dans la base courante |
| `lca-recette` | recette ERP-02 à ERP-20 | 3 services actifs et sains | 24 | 0 | identifiants inutilisables dans la base courante |
| `lca-qualification` | installation fraîche RC2 | 3 services actifs et sains | 2 | 0 | identifiants inutilisables dans la base courante |
| `lca-requalification` | source de sauvegarde ERP-22 | 3 services actifs et sains | 2 | 0 | identifiants inutilisables dans la base courante |
| `lca-restauration` | restauration isolée ERP-22 | 3 services actifs et sains | 3 | 0 | identifiants inutilisables dans la base courante |

Ces résultats sont techniques et datés. Ils ne constituent pas une attestation d'exhaustivité des installations LCA/BEROX.

## 3. Installations historiques ou supplémentaires identifiées

| Ressource | Type | État actuel | Persistance | Contrôle A1–A6 | Qualification |
|---|---|---|---|---|---|
| `lca-fullstack-lca-redesign-mysql-1` | MySQL 8.4 historique | arrêté | volume `lca-fullstack-lca-redesign_mysql_data` présent | non effectué | environnement historique documenté, base récupérable |
| `lca-fullstack-mysql-1` | MySQL 8.4 historique | arrêté | volume `lca-fullstack_mysql_data` présent | non effectué | environnement historique documenté, base récupérable |
| quatre conteneurs MySQL techniques `lca-rh-*` | tests RH/budget | arrêtés | quatre volumes Docker anonymes présents | non effectué | environnements techniques locaux non intégrés à Phase B |
| `lca-recette-prod01-*` | recette temporaire | supprimée selon rapport | MySQL en `tmpfs`, aucune persistance annoncée | non applicable | abandon documenté |
| `lca-stabilisation-finale` | pile temporaire | arrêtée et supprimée selon rapport | aucun volume persistant déclaré | non applicable | abandon documenté |
| `lca-rbac-validation` | procédure de validation fraîche | aucun conteneur actuel correspondant | procédure prévoit `down` | non déterminé | exécution historique non prouvée, aucune ressource nommée observée |

Les deux volumes historiques nommés sont rattachés à deux répertoires Compose locaux distincts. Ils n'ont été ni démarrés ni montés pendant cette mission. Les quatre volumes techniques anonymes n'ont pas été supprimés ou ouverts.

## 4. Bases archivées disponibles

| Archive SQL | Origine documentée | Recherche A1–A6 |
|---|---|---|
| `backups/erp17-pre-update-20261011/mysql.sql` | `lca-recette` avant mise à jour ERP-17 | aucune correspondance |
| `backups/erp19-pre-update-20261011/mysql.sql` | sauvegarde préalable ERP-19 | aucune correspondance |
| `/tmp/erp22-phase2-backup/mysql.sql` | source fictive `lca-requalification` | aucune correspondance |

La recherche a comparé les identifiants en mémoire et n'en a affiché aucun. Ces trois résultats ne couvrent ni les volumes historiques arrêtés, ni une archive ancienne disparue, ni une sauvegarde externe.

## 5. Usage en recette et lien à une installation

- les campagnes ERP-02 à ERP-20 ont utilisé des comptes de recette créés séparément dans `lca-recette` ; les six références historiques n'y sont plus présentes ;
- aucun rapport ne prouve une connexion réussie de A1 à A6 ;
- le fichier était une liste de démonstration hors code, pas une configuration `.env`, un seed SQL ou une source d'authentification ;
- les deux installations historiques ont une chronologie compatible avec une éventuelle création de ces comptes, mais aucun élément non sensible disponible ne permet de confirmer ou d'infirmer leur présence dans leurs volumes ;
- aucune installation externe LCA/BEROX n'est inventoriée ou attestée.

## 6. Matrice d'exhaustivité

| Classe | État de preuve |
|---|---|
| environnements actifs locaux | exhaustifs pour le moteur Docker observé au 12 octobre 2026 ; A1–A6 absents |
| conteneurs locaux arrêtés | inventoriés ; six MySQL supplémentaires, contenu non contrôlé |
| volumes Docker locaux | inventoriés nominativement ; deux historiques nommés et quatre techniques anonymes restent à qualifier |
| dumps locaux connus | trois contrôlés, tous négatifs |
| anciennes archives supprimées ou indisponibles | non vérifiables |
| postes, VPS, serveurs et sauvegardes externes | inventaire absent |
| clones Git | détenteurs inconnus ; anciens identifiants récupérables dans l'historique |

## 7. Preuves encore nécessaires

1. Attestation du responsable des environnements confirmant la liste exhaustive des installations, serveurs, postes, volumes et sauvegardes.
2. Autorisation de contrôler en lecture seule les deux bases historiques nommées et les quatre bases techniques, ou attestation de destruction/non-usage.
3. Pour toute correspondance : environnement, état, sessions, rôle et décision de révocation/rotation, sans secret dans la preuve.
4. Confirmation qu'aucune copie externe ou ancienne installation exploitable n'existe ; sinon inventaire et contrôle ciblé.
5. Identification des détenteurs de clones Git et maintien de l'interdiction de transmettre l'historique.

