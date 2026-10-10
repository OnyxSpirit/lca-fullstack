# CORR-ERP-02E — Tests

## Tests ciblés

- Backend contrats : 4 fichiers sur 4 passent, 3,746 s.
- Frontend Settings/CRM : 2 fichiers sur 2 passent, 7,461 s.
- MySQL 8.4.11 : 1 test d'intégration passe, 0,746 s.
- Build backend et frontend : passent.
- Lint TypeScript backend et frontend : passent.

Le test MySQL exécute simultanément deux réservations : même véhicule (1 acceptée/1 refusée), même commercial (1/1), ressources différentes (2 acceptées). Deux créneaux `[T,T+30[` et `[T+30,T+60[` du même couple sont acceptés.

## Couverture fonctionnelle

| Domaine | Preuve |
|---|---|
| Durée par défaut/individuelle/invalide | Settings, validation backend 1–1440, snapshot SQL |
| Futur/immédiat/passé | `drivePeriod`, statuts planned/in_progress, refus du passé |
| Véhicule/commercial/rendez-vous | helper verrouillé et test MySQL |
| Adjacence/chevauchement | test MySQL et contrat semi-ouvert |
| Modification/rollback | route transactionnelle réservée à planned |
| Annulation/historique | transition logique, aucun DELETE |
| Migration/réexécution | bootstrap jetable 071→079 puis relance idempotente |
| RBAC | middlewares et `driveScope` préexistants conservés |

## Campagnes globales

- Backend, `npm test`, hors sandbox pour Supertest : **1 736 sous-tests**, **1 575 réussis**, **85 échecs**, **76 ignorés**, 0 annulé, **137,384 s**.
- Frontend, `node --import tsx --test test/**/*.test.ts` : **151 fichiers/tests**, **130 réussis**, **21 échecs**, 0 ignoré, **40,516 s**.

CORR-ERP-02D avait produit 1 570/1 731 sous-tests backend, 86 échecs et 75 ignorés. 02E ajoute quatre contrats réussis et un test MySQL opt-in ignoré par défaut ; un contrat historique devenu obsolète a aussi été actualisé. Le frontend reste à 130/151 : aucune nouvelle régression globale observée. Les unités backend et frontend sont différentes et ne sont pas comparées entre elles.

## Navigateur

Le bundle du workspace a été construit. Aucune recette E2E authentifiée exhaustive n'est revendiquée : aucune instance backend isolée avec comptes et données de parcours n'était disponible, et le service persistant ne devait pas être modifié. Le service existant du port 3001 n'a pas été arrêté ni remplacé.
