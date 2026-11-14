# Audit RBAC et multi-agences

## Modèle constaté

RBAC dynamique fondé sur `permissions`, `roles`, `role_permissions`, `user_agencies`, `user_agency_roles`, contexte de session et niveaux OWN/AGENCY/CONCESSION/GLOBAL. Les routes métier utilisent les gardes agency business et recalculent le périmètre côté backend.

## Profil de recette

Le rôle temporaire `AUDIT_COMMERCIAL_b0bd7910`, agence 1, a reçu les permissions des quatre domaines avec scope AGENCY. L’audit a révélé que `billing.payment.create` n’existe pas ; la permission effective est `billing.payment.collect`. Après ajout temporaire de `billing.invoice.issue`, `billing.invoice.update` et `billing.payment.collect`, les actions correspondantes sont apparues seulement après réauthentification.

Ce résultat valide :

- le masquage dynamique frontend ;
- le rafraîchissement des grants à la nouvelle session ;
- la protection backend des endpoints ;
- la nécessité d’un scope collectif pour les candidats agence.

## Couverture

| Cas | Preuve | Statut |
|---|---|---|
| permission accordée | navigateur réel | CONFORME |
| action masquée avant grant | navigateur réel | CONFORME |
| grant après reconnexion | navigateur réel | CONFORME |
| candidats actifs même agence | navigateur réel | CONFORME |
| véhicules transit/vendus exclus | navigateur réel | CONFORME |
| scopes showroom unitaires | tests ciblés réussis | CONFORME |
| 401 sans jeton | tests existants/code | PARTIELLE |
| 403 permission refusée API | tests dynamiques existants | PARTIELLE |
| 404 ressource hors scope | inspection/tests existants | PARTIELLE |
| changement agence active | NON TESTÉ navigateur | NON TESTÉE |
| rôle différent par agence | NON TESTÉ réel | NON TESTÉE |
| révocation en session | NON TESTÉ réel | NON TESTÉE |
| OWN vs AGENCY | tests ciblés réussis | CONFORME ciblée |
| suite contexte multi-agences | schéma jetable, migration 127 | BLOQUÉE FIXTURE 2FA |

## Conclusion

La conception est cohérente et le backend ne repose pas sur le simple masquage des boutons. La suite dynamique complète a été réellement lancée mais son superadministrateur de fixture reçoit `401 TWO_FACTOR_AUTHENTICATION_REQUIRED`; l’attendu 200 est donc incompatible avec la politique 2FA actuelle. La conformité multi-agences complète n’est pas déclarée. Verdict : **PARTIELLEMENT CONFORME**, sans fuite inter-agence démontrée.

Le rôle, le compte, les affectations et les 65 grants temporaires ont été supprimés lors du nettoyage final.
