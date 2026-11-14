# Plan de correction et développement

Ce plan ne constitue pas une autorisation de correction. Il ordonne les travaux après arbitrage.

## Priorité 1 — sécurité opérationnelle

1. Corriger le contrat date/heure livraison (`ANO-LIV-001`).
2. Décider la politique de signature : papier/PDF uniquement ou capture numérique formalisée (`ANO-LIV-002`).
3. Rendre bloquantes en CI les suites MySQL désormais validées ; adapter le test rollback showroom à une technique compatible sans privilège global.
4. Ajouter E2E vente annulée→tentative livraison et autorisation consommée/révoquée.

## Priorité 2 — cycle documentaire

1. Arbitrer annulation et expiration pro forma.
2. Corriger en priorité le renderer pro forma particulier (`ANO-DOC-002`) puis pérenniser l’extraction PDF automatisée.
3. Clarifier remise physique versus pièce GED dans la livraison.
4. Ajouter tests d’archive absente, reprise d’archive et permissions d’export.

## Priorité 3 — UX et couverture

1. Corriger l’avertissement trompeur du devis.
2. Arbitrer puis implémenter les tris des listes.
3. Compléter E2E réaffectation showroom, rendez-vous, annulations et changement d’agence.
4. Tester mobile, clavier, libellés accessibles et doubles clics sur chaque mutation.

## Tests d’acceptation minimaux

- Aucun changement d’heure après aller-retour UI/API/MySQL.
- Une vente annulée retourne 409/404 selon le périmètre et ne crée aucune livraison.
- Une autorisation financière est atomiquement consommée une seule fois.
- Deux créations concurrentes ne vendent jamais deux fois le même véhicule.
- Tous les documents officiels correspondent aux snapshots historiques.
- Les boutons masqués restent refusés par API après révocation.

Ordre recommandé de levée de réserves : `ANO-LIV-001` et `ANO-DOC-002` avant mise en production, décision juridique `ANO-LIV-002`, puis `ANO-PRO-001`, `ANO-DEV-001`, `ANO-DOC-001` et `ANO-UX-001`. Aucune de ces corrections n’a été appliquée pendant l’audit.
