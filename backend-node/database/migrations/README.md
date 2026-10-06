# Futures migrations

Ce dossier conserve l'historique d'upgrade additif des bases existantes. La
baseline fraîche 055 absorbe désormais les migrations 034–055 ; le runner les
applique encore aux bases historiques selon leur journal `schema_migrations`.
Un marqueur consolidé `baseline_001_N` est un marqueur de plage : il prouve
que toutes les migrations de version inférieure ou égale à `N` sont déjà
incorporées, même sans ligne individuelle. Les lignes individuelles redondantes
et leurs anciennes traces d'étapes sous ce niveau restent conservées mais ne
sont pas rejouées. Une trace `FAILED_PARTIAL` au-dessus du niveau consolidé
reste en revanche bloquante et exige une réconciliation explicite.
Les migrations 034–037 prolongent le RBAC et le workflow SAV. La migration
`038_payment_refunds.sql` ajoute le registre central immuable des remboursements
partiels. Chaque remboursement est idempotent et relie explicitement un paiement,
sa facture et l’avoir appliqué qui le justifie. La migration 039 ajoute les états
et métadonnées minimales du workflow d'abandon OR ainsi que le type de restitution.
Les anciens remboursements portés
par `payments.status='refunded'` restent lus séparément et ne sont pas recopiés.
La numérotation continue sans doublon. Les migrations 001–033 de
`../legacy-migrations/` ne sont jamais parcourues par le runner.

La migration `050_vehicle_locations_and_sale_cost_snapshots.sql` sépare les
affectations physiques véhicule des emplacements Pièces/Atelier. Seuls les
anciens emplacements `showroom` et `yard` réellement utilisés sont repris ; les
types ambigus restent « Non affecté ». Chaque transfert passe par
`vehicle_movements`. Elle ajoute aussi les cinq composantes de coût snapshotées
sur `sale_items` afin de stabiliser la marge historique. Le reporting conserve
un fallback explicite vers le coût courant uniquement pour les ventes anciennes
qui ne disposent pas de snapshot.

La migration `051_supplier_business_qualifications.sql` qualifie le référentiel
central des fournisseurs. Les fournisseurs historiques restent fournisseurs de
pièces et ne deviennent fournisseurs de véhicules qu'après choix explicite.

La migration `052_showroom_visit_origin.sql` persiste l'origine Showroom ou CRM
de chaque nouvelle visite. Les lignes historiques restent conservativement en
origine Showroom. Le retour d'un essai créé explicitement depuis le CRM clôture
ainsi atomiquement sa visite sans modifier le parcours Showroom direct.

La migration `053_concession_document_identity.sql` complète l'identité légale
canonique de la concession avec le RCCM, le RIB documentaire et le site web.
Le NIU reste exclusivement porté par `concessions.tax_identifier`. Les champs
ajoutés sont optionnels et ne modifient aucune donnée historique.

La migration `054_treasury_foundation.sql` crée les comptes de trésorerie,
catégories concession, transferts et journal append-only. Elle ajoute les cinq
permissions granulaires du domaine.

La migration `055_treasury_flow_integration.sql` ajoute, sans reprise de données,
le mapping agence + moyen de paiement vers un compte de trésorerie et l'activation
explicite par concession. Elle conserve le moyen des règlements constructeur. Les
événements confirmés après activation sont écrits atomiquement dans Treasury ;
les factures, avoirs, budgets et événements antérieurs ne sont jamais backfillés.

La migration `045_customer_identity_per_agency.sql` définit l’identité client
par agence. L’e-mail (`TRIM`, insensible à la casse) et le téléphone (caractères
non numériques retirés, sans conversion national/international) disposent de
colonnes générées et d’index uniques distincts avec `agency_id`. Chaque valeur
reste nullable. Le préflight signale uniquement le type et le nombre de groupes
incompatibles, sans afficher les coordonnées et sans fusion automatique.
