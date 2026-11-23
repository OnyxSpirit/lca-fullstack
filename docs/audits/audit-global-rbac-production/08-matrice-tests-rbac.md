# Matrice de tests RBAC

Légende : **OBS** = observé par test existant ou lecture locale; **STAT** = démontré statiquement; **À EXÉCUTER** = scénario requis en recette isolée.

| Profil | Module / action | Permission / scope | Agence | Attendu | Observé | Verdict |
|---|---|---|---|---|---|---|
| A Super Admin | créer cachet depuis UI | `stamp.manage/AGENCY` | A | 201 | payload sans agence → 403 (STAT) | échec |
| A Super Admin | créer cachet API avec agence | idem | A | 201 | couvert par intégration existante | conforme API |
| A Super Admin | modifier identité/logo | `settings.general.manage/AGENCY` | A | 200 | helper central accepte (STAT) | conforme |
| B habilité ordinaire | modifier identité/logo | même permission | A | 200 | helper exige Super Admin → 403 | échec |
| B habilité ordinaire | gérer constructeur/documents/checklist | permissions dédiées | A | succès | même helper central → 403 | échec systémique |
| C non habilité | identité/logo | aucune | A | 403 / action masquée | frontend et backend refusent (STAT) | conforme |
| C non habilité | cachets | aucune | A | 403 / action masquée | contrôles présents (STAT) | conforme |
| D multi-agences | changer A→B | rôles distincts | B | recalcul | version session + recalcul couverts | conforme |
| D multi-agences | cachet agence A depuis B | `stamp.view/AGENCY` | B | 404/403 | filtre agence et tests IDOR | conforme |
| E scope OWN | lister/gérer cachets | `stamp.*/OWN` | A | refus | refus explicite + test | conforme |
| E scope OWN | ressource personnelle | permission `.self/OWN` | A | seulement soi | signature filtrée par `user_id` | conforme |
| F scope AGENCY | données agence | permission métier | A | agence A seulement | helpers/SQL et tests multi-agences | globalement conforme |
| F scope AGENCY | catégorie cachet UI | `stamp.manage/AGENCY` | A | 201 | `target(null)` → 403 | échec |
| B/F | cachet central historique | `stamp.view/AGENCY` | A | selon décision métier | exclu par filtre | décision requise |
| D | permission A utilisée en B | rôles par affectation | B | impossible | contexte recalculé et versionné | conforme |
| faux Super Admin | opération système | rôle ordinaire nommé similaire | A | refus | identité système issue de la base | conforme |

## Lacunes de couverture à combler

- aucun test de bout en bout ne sérialise le vrai formulaire cachet;
- pas de scénario positif d'un utilisateur ordinaire sur une ressource centrale;
- plusieurs tests vérifient les noms des helpers plutôt que le résultat métier;
- pas de matrice dynamique exhaustive des modules avec les six profils;
- pas de test sur des cachets centraux historiques;
- pas de qualification du build de production.

## Résultats d'exécution

| Contrôle | Résultat |
|---|---|
| `frontend npm run lint` | succès |
| `backend-node npm run lint` | succès |
| `frontend npm test` | 1 081 réussis, 0 échec |
| `backend-node npm test` confiné | 336 fichiers réussis, 22 empêchés/échoués |
| réexécution hors confinement des 22 fichiers | 423 tests réussis, 1 assertion VIN échouée |

La réexécution démontre que les échecs HTTP/PDF groupés de la première passe étaient liés au contexte d'exécution des sockets. Le seul échec reproductible hors confinement est AUD-TEST-002.
