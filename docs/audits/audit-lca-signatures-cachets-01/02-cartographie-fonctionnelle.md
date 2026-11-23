# Cartographie fonctionnelle

## Chemins UI

| Fonction | Composant | API |
|---|---|---|
| Signature personnelle | `DocumentMarksSettings`, `MySignaturePage`, `SignaturePad` | `GET/POST/DELETE /document-marks/signature/me` |
| Catégories | `DocumentMarksSettings` | `GET/POST/PATCH /document-marks/categories` |
| Cachets | `DocumentMarksSettings` | `/document-marks/stamps` et sous-routes version, statut, documents, agences |
| Politiques | section « Documents officiels · Politiques » | `GET /document-marks/policies`, `PUT /document-marks/policies/:documentType` |
| Autorisations par rôle | `RoleManagementPanel` | `GET/PUT /roles/:roleId/stamps` |

## Sens des deux mécanismes

La sélection « Documents concernés » crée des lignes dans `service_stamp_document_types`. Elle rend le cachet **éligible** pour ces types ; elle ne l’applique pas automatiquement et ne rend pas le cachet obligatoire.

Une ligne `document_mark_policies` décide si une signature ou un cachet est requis, choisit éventuellement un cachet par défaut, active `BLOCK` ou `ALLOW_WITHOUT_MARK`, et active/désactive cette automatisation.

Les deux mécanismes ne sont donc pas redondants. Le premier est un catalogue d’éligibilité plusieurs-à-plusieurs ; le second est une règle d’émission par agence et type documentaire.
