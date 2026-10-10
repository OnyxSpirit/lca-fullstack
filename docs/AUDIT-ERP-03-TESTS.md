# AUDIT-ERP-03 — Preuves de tests

Date d’exécution : 10 octobre 2026.

## Validation ciblée

| Couche | Résultat | Couverture principale |
|---|---:|---|
| Backend ciblé | 7/7 | workflow, verrou facture, annulation/finance, garde financière, domaine, RBAC dynamique |
| Frontend ciblé | 27/27 | wizard, facture verrouillée, annulation/finance, garde financière, workflow commercial |
| MySQL 8.4.11 | 1/1 | annulation atomique, rollback, factures, paiements et concurrences |
| TypeScript backend | succès | `npm run lint`, `npm run build` |
| Frontend | succès | `npm run lint`, `npm run build` — 2487 modules |

Le scénario MySQL crée deux ventes concurrentes avec deux clés d’idempotence sur le même véhicule. Résultat attendu et obtenu : une réponse 201, une 409, une seule vente active et un véhicule réservé.

Le même scénario vérifie : annulation sans facture; facture brouillon/émise/échue non payée; refus après paiement confirmé; concurrence annulation/paiement; concurrence annulation/facture; rollback complet après erreur simulée; réutilisation du véhicule libéré.

## Recette navigateur/API

- Connexion authentifiée sur environnement isolé.
- Remise vide par défaut puis saisie à 500 000 XAF.
- Véhicule 20 000 000 XAF HT; TVA 18,9 %; total 23 185 500 XAF.
- Création réussie et baisse du stock affiché de 17 à 16.
- Annulation réussie; état terminal visible.
- Facturation après annulation refusée en 409.
- Autorisation financière de livraison après annulation refusée en 409 et panneau absent.

## Suites globales

| Suite | Réussis | Échecs | Total | Durée |
|---|---:|---:|---:|---:|
| Backend | 178 | 39 | 217 | 123,8 s |
| Frontend | 755 | 31 | 786 | 76,1 s |

Ces suites ne sont donc pas vertes. Les échecs incluent de nombreux contrats textuels obsolètes et des domaines hors Ventes. Les tests ciblés exécutables du périmètre et la preuve MySQL sont verts; cette distinction motive le verdict « validé avec réserves » et non « validé ».

## Environnement

- MySQL : `mysql:8.4`, version 8.4.11, conteneur jetable, port hôte 33320, sans volume persistant.
- Backend isolé : port 3003.
- Frontend isolé : port 4175.
- Service existant : frontend 3001 laissé actif.
