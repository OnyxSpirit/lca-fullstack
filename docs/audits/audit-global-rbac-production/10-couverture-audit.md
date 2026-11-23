# Synthèse de couverture

## Axes transversaux

| Axe | Statique | Tests existants | Données locales | Production | Statut |
|---|---:|---:|---:|---:|---|
| JWT / sessions | oui | oui | partiel | non | audité |
| RBAC `OWN/AGENCY` | oui | oui | oui | non | audité |
| anciens scopes | oui | oui | oui | non | audité |
| multi-agences | oui | oui | partiel | non | audité |
| ressources centrales | oui | partiel | partiel | non | audité, défaut confirmé |
| cachets/signatures | oui | oui, contrat UI absent | aucune donnée cachet | non | audité, défaut confirmé |
| identité/logo | oui | partiel | schéma seulement | non | audité, défaut confirmé |
| sécurité/IDOR | oui ciblé | oui ciblé | partiel | non | partiellement audité |
| migrations | oui | oui | jusqu'à 132 | non | audité localement |
| configuration Docker | oui local | santé locale | oui | non | partiellement audité |

## Modules

| Module | Routes/API | RBAC | Données/workflow | Tests auto | Qualification |
|---|---:|---:|---:|---:|---|
| Auth / 2FA | oui | oui | partiel | oui | audité |
| Utilisateurs / habilitations | oui | oui | oui statique | oui | audité |
| CRM | oui | oui | statique | oui | audité statiquement |
| Showroom | oui | oui | statique | oui | audité statiquement |
| Clients | oui | oui | statique | oui | audité statiquement |
| Véhicules | oui | oui | statique | oui | audité statiquement |
| Ventes / devis / proformas | oui | oui | statique | oui | audité statiquement |
| Livraisons / retours | oui | oui | statique | oui | audité; réserve cachets |
| Facturation / encaissements | oui | oui | statique | oui | audité statiquement |
| Trésorerie / budgets | oui | oui | statique | oui | audité statiquement |
| Comptabilité / fiscal | oui | oui | statique | oui | audité statiquement |
| SAV / atelier | oui | oui | statique | oui | audité statiquement |
| Pièces / magasin | oui | oui | statique | oui | audité statiquement |
| RH / rémunérations | oui | oui | statique | oui | audité statiquement |
| GED / documents | oui | oui | statique | oui | audité statiquement |
| Notifications | oui | oui | statique | oui | audité statiquement |
| Activité | oui | oui | statique | oui | audité statiquement |
| Reporting | oui | oui | statique | oui | audité statiquement |
| Paramètres concession | oui | oui | statique | partiel | audité en profondeur, non conforme |

## Non vérifiable dans cette mission

- version et configuration exactes de production;
- données historiques de production;
- effets réels sous les six profils dans un navigateur de recette;
- comportement des intégrations externes non configurées;
- résistance à un pentest intrusif.

La couverture est suffisante pour confirmer la non-conformité et établir les causes racines prioritaires. Elle n'est pas suffisante pour déclarer le déploiement globalement conforme, même après correction, sans qualification dynamique complémentaire.

## Qualification technique de la campagne

Les deux compilations TypeScript réussissent. La suite frontend réussit intégralement (1 081 tests). La suite backend a nécessité une seconde passe hors confinement pour les fichiers ouvrant des sockets locaux : 423 tests sur 424 y réussissent. Le seul échec résiduel est une attente de texte VIN obsolète, sans échec de la validation elle-même.
