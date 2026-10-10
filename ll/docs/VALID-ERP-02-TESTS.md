# VALID-ERP-02 — Tests et recette

## Tests ciblés

- Build et lint backend : réussis.
- Build et lint frontend : réussis.
- Rendez-vous, contrats CRM, pagination et fiabilité : réussis isolément.
- Test MySQL réel `valid-erp-02-appointment-mysql.integration.test.ts` : 1/1 ; une création acceptée, une rejetée lors de deux requêtes concurrentes identiques, puis créneau adjacent accepté.
- Test de contrats `valid-erp-02-crm-contracts.test.ts` : 3/3 ; auteur/responsable, conversion entreprise et réserve essais.
- `crm-appointment.behavior.test.ts` : 1/1 après remplacement du mock de liste par le contrat paginé et assertion de `durationMinutes = 30`.
- `settings-concession-dynamic.test.ts` : 9/9 après alignement de la liste d'onglets et contrôle du réglage CRM.

## Suites globales

### Backend

Commande : `npm test` dans `backend-node`.

Résultat : **213 tests, 172 réussis, 41 échoués, 0 ignoré, 155087 ms**. La référence était 211/170/41 : les deux nouveaux tests du présent lot réussissent ; le nombre d'échecs reste 41. Les échecs sont des fichiers historiques lancés simultanément (ressources, serveurs/ports et isolation des fixtures) et ne constituent pas de nouveaux échecs CRM démontrés. Les tests VALID-ERP-02 et les tests CRM ciblés passent dans cette même exécution.

### Frontend

La commande projet `npm test` a d'abord été empêchée par le bac à sable : `tsx` ne pouvait pas écouter sur `/tmp/tsx-1000/19.pipe` (`EPERM`), donc aucun test n'avait été exécuté. Relance équivalente sans IPC : `node --import tsx --test test/**/*.test.ts`.

Résultat : **151 tests, 125 réussis, 26 échoués, 0 ignoré, 90156 ms**. Référence CORR-ERP-02C : 122/29/151. Les deux échecs directement associés au nouveau contrat CRM sont corrigés ; le gain global de trois tests ne doit pas être surinterprété car l'exécution concurrente reste sensible aux ressources. Les 26 échecs résiduels concernent plusieurs modules historiques et des tests UI lourds ; aucune correction hors périmètre n'a été faite.

## Deux tests frontend stabilisés

1. `test/crm-appointment.behavior.test.ts` : le mock renvoyait l'ancien tableau alors que l'API renvoie désormais une page `{items, page, pageSize, total, totalPages, stageSummary}`. Classification : assertion/fixture obsolète. La couverture a été renforcée avec la durée 30.
2. `test/settings-concession-dynamic.test.ts` : une regex imposait l'ancien ordre d'onglets et ignorait le réglage CRM. Classification : assertion obsolète. Le test vérifie désormais l'ordre réel et le contrat de durée.

Aucun test n'a été supprimé, ignoré ou affaibli.

## Recette navigateur

Le bundle courant a été construit pour une instance isolée sur 4175, reliée au backend temporaire 33301 et à MySQL jetable. Authentification, Kanban, compteur/pagination, créations particulier et entreprise avec e-mail seul et affichage du réglage 30 ont été réellement observés.

Limites : le pilote disponible ne permettait pas de forcer les quatre largeurs demandées. Les parcours nécessitant des routes absentes (modification/réaffectation de rendez-vous ou d'essai) ne peuvent pas être inventés. L'interface ne propose pas la dérogation de conflit. Ces points sont donc non exécutés, pas annoncés comme réussis.
