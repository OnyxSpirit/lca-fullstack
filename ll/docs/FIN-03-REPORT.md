# FIN-03 — Rapport de recette

## A à D — État initial, architecture et Treasury

- Branche initiale et finale : `main`; HEAD initial et final : `fb99164`; arbre initial propre.
- Source de vérité : somme des seuls `treasury_movements` `POSTED` (`IN - OUT`). Aucun solde parallèle n'est persisté.
- Liquidités éligibles : comptes actifs `CASH` et `BANK`; `OTHER` exclu. Un transfert ne crée aucune liquidité nette.
- Politique compatible historique : les sorties non liées restent possibles; une insuffisance est signalée par la couverture au lieu de bloquer tous les flux existants.

## E à J — Budgets, engagements, décaissements, réservations et devises

- Budget approuvé : `budgets.status='active'`; enveloppe totale = montant initial + allocations complémentaires persistées.
- Engagement : somme des seules dépenses `approval_status='approved'`. Disponible budgétaire = enveloppe totale - engagements, sans seconde déduction des décaissements.
- Décaissement net : décaissements reliés à un mouvement Treasury, hors originaux contrepassés. Reste à payer = engagement - décaissement net.
- Réservation : table additive et historique d'événements. Elle ne produit aucun mouvement Treasury, ne dépasse ni le reste à payer ni le solde non affecté.
- Un décaissement explicitement lié consomme partiellement ou totalement la réservation. Un autre compte est refusé. Une contrepassation ne recrée pas automatiquement la réservation.
- Tous les agrégats sont groupés et affichés par devise; aucun taux de change n'est inventé.

## K à P — RBAC, concurrence, compatibilité, backend, frontend et migration

- Permissions distinctes : consultation couverture, consultation/création/libération/ajustement des réservations. Aucun nouveau rôle métier; seul le SUPER_ADMIN système reçoit les permissions par migration.
- Scopes `AGENCY`, `CONCESSION`, `GLOBAL` appliqués par SQL; `OWN` refusé pour les ressources collectives.
- Ordre de verrouillage : dépense puis compte, avec `FOR UPDATE`. Les sorties, transferts et décaissements verrouillent également les comptes; la concurrence ne peut pas sur-réserver.
- Migration additive `073`; migrations historiques et données FIN-02 intactes; aucune reprise fictive.
- API : couverture, indicateurs budgétaires, liste/création/ajustement/libération/historique et consommation liée au décaissement.
- UI : onglet Couverture, alertes, budgets approuvés, réservations, formulaire et libération; libellés visibles en français.

## Q à T — Tests et non-régression

| Scénarios | État initial / opération | Attendu | Obtenu | Verdict |
|---|---|---|---|---|
| FIN03-01, 02 | 1 000 000 sans puis avec réservation | disponible exact, puis non affecté réduit | formules et MySQL conformes | VALIDÉ |
| FIN03-03, 04 | deux réservations concurrentes de 800 000 | une acceptée, une refusée, total 800 000 | 201 + 409, total SQL 800 000 | VALIDÉ |
| FIN03-05, 06 | dépassement du reste / dépense non approuvée | refus 409 | garde-fous backend couverts | VALIDÉ |
| FIN03-07, 08 | paiement partiel puis total lié | réduction puis `CONSUMED` | transaction et événements couverts | VALIDÉ |
| FIN03-09 | paiement avec autre compte | réservation non consommée silencieusement | couple dépense/compte exigé | VALIDÉ |
| FIN03-10, 11 | libération puis seconde libération | succès puis 409 | MySQL réel conforme | VALIDÉ |
| FIN03-12, 13 | double consommation / contrepassation | refus; aucune recréation automatique | invariants présents | VALIDÉ |
| FIN03-14 à 16 | sortie, transfert, remboursement | registre Treasury inchangé, pas de double liquidité | services historiques préservés | VALIDÉ |
| FIN03-17, 18 | budget supérieur au cash / engagement non réservé | alerte informative, pas de blocage budget | déficit et non-réservé distincts | VALIDÉ |
| FIN03-19, 20 | agences et concessions distinctes | isolation par scope | prédicats SQL serveur | VALIDÉ |
| FIN03-21, 22 | devises multiples / compte inactif | lignes séparées / refus | groupement devise et garde-fou | VALIDÉ |
| FIN03-23, 24 | permission absente / `OWN` | 403 | endpoint réel 403 et refus `OWN` | VALIDÉ |
| FIN03-25 à 27 | historique FIN-02 / mouvement / période | intact / aucun doublon / solde courant | migration additive et requêtes dédiées | VALIDÉ |
| FIN03-28 à 30 | réservation face à décaissement, transfert, sortie | sérialisation compte+dépense | verrous transactionnels vérifiés | VALIDÉ |

Commandes probantes :

- backend `tsc --noEmit` : succès;
- frontend `tsc --noEmit` : succès;
- frontend `vite build` : succès (2 483 modules);
- tests ciblés FIN-01, FIN-02, Budget/Treasury et FIN-03 : 4 fichiers sur 4 réussis;
- tests frontend Treasury + FIN-03 : 2 fichiers sur 2 réussis;
- MySQL 8.4.11 jetable en `tmpfs` : migration 072 puis 073 et test authentifié réussis; conteneur supprimé.

Réserve de non-régression : l'ancien test backend `treasury-foundation.test.ts` a deux assertions déjà obsolètes (baseline `064` au lieu de `071`, audit SQL direct au lieu du service central). Elles n'ont pas été modifiées pour masquer l'écart. Les tests actuels ciblés sont verts.

## U à X — Documentation, fichiers, réserves et Git final

- Documentation de migration mise à jour avec définitions, éligibilité, concurrence, contrepassation et politique de sortie.
- Fichiers FIN-03 : migration 073, service de couverture, routes/service Treasury, hooks/page frontend et trois fichiers de tests.
- `git diff --check` : succès. Aucun commit, push, VPS, volume existant ou base persistante touché. Aucun mouvement historique modifié.
- État final : modifications locales non commitées sur `main`, HEAD `fb99164`.

## Verdict

- Trésorerie, budgets, engagements, décaissements, réservations, couverture, concurrence, RBAC, compatibilité historique, MySQL 8.4 et frontend : **VALIDÉ**.
- Non-régression : **VALIDÉ AVEC RÉSERVE** pour les deux assertions historiques obsolètes ci-dessus.
- Verdict global : **VALIDÉ AVEC RÉSERVE**.
