# ERP-16 — Anomalies

## REC16-GAR-01

| Référence | Observation | Classement | Traitement |
|---|---|---|---|
| REC16-GAR-A01 | Le script initial interrogeait `/settings/brands`, route inexistante (404). | défaut du script de recette, pas du produit | remplacée par l'API officielle `/vehicle-references?agencyId=3` |
| REC16-GAR-A02 | La collecte PDF utilisait `/documents/business/repair_order/7/pdf`, route inexistante (404), après achèvement du parcours. | défaut du script de recette, pas du produit | remplacée par `/repair-orders/7/pdf`, puis vérifiée par un script en lecture seule |

Aucune anomalie fonctionnelle du cycle garantie n'a été démontrée. Le rejet prudent d'une relance complète après l'échec PDF a conduit à contrôler d'abord MySQL : aucun doublon, montants et états terminaux cohérents.

Le défaut historique du test GED Livraison reste distinct : l'assertion attend deux occurrences textuelles d'`archiveDelivery` alors que l'implémentation courante en contient une. Le nouveau contrôle GED Facture Atelier demeure vert.

## REC16-CONC

| Référence | Observation | Classement | Traitement |
|---|---|---|---|
| REC16-CONC-A01 | Le script traitait la liste paginée `/parts` comme un tableau. | script de recette | lecture de `items` ajoutée |
| REC16-CONC-A02 | La réponse de création de facture véhicule ne contient pas son statut ; le script n'avait donc pas émis la facture 22 avant paiement. | script de recette | relecture de la facture, émission et rejeu GED officiels |
| REC16-CONC-A03 | Tentative directe `planned → completed` sur l'intervention 6 refusée `409`. | précondition métier correctement appliquée | affectation et pointage officiels ajoutés |
| REC16-CONC-A04 | `app.test.ts` échoue au niveau du fichier avec le filtre ciblé sans exposer d'assertion détaillée. | réserve de harnais de test | suites spécifiques Billing, GED et Garantie exécutées séparément et vertes |

Aucune corruption, duplication financière, surencaissement ou stock négatif n'a été reproduit.

## Bloc navigateur, temps réel et PDF

| Référence | Observation | Classement | Traitement |
|---|---|---|---|
| REC16-UI-A01 | `/billing` affiche 0 facture en session Super Administrateur alors que Client 360, OR, API et MySQL exposent les factures. | anomalie UI de liste/scoping | réserve ouverte, détails et PDF restent accessibles |
| REC16-PDF-A01 | L'OR imprime `100 /000 km`. | défaut typographique mineur | à corriger dans le rendu documentaire |
| REC16-PDF-A02 | La ligne pièce de la facture Atelier présente un alignement/une quantité incomplets. | défaut visuel mineur | à corriger dans le gabarit |
| REC16-TEST-A01 | Plusieurs tests inspectent des chaînes de source anciennes (pageSize 25, anciens noms de variables/hooks, présence textuelle de SUPER_ADMIN/GED). | dette du harnais, non-régression réelle non contredite | réaligner les assertions sur les contrats fonctionnels |

La recette Socket.IO réelle, les contrôles API multi-profils et les deux builds sont verts.
