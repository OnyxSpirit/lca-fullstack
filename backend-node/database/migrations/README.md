# Futures migrations

Ce dossier contient exclusivement les évolutions postérieures au baseline.
Les migrations 034–037 prolongent le RBAC et le workflow SAV. La migration
`038_payment_refunds.sql` ajoute le registre central immuable des remboursements
partiels. Chaque remboursement est idempotent et relie explicitement un paiement,
sa facture et l’avoir appliqué qui le justifie. La migration 039 ajoute les états
et métadonnées minimales du workflow d'abandon OR ainsi que le type de restitution.
Les anciens remboursements portés
par `payments.status='refunded'` restent lus séparément et ne sont pas recopiés.
La numérotation continue sans doublon. Les migrations 001–033 de
`../legacy-migrations/` ne sont jamais parcourues par le runner.

La migration `045_customer_identity_per_agency.sql` définit l’identité client
par agence. L’e-mail (`TRIM`, insensible à la casse) et le téléphone (caractères
non numériques retirés, sans conversion national/international) disposent de
colonnes générées et d’index uniques distincts avec `agency_id`. Chaque valeur
reste nullable. Le préflight signale uniquement le type et le nombre de groupes
incompatibles, sans afficher les coordonnées et sans fusion automatique.
