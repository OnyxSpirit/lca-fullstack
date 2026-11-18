# Matrice définitive des 141 surfaces

Les champs détaillés (module, sous-module, chemin UI, composant, hook, endpoint, mode, tailles, RBAC et tests) restent ceux des lignes individuelles de [`../finalisation-pagination-globale/02-matrice-cloture-141-surfaces.md`](../finalisation-pagination-globale/02-matrice-cloture-141-surfaces.md). Le présent document constitue l'overlay de clôture issu du code et des tests du 18 novembre 2026. Chaque identifiant apparaît exactement une fois ci-dessous.

## CORRIGÉ ET VALIDÉ — 59

Preuve commune : contrat paginé ou chargement progressif revérifié, tests historiques non régressés, frontend 1 060/1 060. PAG-080 est ajouté à ce groupe car ses mouvements utilisent déjà le contrat serveur paginé.

PAG-001, PAG-003, PAG-004, PAG-005, PAG-007, PAG-009, PAG-010, PAG-011, PAG-012, PAG-015, PAG-016, PAG-017, PAG-018, PAG-019, PAG-020, PAG-021, PAG-022, PAG-023, PAG-027, PAG-028, PAG-029, PAG-030, PAG-031, PAG-032, PAG-033, PAG-034, PAG-039, PAG-045, PAG-048, PAG-049, PAG-055, PAG-056, PAG-058, PAG-062, PAG-065, PAG-072, PAG-074, PAG-080, PAG-082, PAG-084, PAG-091, PAG-092, PAG-094, PAG-095, PAG-104, PAG-106, PAG-109, PAG-114, PAG-115, PAG-116, PAG-117, PAG-120, PAG-121, PAG-125, PAG-127, PAG-128, PAG-129, PAG-130, PAG-132.

## EXEMPTÉ AVEC JUSTIFICATION — 43

Les 35 exemptions historiques sont conservées. PAG-044, PAG-061, PAG-064, PAG-078, PAG-123, PAG-124, PAG-131 et PAG-135 sont requalifiées : décision liée à une livraison, budgets annuels, cycle d'approbation borné, lignes d'un document, comptes/catégories/mappings de configuration, ou affectations d'un utilisateur. Ces collections ne sont pas des journaux globaux et leur pagination locale ne fausse aucun agrégat.

PAG-002, PAG-006, PAG-008, PAG-026, PAG-035, PAG-036, PAG-037, PAG-038, PAG-041, PAG-042, PAG-043, PAG-044, PAG-061, PAG-064, PAG-070, PAG-073, PAG-076, PAG-078, PAG-083, PAG-087, PAG-088, PAG-090, PAG-093, PAG-096, PAG-097, PAG-098, PAG-099, PAG-100, PAG-103, PAG-105, PAG-107, PAG-119, PAG-123, PAG-124, PAG-131, PAG-133, PAG-134, PAG-135, PAG-136, PAG-137, PAG-139, PAG-140, PAG-141.

## ANOMALIE RÉSIDUELLE — 39

Ces surfaces conservent un tableau brut, un plafond fixe, une pagination purement locale sur une collection susceptible de croître, ou un sélecteur chargeant un catalogue complet. Elles ne sont pas requalifiées sans preuve volumétrique et E2E.

PAG-013, PAG-014, PAG-024, PAG-025, PAG-040, PAG-046, PAG-047, PAG-050, PAG-051, PAG-052, PAG-053, PAG-054, PAG-057, PAG-059, PAG-060, PAG-063, PAG-066, PAG-067, PAG-068, PAG-069, PAG-071, PAG-075, PAG-077, PAG-079, PAG-081, PAG-085, PAG-086, PAG-089, PAG-101, PAG-102, PAG-108, PAG-110, PAG-111, PAG-112, PAG-113, PAG-118, PAG-122, PAG-126, PAG-138.

## Contrôle de cardinalité

59 + 43 + 39 = **141**. Aucun statut `PARTIELLEMENT CORRIGÉ` n'est conservé : les surfaces non closes sont explicitement des anomalies résiduelles.
