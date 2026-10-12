# ERP-19 — Arbitrage Atelier/Pièces

## Options comparées

### A — Attribuer `service.order.update` aux rôles Pièces

Changement limité aux rôles, sans code. Il débloque immédiatement les routes et la carte frontend.

Avantage : mise en œuvre très courte. Risques : donne au Magasinier et au Responsable pièces la modification générale d'un OR, du chiffrage et potentiellement de la main-d’œuvre ; dépend d'une permission trop large ; contredit le moindre privilège. Tests nécessaires : toutes les mutations OR négatives, scopes agence/concession, UI complète. **Non recommandé.**

### B — Ajouter les permissions de réservation aux rôles SAV

Attribuer au Conseiller/Responsable SAV `parts.reservation.view/create/consume/release` avec leurs scopes actuels.

Avantage : aucun code et écran OR déjà disponible. Risques : le SAV demande, réserve, délivre et consomme lui-même ; séparation Atelier/Magasin supprimée ; `OWN` appliqué à un stock collectif doit être défini explicitement. Variante acceptable seulement si le métier affirme que le conseiller est responsable physique du stock. **Possible sous décision métier, non préférée.**

### C — Utiliser exclusivement les permissions spécialisées sur les routes de réservation

Remplacer, uniquement sur les trois routes de réservation, la garde générale par une garde qui : sélectionne la permission spécialisée selon l'action, charge un contexte OR minimal, et vérifie l'agence de l'OR via AGENCY/CONCESSION/GLOBAL. Conserver tous les verrous et contrôles métier.

Avantages : moindre privilège, réutilise le catalogue RBAC existant, n'accorde aucune modification générale d'OR. Risques : une suppression naïve de `service.order.update` provoquerait une fuite de scope ; le frontend actuel ne fournit pas de surface aux rôles Pièces. Tests nécessaires : 401/403/404, agences opposées, concession, concurrence, idempotence, stocks et facturation. **Base technique recommandée.**

### D — Séparer Atelier et Magasin

Le SAV crée le besoin estimatif ; le Magasin réserve, délivre/consomme ou libère depuis une vue minimale de demandes ; l'Atelier consulte le résultat. Ajouter `parts.reservation.view` seulement aux rôles SAV qui doivent saisir une pièce estimative. La vue Magasin n'expose que référence, quantité autorisée, OR, agence, statut, emplacements et stock utile.

Avantages : responsabilités claires, aucune exposition du dossier OR complet, audit par acteur, scopes naturels. Risques : nécessite une petite surface API/frontend dédiée et une décision sur le sens exact de « délivré » versus « consommé ». **Architecture cible recommandée.**

## Recommandation

Retenir **C + D** : permissions spécialisées comme autorité backend, avec séparation Atelier/Magasin.

Modification minimale proposée pour une phase autorisée ultérieure :

1. conserver `service.order.update` sur création/suppression du chiffrage et mutations générales d'OR ;
2. donner uniquement `parts.reservation.view` aux rôles SAV devant ajouter/consulter un besoin, à leur scope existant ;
3. remplacer la garde `service.order.update` des routes `reserve` et `reservations/:id` par un middleware spécialisé qui scope directement l'OR sur `parts.reservation.create/consume/release` ;
4. fournir aux rôles Pièces une liste et un détail minimal des demandes, sans client sensible ni capacité de modifier l'OR ;
5. retirer ou réserver le flux de consommation directe `POST /repair-orders/:id/items` aux exceptions contrôlées ; le flux normal doit passer par réservation ;
6. décider si `consumed` signifie réellement « délivré et consommé ». Si les deux événements doivent être distincts, créer une transition et un audit dédiés avant d'implémenter, sans inventer cette règle pendant l'audit.

## Tests proposés

- Magasinier AGENCY : voit et traite seulement les demandes de son agence ; autre agence 403/404 sans fuite.
- Responsable pièces CONCESSION : traite les agences de sa concession ; autre concession refusée dans un environnement jetable.
- Conseiller SAV OWN : crée/consulte le besoin de son OR, sans pouvoir réserver ni consommer.
- Chef atelier AGENCY : consultation seulement.
- Technicien OWN : aucune mutation Pièces.
- réservation après accord et OR en cours : 201 ; rejeu idempotent : même réservation.
- stock insuffisant, mauvais magasin, mauvais scope, OR terminal et absence d'accord : refus sans écriture.
- consommation partielle puis totale : `reserved_stock`, `current_stock`, `consumed_quantity`, ligne OR et montant cohérents.
- libération : physique inchangé, réservé décrémenté, mouvement d'audit présent.
- deux réservations/consommations concurrentes : aucun stock négatif ni double ligne.
- frontend : menus, liste Magasin, boutons autorisés/interdits, accès direct et messages cohérents pour les six profils.
- non-régression : abandon OR, garantie, facture Atelier et GED.

## Décision métier attendue

Confirmer explicitement :

1. qui formule le besoin : Conseiller SAV, Responsable SAV ou Chef d'atelier ;
2. qui réserve et délivre : Magasinier local ou Responsable pièces de concession ;
3. si délivrance et consommation sont un seul événement ou deux états séparés ;
4. qui peut libérer une réservation ;
5. si la consommation directe sans réservation doit rester possible ;
6. si le Responsable pièces CONCESSION peut agir sur toutes les agences ou seulement superviser.

## Verdict d'arbitrage

**CORRECTION DE GARDES ET SÉPARATION CIBLÉE RECOMMANDÉES.** L'ajout de `service.order.update` aux rôles Pièces est la solution la plus courte mais pas la plus sûre. Aucune modification ne doit être appliquée avant validation des six décisions ci-dessus.
