# STABILISATION-ERP-01 — Plan RBAC multi-rôles

## Modèle constaté

Le backend est autoritaire. Les scopes sont `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`; le libellé « GLOBAL » est le code réellement présent, même si la mission emploie parfois « ALL ». Installation fraîche : seul rôle système `SUPER_ADMIN`, toutes les autres fonctions sont des rôles dynamiques. Inventaire SQL consolidé : **255 codes de permissions métier**, après exclusion des clés de configuration `billing.default_vat_rate` et `workshop.rate_t1..t4`.

## Profils de recette proposés

| # | Profil dynamique | Familles minimales | Scope recommandé | Interdits à prouver |
|---:|---|---|---|---|
| 1 | Super Administrateur système | catalogue complet | GLOBAL | dernier admin désactivé/supprimé |
| 2 | Direction | dashboard, reporting, activity, vues financières/RH | CONCESSION | mutation opérationnelle non accordée |
| 3 | Responsable commercial | crm, showroom, quotations, sales, customers | AGENCY/CONCESSION | finance/RH |
| 4 | Commercial | mêmes familles limitées | OWN | ressources d’un collègue, affectation collective |
| 5 | Réceptionniste | showroom, customers.create/view, vehicles.view | AGENCY | remise, vente, paiement |
| 6 | Comptable | billing, supplier debt, exports | AGENCY/CONCESSION | autorisation livraison, rôles |
| 7 | Responsable financier | billing, treasury, budgets, rapprochement, override livraison | CONCESSION | RH sensible non accordée |
| 8 | Responsable livraison | delivery complet, sales/vehicles en lecture | AGENCY | paiement et modification vente |
| 9 | Conseiller SAV | service orders, customers/vehicles, GED | OWN/AGENCY | administration atelier globale |
| 10 | Responsable SAV | service complet, warranty, reporting | AGENCY/CONCESSION | trésorerie générale |
| 11 | Chef d’atelier | workshop plan/resources/sessions + service view | AGENCY | facturation/paiement |
| 12 | Technicien | interventions/session track | OWN | réaffectation, tarifs, stock global |
| 13 | Magasinier | parts catalog/stock/orders/reservations | AGENCY | finance fournisseur validation |
| 14 | Responsable pièces | parts complet + supplier invoice view | AGENCY/CONCESSION | paiement fournisseur sans droit |
| 15 | Responsable RH | hr complet, utilisateurs liés | CONCESSION | ventes/stock commercial |
| 16 | Gestionnaire RH | employés/contrats/congés/primes | AGENCY | paie/décaissement selon séparation |

## Matrice de contrôle obligatoire

Pour chaque permission sensible : succès avec scope exact; 403 sans permission; 404/403 sur ID hors scope; OWN personnel et OWN tiers; utilisateur/rôle inactif; agence sœur; autre concession; GLOBAL; appel API direct malgré bouton masqué; invalidation après changement de rôle; impossibilité de déléguer une permission ou un scope supérieur au sien.

## Scénarios de provisionnement

1. Bootstrap frais et connexion SUPER_ADMIN.
2. Création des 15 rôles métier ci-dessus sans nom codé en dur.
3. Affectation de permissions par famille puis scopes explicites.
4. Création d’un utilisateur actif par rôle et d’un homologue dans une seconde agence; certains profils dans une seconde concession.
5. Test positif, test négatif et test inter-scope pour chaque famille.
6. Désactivation rôle/utilisateur et vérification session/API/Socket.IO.
7. Export de la matrice effective pour preuve, sans modifier la base persistante.

Le détail exhaustif des 255 codes reste la table `permissions` de la base jetable issue du bootstrap; le seed et les migrations sont la source technique, pas une liste copiée manuellement susceptible de dériver.
