# ERP LCA — Implémentation CRM et simplification du workflow Ventes

## 1. Modifications réalisées

- Le pipeline CRM autorise désormais toutes les transitions entre étapes différentes lorsqu'aucune vente n'est liée.
- Toute transition CRM verrouille et vérifie l'absence de vente liée avant écriture.
- Les informations de clôture `won_at`, `lost_at`, `lost_reason` et `leads.converted_at` sont posées ou nettoyées selon la destination.
- L'API CRM expose une association de vente fiable avec trois états : `NONE`, `ACCESSIBLE`, `INACCESSIBLE`.
- La fiche CRM distingue le statut commercial de l'existence d'une vente et propose « Consulter la vente » lorsque l'accès est autorisé.
- Une opportunité `won` sans vente peut ouvrir l'assistant existant « Créer une vente » si un devis éligible existe.
- Le parcours normal Ventes confirme directement `reserved → confirmed`; `ordered → confirmed` reste supporté.
- La confirmation convertit la réservation, vend le véhicule, actualise les snapshots et conserve l'archive du bon de commande.
- Une migration additive protège l'unicité nullable de `sales.opportunity_id` après un préflight non destructif.

## 2. Fichiers modifiés

Fichiers applicatifs principaux :

- `backend-node/src/modules/crm/crm.routes.ts`
- `backend-node/src/modules/sales/sale.domain.ts`
- `backend-node/src/modules/sales/sale.service.ts`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/sales/SaleDetailPage.tsx`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/types/index.ts`
- `backend-node/database/baseline/001_initial_schema.sql`
- `backend-node/database/migrations/118_sales_opportunity_uniqueness.sql`

Les tests CRM/Ventes directement concernés ont été adaptés et deux fichiers ciblés ont été ajoutés :

- `backend-node/test/crm-sales-simplification.test.ts`
- `frontend/test/crm-sales-simplification.test.ts`

## 3. Migration

La migration `118_sales_opportunity_uniqueness.sql` :

1. compte les groupes de ventes partageant un même `opportunity_id` non nul;
2. s'arrête via le mécanisme de préflight du runner si un groupe incompatible existe;
3. ne modifie aucune donnée historique;
4. ajoute `UNIQUE KEY uq_sales_opportunity_id (opportunity_id)` uniquement si le préflight est compatible.

Les valeurs nulles restent multiples, donc les ventes directes sans opportunité restent possibles. La migration n'a pas été appliquée sur une base existante pendant cette mission.

## 4. Changements API

Les réponses CRM issues de `/leads` et `/leads/:id` contiennent maintenant :

```ts
saleAssociation:
  | { state: 'NONE' }
  | { state: 'INACCESSIBLE' }
  | { state: 'ACCESSIBLE'; id: string; number: string; status: string }
```

La résolution utilise exclusivement `sales.opportunity_id`. Une vente n'est détaillée que si elle appartient à l'agence active et si `sales.view` autorise le scope `AGENCY`, ou le scope `OWN` pour son commercial. L'état `INACCESSIBLE` ne divulgue ni identifiant, ni numéro, ni statut.

## 5. Nouvelles transitions CRM

Toutes les étapes différentes sont autorisées par la matrice, notamment :

- `won → negotiation`, `offer`, `qualified` ou `lost`;
- `lost → negotiation`, `offer` ou `won`;
- toutes les transitions non linéaires déjà permises.

La destination `lost` conserve l'exigence `crm.prospect.lose` et un motif obligatoire. Une transition identique reste interdite.

## 6. Liaison CRM/Ventes

Avant toute modification d'étape, la transaction verrouille l'opportunité puis exécute :

```sql
SELECT id,status FROM sales WHERE opportunity_id=? FOR UPDATE
```

Si une vente existe, la transition est refusée avec le code `CRM_STAGE_LINKED_SALE`. La vente, ses factures, paiements et réservations ne sont jamais modifiés par le CRM.

La création de vente conserve les validations existantes, lie la vente à l'opportunité, accepte le devis, garde l'opportunité à `won` et réserve le véhicule.

## 7. Bouton « Créer une vente »

Le bouton réutilise `SaleWizardModal`. Il est disponible aux étapes Offre, Négociation et Gagnée lorsque :

- `saleAssociation.state === 'NONE'`;
- l'utilisateur possède `quotations.convert` et `sales.create`;
- un devis émis ou en négociation est archivé, non expiré et non converti.

Sans devis sur une opportunité gagnée, la fiche explique que le devis éligible est obligatoire. Un devis présent mais inéligible rend le bouton désactivé avec une explication. Les invalidations React Query existantes rechargent prospects, devis, ventes, véhicules et clients après conversion.

## 8. Bouton « Consulter la vente »

Il apparaît uniquement pour `saleAssociation.state === 'ACCESSIBLE'` et ouvre la route existante `/sales/:id`. Une vente hors permission affiche seulement qu'une vente est associée mais non consultable. L'ancien message déduit du seul statut `GAGNE` a été supprimé.

