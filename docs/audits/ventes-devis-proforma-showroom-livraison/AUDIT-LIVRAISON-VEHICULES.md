# Audit Livraison des véhicules

## Cartographie

- UI : `/deliveries`, `/deliveries/:id`; `DeliveriesPage`, `NewDeliveryModal`, `DeliveryDetailPage`.
- API : candidats, spécialistes, CRUD livraison, transitions, checklist, documents, signature, PV, autorisations financières, services additionnels.
- Tables : `deliveries`, instances/configuration de checklist, `delivery_documents`, `delivery_signatures`, `delivery_financial_authorizations`, `delivery_services`, ventes/véhicules/factures/paiements/GED.
- Permissions principales : `delivery.view`, `schedule`, `prepare`, `checklist.view/manage`, `documents.view`, `signature.capture`, `complete`, `cancel`, `financial_override.authorize`.

## Parcours réel validé

1. Une vente impayée confirmée n’est pas éligible à la préparation.
2. Après émission et paiement intégral de la facture, la vente passe à préparation puis prête à livrer.
3. La page livraison annonce un candidat et préremplit vente et responsable autorisé.
4. La livraison `LIV-20261114-219145` est créée avec un instant prévu.
5. Au démarrage, quatre catégories et dix contrôles obligatoires sont figés.
6. Les dix contrôles sont tracés avec utilisateur et date.
7. Transitions observées : `planned → preparing → quality_control → ready → delivered`.
8. La finalisation met à jour vente, véhicule, kilométrage et PV.
9. La finalisation sans dessin dans le canvas est acceptée si nom, kilométrage et consentement sont fournis.

## Résultats

| Sujet | Statut | Observation |
|---|---|---|
| Candidats | CONFORME | uniquement vente prête, financièrement autorisée |
| Responsable | CONFORME | utilisateur actif habilité proposé |
| Situation financière soldée | CONFORME | total, payé et solde concordants |
| Checklist figée | CONFORME | 10 contrôles, progression et auteur persistés |
| Double action UI | CONFORME | contrôles désactivés durant mutation |
| Documents remis | PARTIELLE | remise physique validée, ajout de fichier non testé |
| PV PDF/GED | CONFORME AVEC RÉSERVE | hash vérifié, contenu extrait ; preuve de signature ambiguë |
| Heure du rendez-vous | DÉFECTUEUSE | 15:00 saisi, 14:00 affiché (`ANO-LIV-001`) |
| Signature | À ARBITRER | canvas présent mais facultatif (`ANO-LIV-002`) |
| Autorisation avec solde | CONFORME MySQL | 8/8 scénarios concurrentiels réussis |
| Vente annulée / rejeu | CONFORME MySQL | refus, rollback et absence de double consommation validés |
| Inter-agence réel | NON TESTÉE complète | suite RBAC bloquée par 2FA de fixture |

## Protection critique

Le backend verrouille livraison, vente et véhicule, contrôle le statut, le gate financier, la checklist, le périmètre et l’idempotence. Les suites MySQL checklist (9/9), autorisations (8/8), services (6/6) et annulation de vente (1/1 top-level) confirment les garanties concurrentes.

Le PV réel contient les dix contrôles, le kilométrage et le rendez-vous persisté à 14:00. Il déclare une signature enregistrée et un hash alors que `signature_data` est NULL : ce fait confirme `ANO-LIV-002`. Verdict final : **NON CONFORME PARTIELLE** à cause de `ANO-LIV-001`, avec réserve juridique sur la signature.
