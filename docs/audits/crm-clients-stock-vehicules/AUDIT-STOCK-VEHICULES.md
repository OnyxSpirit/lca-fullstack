# Audit Stock véhicules VN/VO

## Couverture

| Capacité | Statut | Constat |
|---|---|---|
| Liste cartes/tableau et pagination | CONFORME | Vues cohérentes, pagination serveur, états vide/erreur. |
| Recherche VIN/stock/immat/marque/modèle | CONFORME | Recherche backend normalisée. |
| Filtres statut, VN/VO, marque, modèle, énergie | CONFORME | Options synchronisées avec le backend. |
| Filtre agence | CONFORME sous contexte | L’agence active est implicite; une vue consolidée dépend de la portée. |
| Filtre emplacement / non affecté | CONFORME | Parc, showroom, garage et emplacement précis. |
| Filtre prix | ABSENTE | Aucun min/max prix dans l’UI ou le contrat de liste. |
| Tri utilisateur | ABSENTE | Ordre backend stable mais aucun sélecteur de tri. |
| Création / modification | CONFORME | Formulaires VN/VO, validations et données techniques. |
| VIN | CONFORME avec règle contextuelle | 17 caractères pour le stock commercial; VIN nullable toléré pour véhicule atelier externe. |
| Statuts et historique | CONFORME | Transitions manuelles contrôlées, motif obligatoire, historique écrit. |
| Emplacements | CONFORME | Emplacement actif de type automobile exigé pour `available`. |
| Photos | CONFORME | Maximum 8, principale, ajout/suppression/réordonnancement; mutations verrouillées. |
| Données financières | CONFORME | Prix d’achat/minimum masqués sans permission; historique de prix. |
| Verrouillage vendu/livré | CONFORME | Mutations de stock interdites; cohérence avec ventes testée. |
| Transfert intra-agence | CONFORME | Changement d’emplacement et mouvement archivé. |
| Transfert inter-agences | DÉFECTUEUSE / non implémentée | Le contrôleur rejette toute agence destination différente de l’agence active. |

## Point critique transfert

Le nom de route et l’UI suggèrent un transfert d’agence, mais `assertTransferTarget` exige que `toAgencyId` soit l’agence active et la transaction exige aussi que le véhicule appartienne à cette même agence. Le résultat est un mouvement d’emplacement intra-agence. Cette fermeture est sécurisante, mais fonctionnellement trompeuse.

## Intégrations

La vente réserve puis verrouille le véhicule; les listes actives excluent correctement les vendus/livrés, accessibles dans les vues dédiées. Les essais routiers vérifient le véhicule et son agence. Les véhicules client et atelier s’appuient sur des associations explicites.
