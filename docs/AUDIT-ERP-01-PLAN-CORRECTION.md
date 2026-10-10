# AUDIT-ERP-01 — Plan de correction recommandé

Ce document est un plan uniquement. Aucune action ci-dessous n'a été appliquée.

## Ordre proposé

### 1. Figer le contrat financier (P1)

Fichiers pressentis : `dashboard.routes.ts`, services partagés Reporting/Billing, tests Dashboard/Reporting.

- Définir les statuts de facture contribuant au CA; recommandation minimale : exclure `draft` et `cancelled`, comme le Reporting.
- Décider la temporalité des avoirs : rattachement à facture ou mouvement à date d'émission. Documenter HT/TTC et « facturé » vs « encaissé ».
- Appliquer aux cartes, semaine et tendance la même fonction/requête.
- Préserver : scopes RBAC, TTC actuel si validé, remboursements séparés du CA, forme JSON.
- Non-régression : brouillon/émise/payée/annulée; avoir M1/M2; scopes; égalité Dashboard/Reporting sur période identique.

### 2. Corriger la marge (P1)

Fichiers : `dashboard.routes.ts`, idéalement agrégateur partagé avec `report.routes.ts`.

- Ajouter le contrat de statuts actifs déjà utilisé par ventes/Reporting.
- Préserver le snapshot historique et le fallback explicitement « indicatif ».
- Tests : tous statuts, vente multi-lignes, snapshot nul/non nul, annulation, permissions financières.

### 3. Rendre les périodes exactes (P1/P2)

Fichiers : `dashboard.routes.ts`, tests domaine.

- Comparer deux semaines lundi-à-lundi; ne plus passer zéro en dur.
- Ajouter une borne haute exclusive aux périodes courantes.
- Produire sept jours et six mois, y compris les buckets à zéro.
- Préserver : calendrier métier lundi, formats `YYYY-MM-DD`/`YYYY-MM` et `deltaPercent=null` quand le précédent vaut zéro.
- Tests : quatre combinaisons vide/plein, changement mois/année, dates futures, timezone validée.

### 4. Fiabiliser les widgets opérationnels (P2)

Fichiers : `DashboardPage.tsx`, hooks/services réparations et livraisons ou endpoints dédiés.

- Filtrer OR sur le même ensemble actif que `overview.workshop`.
- Définir si le widget livraison signifie « prévues », « en préparation » ou les deux; filtrer et trier en conséquence.
- Préserver : permissions `service.order.view`/`delivery.view`, navigation et pagination des pages métier.
- Tests : chaque statut, dates passée/future, agence et OWN.

### 5. Corriger la sémantique frontend (P2)

Fichier : `DashboardPage.tsx` et composants partagés.

- Couleur CA selon signe; libellé ventes aligné au nombre de véhicules.
- Afficher un état d'erreur distinct et des états vides utiles.
- Remplacer les cartes cliquables par liens/boutons sémantiques.
- Aligner la permission d'affichage des graphiques avec le contrat retenu.
- Préserver : variation inconnue `—`, masquage par permission, devise FCFA.
- Tests : null/0/positif/négatif, 401/403/500, clavier et lecteur d'écran.

### 6. Responsive et lisibilité (P2/P3)

Fichiers : Dashboard et layout/header partagés.

- Éviter quatre cartes dans l'espace réduit à 1024 avec sidebar; autoriser la contraction/retour à la ligne du montant.
- Supprimer le débordement horizontal à 375; rendre le titre/agence flexibles.
- Clarifier l'échelle `kXAF`.
- Tests visuels : 1440, 1024, 768, 375 px, zoom 200 %, montants longs.

### 7. Renforcer la validation RBAC et la robustesse des tests

Fichiers : tests Dashboard/CRM/recherche/frontend seulement après autorisation d'une mission de correction.

- Ajouter la matrice multi-concession/multi-agence/OWN.
- Remplacer les assertions frontend sensibles aux espaces par assertions comportementales/AST.
- Préserver le refus conservateur des scopes OWN non applicables et l'intersection Dashboard/métier.

## Dépendances intermodules

- Les étapes 1–3 doivent être décidées avec Billing, Trésorerie et Reporting avant modification : elles peuvent changer les chiffres historiques et les exports.
- L'étape 4 dépend des contrats de statut Atelier et Livraison.
- Toute centralisation de requête doit conserver les alias et colonnes propriétaire nécessaires aux scopes.
- La timezone doit être validée au niveau connexion MySQL/API, pas corrigée isolément dans l'affichage.

## Critères de sortie

1. Dashboard et Reporting donnent le même CA/marge à définition, période et scope identiques.
2. Aucun brouillon/annulation ne contribue aux KPI validés.
3. La comparaison hebdomadaire utilise réellement la semaine précédente.
4. Les widgets ne contiennent aucun statut contraire à leur titre.
5. Les quatre résolutions n'ont ni troncature critique ni débordement horizontal.
6. Matrice RBAC verte et aucun compteur hors périmètre.
7. Tous les tests ciblés passent sans fragilité de formatage.