## 9. Nouveau workflow de confirmation

Pour les nouvelles ventes :

`reserved → confirmed → preparation → ready_for_delivery → delivered`

La fiche d'une vente `RESERVATION` affiche directement « Confirmer la vente ». Aucun statut `ordered` transitoire n'est persisté et un seul événement `sales:status` est émis.

## 10. Compatibilité historique

- `ordered → confirmed` reste autorisé.
- Le frontend affiche également « Confirmer la vente » pour une vente historique `COMMANDE`.
- Aucun statut historique n'est migré ou réécrit.
- Les états `draft`, `reserved`, `ordered`, `confirmed`, `preparation`, `ready_for_delivery`, `delivered` et `cancelled` restent lisibles.

## 11. Protections transactionnelles

La confirmation :

- recalcule le scope `sales.confirm` dans l'agence active;
- verrouille la vente et le véhicule;
- valide la machine à états;
- exige le véhicule `reserved`;
- verrouille la réservation de la vente et du véhicule;
- exige exactement une réservation au statut `pending`, `confirmed` ou `converted`;
- convertit la réservation dans la même transaction;
- met la vente à `confirmed` et le véhicule à `sold`;
- utilise un update conditionnel sur l'ancien statut du véhicule;
- actualise les snapshots de coût et le snapshot technique;
- écrit l'historique véhicule et l'audit avant commit.

Une requête répétée sur une vente déjà `confirmed` conserve le comportement idempotent existant. Une confirmation concurrente, une annulation concurrente ou un véhicule modifié sont sérialisés par les verrous et l'une des opérations reçoit un conflit explicite.

## 12. Effets sur le stock

- La création continue de faire `available → reserved`.
- La confirmation directe fait `reserved → sold`.
- La réservation technique passe à `converted`.
- L'annulation conserve la libération `reserved/sold → available` selon les règles existantes.
- La livraison reste exclusivement responsable de `sold → delivered`.

La recherche de vente active, de réservation active et l'update conditionnel de création restent inchangés. L'unicité d'opportunité renforce en plus la protection CRM → Vente.

## 13. Documents

L'archivage du bon de commande reste déclenché après commit lorsque la cible vaut `confirmed`. Le stockage documentaire n'a pas été déplacé dans la transaction SQL. Le endpoint de reprise `/sales/:id/archive` et les contrôles d'archive historique restent inchangés.

## 14. RBAC

Permissions conservées :

- `crm.pipeline.advance` pour les changements d'étape;
- `crm.prospect.lose` pour la destination Perdue;
- `sales.create` et `quotations.convert` pour la conversion;
- `sales.assign` lorsque la réaffectation est nécessaire;
- `sales.view` pour exposer et consulter la vente liée;
- `sales.confirm` pour la confirmation directe ou historique.

Aucun rôle n'a été codé en dur. Les scopes `OWN`/`AGENCY` et l'agence active restent vérifiés côté backend.

## 15. Tests exécutés

- TypeScript frontend : `npm run lint`.
- TypeScript backend : `npm run lint`.
- Build frontend : `npm run build`.
- Build backend : `npm run build`.
- Tests backend ciblés CRM, Ventes, RBAC structurel et runner de migrations.
- Tests frontend ciblés CRM, devis, confirmation et compatibilité historique.
- Suite frontend complète relancée avec `node --import tsx --test` pour contourner l'IPC interdit du script `tsx`.
- `git diff --check`.

## 16. Tests réussis

- Lint frontend et backend : succès.
- Build frontend et backend : succès.
- Backend ciblé final : 6 fichiers, 6 réussis, 0 échec.
- Frontend ciblé final : 6 fichiers, 6 réussis, 0 échec.
- Première passe complète frontend : 209/211; les deux échecs étaient des assertions textuelles devenues obsolètes. Elles ont été adaptées et les deux fichiers repassent dans la passe ciblée finale.
- Runner de migrations : succès, y compris la logique de préflight et de reprise.

## 17. Tests échoués

La commande standard frontend `npm test` échoue avant exécution avec `listen EPERM` sur le socket IPC `/tmp/tsx-1000/19.pipe`. La commande équivalente `node --import tsx --test` fonctionne.

La suite HTTP backend complète rencontre `listen EPERM: operation not permitted 0.0.0.0` lorsque Supertest tente d'ouvrir un port dans le bac à sable. Les fichiers concernés sont signalés comme échoués au niveau fichier, sans indication d'une régression métier. Les tests ciblés sans écoute réseau passent.

## 18. Tests non exécutés

- Migration 118 sur une base MySQL existante réelle.
- Tests d'intégration MySQL nécessitant un environnement de recette isolé et autorisé.
- Concurrence réelle multi-connexion : double confirmation, confirmation contre annulation et double conversion.
- Vérification Socket.IO sur serveur réellement écouté.
- Recette navigateur manuelle avec plusieurs profils et agences.

Aucune réussite n'est revendiquée pour ces scénarios.

