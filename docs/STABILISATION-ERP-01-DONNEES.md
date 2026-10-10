# STABILISATION-ERP-01 — Catalogue des données de recette

Toutes les données sont fictives, préfixées `REC01-`, sans compte ni donnée de production. Elles seront créées uniquement dans une base MySQL 8.4 jetable.

## Ordre d’initialisation

1. Bootstrap/build courant, baseline puis migrations jusqu’à 079; seed système et SUPER_ADMIN.
2. Groupe, deux concessions (`REC01-C01/C02`), deux agences par concession, départements, identité et paramètres.
3. Rôles dynamiques, permissions/scopes, 16 profils et utilisateurs homologues multi-agences.
4. Employés, liens utilisateurs, contrats, salaires, types de congé/prime.
5. Marques, modèles, versions, emplacements, baies, techniciens, tarifs, catégories.
6. Prospects/clients particuliers et entreprises, contacts et associations.
7. Véhicules commerciaux VN/VO et véhicules extérieurs atelier.
8. Fournisseurs, pièces, stocks, caisses/comptes, catégories Treasury.
9. Budgets, enveloppes et réservations de liquidité.
10. Données transactionnelles créées par les campagnes, jamais injectées dans un état incohérent.

## Jeu minimal cohérent

| Famille | Identifiants / variantes |
|---|---|
| Organisation | 2 concessions × 2 agences; une agence inactive; départements Commerce, Finance, SAV, RH |
| Utilisateurs | `REC01-U-ADMIN`, 15 métiers, doubles A2/C2, un inactif, un rôle inactif |
| Prospects | particulier neuf, particulier doublon téléphone, entreprise flotte, sans commercial, perdu |
| Clients | particulier complet, entreprise avec contacts, homonymes, autre agence/concession |
| Véhicules | VN/VO disponibles, réservé, vendu, livré, sans/avec photos, prix minimum, coûts complets, extérieur non commercial |
| Showroom | visite attente/affectée/terminée; essais futurs adjacents, chevauchants, actifs, terminés |
| Pièces | stock normal, seuil bas, zéro, réservé; deux emplacements; deux fournisseurs |
| Atelier | deux baies, trois techniciens, indisponibilité, tarif T1–T4, OR nominal/garantie/abandon |
| Finance | facture brouillon/émise/partielle/payée/annulée, avoir, remboursement; comptes caisse/banque |
| Fournisseurs | commande partielle/reçue, facture, avoir, dette partielle |
| RH | CDI/CDD, congé, prime, rémunération partielle/finale |
| Budgets | brouillon/soumis/approuvé/épuisé; dépense rejetée/approuvée/décaissée |
| GED | PDF/PNG/JPEG valides, extension interdite, mauvais magic byte, deux versions |
| Documents | logo/cachet/signature actifs puis remplacés; snapshots historiques |
| Notifications | nominative, agence, lue/non lue/archivée |

## Cas limites et concurrence

- Deux clients sur le même véhicule; deux essais sur même véhicule/conseiller; deux réceptions d’une commande; deux consommations de la dernière pièce; deux paiements du même solde; deux décaissements dépassant le disponible; deux rapprochements d’une ligne.
- Chaînes vides, zéro autorisé, montants négatifs, dates passées/futures, DST/fuseau Africa/Brazzaville, XAF sans décimales d’affichage mais précision SQL contrôlée.
- IDs d’autre agence/concession, ressource inactive/archivée, fichier trop gros, doublon d’idempotence avec payload identique et différent.

## Conservation et remise à zéro

Un snapshot logique est conservé après campagnes 01–04. Les campagnes 05–13 enchaînent sur le même jeu pour préserver les liens transversaux. La campagne 14 concurrence utilise un clone jetable dédié. Toute remise à zéro détruit uniquement le conteneur et volume explicitement créés pour `REC01`; jamais `lca-mysql-1` ni ses volumes.
