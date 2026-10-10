# STABILISATION-FINALE-ERP — corrections

## Corrections produit

- `vehicles`: contrôle RBAC exécuté avant la validation métier sur `POST /vehicles`, empêchant la fuite d'informations de validation à un rôle non autorisé.
- `billing`: validation locale des lignes d'une facture manuelle avant la résolution de configuration MySQL. Une facture vide ou une remise incohérente retourne désormais une erreur métier déterministe avant accès base.

## Corrections des moyens de test

- Fixture JWT/RBAC : catalogue de permissions réaligné sur les codes courants et isolation de contexte renforcée.
- La fixture ne réutilise plus arbitrairement la première session d'un identifiant partagé.
- Les assertions Client 360, Users, notifications, images véhicule, garantie contractuelle et périmètre Billing ont été alignées sur les implémentations actuelles, sans supprimer les invariants de sécurité.
- La recette RBAC fraîche ne fige plus un ancien total de 171 permissions ; elle vérifie unicité et égalité avec le profil Super Admin authentifié. Le catalogue courant contient 251 permissions.
- Ajout de `test/fresh-session.integration.py` pour prouver rotation et révocation de session sur la pile jetable.

## Non-modifications garanties

Aucune permission de production n'a été élargie, aucune validation métier n'a été désactivée, aucune migration supplémentaire n'a été créée et aucune donnée persistante n'a été touchée.
