# AUDIT-ERP-03 — Matrice RBAC Ventes

Le contrôle est dynamique : permission + portée, sans équivalence implicite fondée sur le nom du rôle.

| Action | Permission | Contraintes principales |
|---|---|---|
| Lister/consulter | `sales.view` | Filtrage OWN/AGENCY/CONCESSION/ALL; données paiement masquées sans permission financière. |
| Créer | `sales.create` | Agence cible autorisée; commercial connecté imposé avec scope OWN. |
| Affecter un commercial | `sales.assign` | Interdit avec scope OWN; candidat actif, autorisé, même agence, non Super Admin système. |
| Appliquer une remise directe | `sales.discount.manage` | Le backend contrôle aussi marge et prix minimum. |
| Déroger au régime fiscal | `sales.tax.override` | Pour vente directe hors régime/mode par défaut. |
| Modifier | `sales.update` | Vente livrée/annulée protégée pour les données concernées. |
| Faire avancer le workflow | `sales.confirm` | Transition autorisée + gardes financières selon l’étape. |
| Annuler | `sales.cancel` | Motif obligatoire, absence de paiement confirmé et de livraison engagée. |
| Créer une facture | `billing.invoice.create` | Vente non annulée, cohérence agence/client/vente, protection des doublons. |
| Voir/préparer/planifier une livraison | `delivery.view`, `delivery.prepare`, `delivery.schedule` | Vente éligible et périmètre autorisé. |
| Dérogation financière | `delivery.financial_override.authorize` | Scope OWN refusé; vente annulée refusée; trace d’audit. |
| Finaliser une livraison | `delivery.complete` | Checklist, documents, signature et garde financière. |

## Conclusions

- Les routes ventes appliquent leur permission au niveau serveur.
- Les portées agence/concession sont traduites en clauses SQL, pas seulement en filtrage UI.
- Le frontend conditionne les actions pour l’ergonomie, sans remplacer les contrôles API.
- La correction d’autorisation financière ferme maintenant le cas post-annulation aux deux niveaux.
- Le rôle système Super Admin est exclu des candidats commerciaux opérationnels.
