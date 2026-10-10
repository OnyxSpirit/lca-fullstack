# FIN-09 — Matrice de recette globale

Légende : **RÉUSSI** signifie qu’une preuve a été exécutée pendant FIN-09. Les preuves statiques vérifient les contrats de code mais ne remplacent pas une recette navigateur ou une transaction MySQL.

| ID | Préconditions / données / étapes | Attendu | Obtenu / preuve | Verdict |
|---|---|---|---|---|
| FIN09-01 | Base MySQL 8.4 vide, bootstrap canonique | Niveau 076 | Baseline 071 puis migrations 072–076 appliquées | RÉUSSI |
| FIN09-02 | Empreintes et fichiers 072–076 | Historiques intacts | Aucun diff sur les migrations | RÉUSSI |
| FIN09-03 | Seed frais | Permissions Super Admin dynamiques | Jointure rôle/permissions non vide | RÉUSSI |
| FIN09-04 | Tests RBAC des lots | Permissions dynamiques | Suites statiques FIN-01–08 réussies | RÉUSSI |
| FIN09-05 | Scopes agence | Pas d’accès croisé | Prédicats et tests ciblés réussis | RÉUSSI |
| FIN09-06 | Scopes concession | Pas d’accès inter-concession | Contrats statiques réussis; pas de scénario API croisé FIN-09 | NON EXÉCUTÉ |
| FIN09-07 | XAF et devises séparées | Aucun total inter-devise | Tests FIN-06 et API MySQL reporting réussis | RÉUSSI |
| FIN09-08 | Facture client | Pas d’encaissement implicite | Test statique FIN-01/Billing réussi | RÉUSSI |
| FIN09-09 | Encaissement client | Mouvement Treasury explicite | Contrats d’intégration existants réussis statiquement | RÉUSSI |
| FIN09-10 | Remboursement client | Opérations distinctes non dédupliquées abusivement | Audit du code effectué; scénario MySQL non rejoué | NON EXÉCUTÉ |
| FIN09-11 | Contrepassation | Neutralisation append-only | Tests Treasury statiques réussis | RÉUSSI |
| FIN09-12 | Budget actif | Approbation distincte de la liquidité | Test FIN-02 réussi | RÉUSSI |
| FIN09-13 | Dépense | Rejetée non engagée | Test FIN-02 réussi | RÉUSSI |
| FIN09-14 | Engagement | Déduit de l’enveloppe, pas du cash | Tests FIN-02/03 réussis | RÉUSSI |
| FIN09-15 | Compte 5 M, réservation 4 M | Réservation sans mouvement | MySQL FIN-09 : 201, compte inchangé | RÉUSSI |
| FIN09-16 | Réservation liée | Consommation explicite | Contrat FIN-03 réussi; parcours MySQL non rejoué | RÉUSSI |
| FIN09-17 | Décaissement budgétaire | Mouvement explicite | Test d’intégration statique réussi | RÉUSSI |
| FIN09-18 | 5 M, 4 M réservés, sortie libre 3 M | Refus 409 | MySQL FIN-09 : refus « liquidités réservées » | RÉUSSI |
| FIN09-19 | Rémunération validée | Distincte du paiement | Test FIN-04 réussi | RÉUSSI |
| FIN09-20 | Prime | Pas de paie automatique | Test FIN-04 réussi | RÉUSSI |
| FIN09-21 | Paiement RH partiel | Reste exact | Contrat statique réussi; MySQL non rejoué | RÉUSSI |
| FIN09-22 | Paiement RH final | Pas de double mouvement | Contrat statique réussi; MySQL non rejoué | RÉUSSI |
| FIN09-23 | Facture fournisseur validée | Dette sans décaissement | Test FIN-05 réussi | RÉUSSI |
| FIN09-24 | Avoir fournisseur | Dette réduite sans entrée Treasury | Test FIN-05 réussi | RÉUSSI |
| FIN09-25 | Paiement fournisseur partiel | Solde restant | Test FIN-05 réussi; MySQL non rejoué | RÉUSSI |
| FIN09-26 | Paiement fournisseur final | Dette soldée | Test FIN-05 réussi; MySQL non rejoué | RÉUSSI |
| FIN09-27 | Commande/réception/facture | Écarts visibles | Test FIN-05 réussi | RÉUSSI |
| FIN09-28 | Mouvements POSTED | Solde dérivé | MySQL FIN-09 : solde final 4,2 M | RÉUSSI |
| FIN09-29 | `asOf` historique | Exclut les mouvements postérieurs | Test FIN-06 réussi | RÉUSSI |
| FIN09-30 | Transfert interne | Deux jambes, neutralité globale | Test Treasury réussi | RÉUSSI |
| FIN09-31 | API FIN-06 | Sections et devises | MySQL FIN-06 réussi | RÉUSSI |
| FIN09-32 | Export FIN-06 | BOM, CSV sécurisé, mêmes filtres | MySQL FIN-06 réussi | RÉUSSI |
| FIN09-33 | CSV bancaire | Aperçu puis validation | MySQL FIN-07 réussi | RÉUSSI |
| FIN09-34 | Deux candidats | Ambiguïté sans choix automatique | MySQL FIN-07 réussi | RÉUSSI |
| FIN09-35 | Rapprochement actif | Annulation motivée | MySQL FIN-07 réussi | RÉUSSI |
| FIN09-36 | Deux paiements fournisseur simultanés | Un seul effet | Recette FIN-05 antérieure documentée; non rejouée FIN-09 | NON EXÉCUTÉ |
| FIN09-37 | Deux paiements RH simultanés | Aucun double paiement | Recette FIN-04 antérieure documentée; non rejouée FIN-09 | NON EXÉCUTÉ |
| FIN09-38 | Deux sorties de 800 k pour 1 M libre | Un seul succès | MySQL FIN-09 : statuts 201/409 | RÉUSSI |
| FIN09-39 | Deux rapprochements même ligne | Un seul gagnant | MySQL FIN-07 : 201/409 | RÉUSSI |
| FIN09-40 | Endpoint rémunérations sans permission | 403 | Contrats RBAC réussis; appel direct non rejoué | NON EXÉCUTÉ |
| FIN09-41 | Endpoint bancaire hors permission | 403 | Contrats RBAC réussis; appel direct non rejoué | NON EXÉCUTÉ |
| FIN09-42 | Export sans permission | Refus serveur | Tests FIN-01/06/07 statiques réussis | RÉUSSI |
| FIN09-43 | Mutations sensibles | Audit centralisé | Test historique corrigé sur `writeAudit`, réussi | RÉUSSI |
| FIN09-44 | Modale partagée | Focus, Escape, ARIA | Test FIN-08 statique réussi; navigateur absent | RÉUSSI |
| FIN09-45 | Filtres financiers | Paramètres effectifs | Tests FIN-08/06 réussis; reset UX reste ouvert | RÉUSSI |
| FIN09-46 | Navigation financière | Onglets conditionnels | Test FIN-08 réussi | RÉUSSI |
| FIN09-47 | 1440/1280/1024/768 | Aucun masquage essentiel | Aucun navigateur exécuté | NON EXÉCUTÉ |
| FIN09-48 | Parcours A–F dans navigateur | Fonctionnel de bout en bout | Aucun navigateur exécuté | NON EXÉCUTÉ |
| FIN09-49 | Sources et agrégats | Aucun double comptage | Tests FIN-05/06/07 réussis | RÉUSSI |
| FIN09-50 | Suites FIN-01–08 | Aucune régression ciblée | 10 suites backend ciblées et 10 frontend ciblées après correction des deux assertions obsolètes | RÉUSSI |

## Protocole navigateur manuel restant

Sur une base jetable et avec des comptes de test : exécuter les parcours A à F à 1440, 1280, 1024 et 768 px ; contrôler focus initial, cycle `Tab`, `Escape`, restitution du focus, désactivation durant mutation, filtres/réinitialisation, téléchargements, erreurs 403/409 et débordements horizontaux. Toute écriture doit être rapprochée aux mouvements et audits de la base jetable.

