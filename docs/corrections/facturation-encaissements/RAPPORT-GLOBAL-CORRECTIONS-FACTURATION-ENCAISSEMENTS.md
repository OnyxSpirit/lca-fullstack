# Rapport global — corrections Facturation & Encaissements

## Résumé

La chaîne d'encaissement accepte désormais une destination de trésorerie explicitement choisie. La migration additive `125_billing_payment_destinations_and_cancellations.sql` ajoute la destination et la date technique au paiement, autorise plusieurs compatibilités exactes agence/moyen/compte, reprend uniquement les historiques non ambigus et introduit l'annulation traçable.

## Corrections

- AUDIT-FE-001 : `payments.created_at` est créé ; la reprise reste gouvernée par le cutover existant.
- AUDIT-FE-002 : paiement, remboursement et annulation transportent le compte du mouvement réel vers l'événement comptable.
- AUDIT-FE-003 : les routes Facturation acceptent les permissions granulaires dynamiques.
- AUDIT-FE-004 : l'API contextuelle filtre les destinations actives, prêtes, compatibles, de même devise et du périmètre de la facture ; l'UI bloque une liste vide.
- AUDIT-FE-005 : annulation distincte du remboursement, motivée, idempotente, auditée et contrepassée en trésorerie.
- AUDIT-FE-006 : aucune présélection du moyen ou du compte.
- AUDIT-FE-007 : date métier séparée de la date technique ; règle de justificatif configurable par moyen.
- AUDIT-FE-008 : migration GED `126` avec catégorie/type dédiés, téléversement PDF/PNG/JPEG, contrôle de périmètre et consultation sécurisée.
- AUDIT-FE-009 : rattachement du justificatif, création du paiement, mouvement de trésorerie et mise à jour du solde dans une même transaction.
- AUDIT-FE-010 : l'annulation comptable neutralise un encaissement encore en attente ou contrepasse l'écriture déjà comptabilisée, sans schéma arbitraire.

## Architecture

Le navigateur ne transmet que le moyen et le compte choisis. Le backend redéduit l'agence depuis la facture et revalide la compatibilité dans la transaction. Paiement, mouvement et solde restent atomiques. Le worker comptable joint le mouvement financier, source de vérité du compte.

## Validation réelle

- Base isolée : `lca_facturation_recette_isolee`, dans le conteneur jetable dédié `lca-codex-final-integrations-20261111` ; aucune base `concession_erp` n'y existe.
- Bootstrap complet puis migrations réexécutées idempotemment jusqu'au niveau `126`, sans avertissement.
- Test MySQL dédié réussi pour les deux ordres du worker comptable : annulation avant comptabilisation et contrepassation après comptabilisation.
- TypeScript backend et frontend, build Vite et tests ciblés Facturation/GED/Comptabilité réussis.

## Réserves

- La recette navigateur visuelle complète n'a pas encore été exécutée sur une instance applicative alimentée par ce jeu de données isolé.
- La suite globale frontend compte 212 succès et 6 échecs historiques/transverses ; trois écarts introduits ou révélés pendant cette mission (GED reçu, dialogue natif, typage) ont été corrigés et requalifiés au vert.
- La suite globale backend utilise par défaut une base fictive `test@127.0.0.1`, produit plusieurs échecs d'endpoints hors périmètre puis conserve des handles ouverts après les tests GED ; elle ne constitue pas une recette MySQL exploitable en l'état.

## Verdict

**MISSION FONCTIONNELLE TECHNIQUEMENT, RECETTE VISUELLE ENCORE RÉSERVÉE**. Le noyau, MySQL réel, la GED intégrée et la contrepassation comptable sont implémentés et testés. La clôture définitive reste conditionnée à la recette navigateur complète et à la qualification des échecs globaux historiques.