## 19. Réserves

- Avant déploiement de la migration, exécuter son préflight sur une sauvegarde ou une base de recette. Tout doublon bloque volontairement l'application et doit être analysé manuellement.
- `sold_at` n'a pas été modifié conformément à la décision. L'incohérence préexistante des rapports filtrant les ventes confirmées par `sold_at` demeure.
- Les consommateurs externes éventuels du statut `ordered` n'ont pas pu être inventoriés hors dépôt.
- L'état `INACCESSIBLE` révèle seulement l'existence d'une liaison, conformément au parcours demandé, sans exposer la vente.

## 20. Scénarios de recette manuelle

### A. Liberté CRM sans vente

- **Profil** : commercial avec `crm.prospect.view`, `crm.pipeline.advance`, et `crm.prospect.lose` pour Perdue.
- **Chemin** : CRM → Prospects → ouvrir une fiche sans vente.
- **Données** : opportunité `won` ou `lost`, aucune ligne `sales.opportunity_id` liée.
- **Actions** : passer `won → negotiation`, puis `negotiation → lost`; saisir un motif; passer `lost → offer`.
- **Attendu** : transitions acceptées, activité créée à chaque fois, motif/date de perte nettoyés en quittant Perdue, dates de clôture cohérentes.

### B. Verrou CRM avec vente

- **Profil** : commercial avec `crm.pipeline.advance`.
- **Chemin** : CRM → fiche d'une opportunité déjà convertie.
- **Données** : vente liée par `sales.opportunity_id`.
- **Actions** : tenter de changer l'étape par la fiche puis, séparément, par appel API.
- **Attendu** : action masquée dans l'UI; API en conflit `CRM_STAGE_LINKED_SALE`; aucune écriture CRM, Vente ou Finance.

### C. Opportunité gagnée sans vente

- **Profil** : commercial avec `sales.create`, `quotations.convert`, lecture devis et droits CRM.
- **Chemin** : CRM → fiche Gagnée.
- **Données** : aucun lien vente; un devis émis, archivé, valide, avec un VIN disponible.
- **Actions** : cliquer « Créer une vente », compléter la garantie, enregistrer.
- **Attendu** : vente `reserved`, véhicule `reserved`, devis `accepted`, opportunité toujours `won`; « Créer une vente » remplacé par « Consulter la vente ».

### D. Gagnée sans devis éligible

- **Profil** : même profil commercial.
- **Chemin** : CRM → fiche Gagnée.
- **Données** : aucun devis, ou devis expiré/non archivé.
- **Actions** : consulter les actions.
- **Attendu** : aucune vente incomplète; explication claire ou bouton désactivé.

### E. Vente liée non consultable

- **Profil** : utilisateur CRM sans `sales.view`, ou scope `OWN` ne couvrant pas la vente.
- **Chemin** : CRM → fiche liée.
- **Données** : vente d'un autre commercial ou non couverte.
- **Actions** : ouvrir la fiche.
- **Attendu** : état « vente associée non autorisée », sans numéro, identifiant, statut ni lien.

### F. Confirmation directe

- **Profil** : commercial avec `sales.view` et `sales.confirm` dans le bon scope.
- **Chemin** : Ventes → ouvrir une vente `RESERVATION` → Confirmer la vente.
- **Données** : véhicule `reserved`, une réservation `confirmed` cohérente.
- **Actions** : confirmer une fois, puis rafraîchir.
- **Attendu** : vente `confirmed`, véhicule `sold`, réservation `converted`, un audit et un événement, bon de commande archivé, `sold_at` inchangé, aucun passage visible par `ordered`.

### G. Vente historique ordered

- **Profil** : même profil.
- **Chemin** : Ventes → ouvrir une vente `COMMANDE` historique.
- **Données** : vente `ordered`, véhicule `reserved`, réservation `converted`.
- **Actions** : Confirmer la vente.
- **Attendu** : confirmation réussie et mêmes effets documentaires/stock que le parcours direct.

### H. Concurrence et conflits

- **Profil** : deux commerciaux autorisés dans la même agence.
- **Chemin** : deux sessions sur la même vente ou le même VIN.
- **Données** : vente `reserved` cohérente.
- **Actions** : confirmer simultanément; refaire avec une annulation simultanée; tenter deux conversions de la même opportunité.
- **Attendu** : une seule opération gagnante, aucun état partiel, conflit explicite pour l'autre; une seule vente par opportunité.

### I. Finance et livraison inchangées

- **Profil** : commercial, comptable et préparateur/livreur selon leurs permissions.
- **Chemin** : CRM → Vente → Confirmation → Facture → Paiement/autorisation → Préparation → Livraison.
- **Données** : facture impayée, puis partiellement payée, puis soldée ou autorisée.
- **Actions** : tenter chaque étape avant et après apurement.
- **Attendu** : confirmation commerciale possible sans facture; préparation et livraison refusées tant que le verrou financier n'est pas satisfait; aucune livraison après annulation.
