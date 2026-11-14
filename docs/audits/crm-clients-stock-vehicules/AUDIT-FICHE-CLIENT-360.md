# Audit de la fiche Client 360°

## Sections réellement présentes

La fiche expose les coordonnées et indicateurs, puis des onglets conditionnés par permissions : timeline, contacts, opportunités, véhicules rattachés, ventes & devis, atelier/SAV, facturation et GED. Les collections volumineuses sont paginées côté serveur et les pages sont resynchronisées après variation des totaux.

| Capacité | Statut | Constat |
|---|---|---|
| Liste et recherche clients | CONFORME | Recherche serveur, pagination et états vide/erreur. |
| Création client | CONFORME | Particulier/professionnel, identité normalisée, doublons par agence. |
| Lecture 360° | CONFORME | Agrégation API réelle, pas de jeu statique frontend. |
| Coordonnées / identité | CONFORME | Code, type, identité, entreprise, téléphone, email et adresse. |
| Contacts liés | PARTIELLE | Ajout disponible; API de modification/suppression existe, mais l’UI 360 privilégie l’ajout. |
| Origine prospect / CRM | CONFORME | Opportunités et événements CRM dans les sections autorisées. |
| Rendez-vous / essais | CONFORME | Restitués dans la timeline selon portée showroom/CRM. |
| Véhicules, ventes, livraisons | CONFORME | Véhicules associés, commandes et état financier. |
| Atelier / SAV | CONFORME | Ordres de réparation visibles selon `service.order.view`. |
| Factures / règlements | CONFORME | Factures et paiements agrégés selon permissions distinctes. |
| GED | CONFORME | Documents chargés via le service GED et téléchargement réel. |
| Historique | CONFORME | Timeline protégée par `customers.history.view`. |
| Édition du client depuis la fiche | ABSENTE | `customers.update` est calculée mais aucune action d’édition générale n’est rendue dans l’en-tête. |
| Historique des contacts supprimés | ABSENTE | L’API exécute un `DELETE` physique. |

## Sécurité

Chaque sous-ensemble applique sa propre permission; l’accès à un client hors périmètre renvoie une absence logique. Les montants et données relationnelles ne sont pas injectés dans une section non autorisée. La fiche ne doit pas être considérée comme un contournement des modules sources.
