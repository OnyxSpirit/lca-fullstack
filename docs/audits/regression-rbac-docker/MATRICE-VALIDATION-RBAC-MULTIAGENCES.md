# Matrice de validation RBAC multi-agences

| Acteur / scope | Agence | Prospects | Clients | Véhicules | Devis | Ventes / autres | Résultat |
|---|---|---:|---:|---:|---:|---:|---|
| vrai `SUPER_ADMIN`, droits persistés `GLOBAL` | C | 200, données C | 200, données C | 200, données C | 200, données C | permissions conservées | PASS |
| même session après bascule | D | 200, données D | 200, données D | 200, données D | 200, données D | contexte recalculé | PASS |
| Super Admin après relecture transactionnelle | D | scope effectif `AGENCY` | idem | idem | idem | aucun faux conflit | PASS |
| rôle local `AGENCY` | agence affectée | équipe autorisée | agence autorisée | agence autorisée | agence autorisée | selon permissions | PASS (tests dynamiques) |
| rôle local `OWN` | agence affectée | propriétaire | propriétaire | selon permission | propriétaire commercial | ventes propres | PASS (tests dynamiques) |
| rôle différent dans une autre agence | agence basculée | permissions recalculées | permissions recalculées | permissions recalculées | permissions recalculées | aucune union inter-agences | PASS |
| faux rôle dont le code ressemble à Super Admin | agence non affectée | refus | refus | refus | refus | aucun privilège central | PASS |
| permission absente | toute agence | 403 | 403 | 403 | 403 | 403 | PASS |

## Profils métier couverts par les suites existantes

| Profil | Règle vérifiée |
|---|---|
| Responsable commercial | portée `AGENCY`, accès de l'équipe dans l'agence seulement |
| Commercial | portée `OWN`, devis et ventes du propriétaire seulement |
| Réceptionniste | permissions CRM/clients/showroom explicites, pas de rôle codé dans le runtime |
| Responsable stock | permissions véhicules explicites, isolation d'agence |
| Comptable | permissions facturation/paiements explicites, sans héritage SAV |

Les noms de profils servent aux fixtures ; le runtime décide exclusivement à partir des permissions dynamiques et de leurs scopes.

## Données MySQL de preuve

Deux agences fictives C et D contiennent chacune un prospect avec opportunité, un client, un véhicule et un devis. Après chaque `PUT /api/rbac/agency-context`, les quatre `GET` contiennent les identifiants de l'agence active et excluent explicitement ceux de l'autre agence.
