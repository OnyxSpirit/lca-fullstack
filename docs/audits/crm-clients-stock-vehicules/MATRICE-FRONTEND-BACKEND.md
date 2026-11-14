# Matrice Frontend ↔ Backend

| Parcours UI / hook | API | Persistance principale | Verdict |
|---|---|---|---|
| Prospects | `GET/POST /leads` | `leads`, `opportunities` | Aligné |
| Doublons prospect | `GET /leads/duplicates` | identités normalisées | Aligné |
| Activités | routes activités lead | `lead_activities` | Aligné |
| Rendez-vous | routes appointments lead | rendez-vous CRM | Aligné |
| Essais CRM | `/showroom/crm/leads/:id/test-drives` | `showroom_visits`, `showroom_test_drives` | Aligné |
| Showroom | `/showroom`, actions de visite | visites, essais | Aligné |
| Clients | `GET/POST/PATCH /customers` | `customers` | Backend complet; édition générale non exposée sur la fiche |
| Client 360 | `GET /customers/:id/360` | agrégation multi-tables | Aligné et paginé |
| Contacts | routes `/contacts` | `customer_contacts` | Backend CRUD; UI surtout création |
| GED client | service documents | documents GED | Aligné |
| Stock | `GET /vehicles` | `vehicles` | Aligné; contrat sans prix/tri paramétrable |
| Fiche véhicule | `/vehicles/:id`, `/360` | véhicule, mouvements, statuts, images | Aligné |
| Statut véhicule | `PATCH /vehicles/:id/status` | historique statuts | Aligné |
| Photos | routes `/images` | métadonnées + stockage fichier | Aligné |
| Transfert | `POST /vehicles/:id/transfer` | `vehicle_movements` | Libellé inter-agences non réalisé; intra-agence seulement |
| Vente | routes sales | ventes + véhicule | Aligné; invalidations stock/client/CRM |

Les caches React Query sont invalidés transversalement après les mutations structurantes. Aucun écran audité ne dépend d’un faux jeu de données local pour son contenu métier.
