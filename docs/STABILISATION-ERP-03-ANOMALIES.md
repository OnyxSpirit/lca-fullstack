# STABILISATION-ERP-03 — Anomalies

## STAB03-NOTIF-001 — Événements CRM sans notification persistée

- Gravité : majeure fonctionnelle ; statut : OUVERTE.
- Reproduction : créer/affecter/modifier l'étape d'un prospect, ajouter activité/rendez-vous, puis lire MySQL `notifications`.
- Attendu : notification persistée au destinataire prévu.
- Observé : zéro ligne malgré 5 prospects et 26 activités liées ; aucun doublon car aucune notification.
- Cause probable à confirmer : la couche de notification filtre les destinataires non habilités à consulter les notifications.
- Correction : non appliquée avant décision sur la matrice RBAC.

## STAB03-RBAC-001 — COMMERCIAL ne peut pas lire ses notifications

- Gravité : majeure fonctionnelle ; statut : DÉCISION MÉTIER REQUISE.
- Observé : `/notifications` et `/notifications/unread-count` répondent 403, permission `notifications.view` absente du rôle dynamique créé en ERP-02.
- Correction : aucune attribution silencieuse ; mettre à jour la matrice validée puis le rôle via l'API officielle.

## STAB03-CUST-001 — Conversion/lien prospect-client non exposé

- Gravité : réserve de workflow ; statut : BLOQUÉE.
- Observé : modèles supportent `customer_id`, mais aucune route/action CRM de conversion ou liaison n'est disponible.
- Correction : décision métier/API requise ; aucun SQL direct.

## STAB03-ORG-001 — Affectation client inter-agence refusée à l'administrateur

- Gravité : information/contrat ; statut : VALIDÉ COMME CONTRÔLE.
- Observé : création d'un client pour un conseiller d'une autre agence refusée 403. Création par le propriétaire dans son agence réussie. Aucun contournement.

