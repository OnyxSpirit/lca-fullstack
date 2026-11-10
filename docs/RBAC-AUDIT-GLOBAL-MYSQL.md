# Audit global RBAC — MySQL et modèle de données

## Migrations examinées

- **114** crée `user_agencies` et `user_agency_roles`, avec unicité utilisateur/agence, une seule agence principale active, FK restrictives et reprise des rôles non système depuis l’agence historique.
- **115** ajoute `refresh_tokens.active_agency_id`, `agency_context_version`, index et FK, puis initialise les sessions actives depuis l’agence principale.
- **116** ajoute `leads.agency_id`, index et FK, puis reprend l’agence depuis l’affectataire ou le créateur.
- Aucune migration postérieure à 116 n’est présente au moment de l’audit.

## Évaluation

| Objet | État | Réserve/action future |
|---|---|---|
| `user_agencies` | Bon socle additif | Vérifier les utilisateurs sans agence et les primaires incohérentes sur copie isolée |
| `user_agency_roles` | Rôles multiples locaux supportés | Les rôles système restent correctement centraux ; retirer les dépendances runtime à `user_roles` non système |
| Sessions | Agence et version persistées serveur | `active_agency_id` nullable par nécessité de transition ; définir le comportement des comptes sans agence |
| Leads | Provenance persistée et indexée | Colonne nullable ; la reprise peut laisser NULL si affectataire et créateur n’ont pas d’agence historique |
| Ressources métier | Hétérogène | Plusieurs tables ont `agency_id`; d’autres dérivent agence via vente, OR, facture, compte ou concession |

## Besoins SQL probables pour le lot final

Ils sont à confirmer par diagnostic sur une copie MySQL 8.4 isolée ; aucune migration n’a été créée pendant cet audit.

1. Rendre `leads.agency_id` non nullable après traitement explicite des lignes sans provenance.
2. Ajouter une provenance d’agence aux ressources qui ne peuvent pas être dérivées sans ambiguïté, notamment certains objets RH, GED, référentiels ou historiques.
3. Ajouter les index composites agence+propriétaire+statut nécessaires aux nouveaux prédicats OWN/AGENCY.
4. Formaliser les snapshots d’agence pour les objets financiers et RH dont le parent peut changer.
5. Ajouter des contraintes/idempotences inter-agences pour transferts véhicules/pièces et mouvements financiers une fois les règles source/destination validées.
6. Prévoir une migration de contrôle supprimant ou désactivant les rôles locaux hérités de `user_roles` seulement après migration de tous les consommateurs.

## Typologie d’origine d’agence

- **Persistée directement** : clients, leads, showroom, ventes, devis, proformas, véhicules, livraisons, factures et nombreuses ressources opérationnelles.
- **Dérivée du parent** : items, paiements via facture/vente, documents via entité source, garanties via véhicule/vente, services via livraison, pièces réservées via OR/stock.
- **Concession ou compte** : référentiels, trésorerie, checklists, tarifs, certains objets RH.
- **Ambiguë/absente** : catalogues communs, marques/cachets, certains historiques et objets personnels ; décision ou migration requise.

## Risques de reprise

- Les migrations 114–116 sont additives et compatibles avec l’ancien runtime, mais ce double modèle permet des divergences entre `users.agency_id`/`user_roles` et les affectations locales.
- La reprise 116 dépend de données historiques pouvant être absentes ou incorrectes ; un `COUNT(*) WHERE agency_id IS NULL` est obligatoire avant contrainte.
- Les FK empêchent certaines suppressions mais ne garantissent pas que les agences source/destination sont autorisées par la même opération.

## Recette MySQL requise

Sur MySQL 8.4 temporaire uniquement : appliquer baseline+migrations, injecter deux agences et plusieurs rôles locaux, vérifier changement de contexte, retrait concurrent de rôle, isolation A/B, OWN/AGENCY, transferts refusés, paiements et annulations atomiques, puis détruire le conteneur/volume temporaire. Aucune base métier existante ne doit être utilisée.
