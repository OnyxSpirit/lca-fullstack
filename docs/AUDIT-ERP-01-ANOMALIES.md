# AUDIT-ERP-01 — Registre des anomalies

## A01 — Comparaison hebdomadaire fictive

- **Statut / criticité : CONFIRMÉ — P1**
- Module/fichier/fonction : Dashboard API, `dashboard.routes.ts:32,35-36`, handler overview.
- Observé : `dashboardComparison(sommeCourante, 0)`; aucune semaine précédente n'est interrogée. L'UI affiche néanmoins « vs semaine précédente » (`DashboardPage.tsx:216`).
- Attendu : deux semaines complètes comparables.
- Preuve/cause : valeur précédente codée en dur à zéro; test de code et recette montrant `— vs semaine précédente`.
- Impact : tendance de pilotage fausse ou indéterminée.
- Correction minimale : agréger `[lundi-7, lundi[` et `[lundi, lundi+7[`, comparer les sommes.
- Tests : semaines pleine/vide dans les quatre combinaisons; passage d'année.
- Régression : fuseau, découpage lundi, forme de réponse.

## A02 — Brouillons inclus dans le CA Dashboard

- **CONFIRMÉ — P1**
- `dashboard.routes.ts:23,32-33`; comparaison `report.routes.ts:22`.
- Observé : seul `cancelled` est exclu; Reporting exclut `draft` et `cancelled`.
- Attendu : même définition du CA facturé validé, ou libellé explicite si définition volontairement différente.
- Cause/preuve : prédicats SQL divergents.
- Impact : CA et graphiques surévalués par des pièces non émises.
- Correction : centraliser les statuts comptabilisés et exclure `draft`.
- Tests : brouillon, émise, payée, annulée; Dashboard = Reporting à période/scope identiques.
- Risque : modification des chiffres historiques et attentes existantes.

## A03 — Marge incluant tous les statuts de vente

- **CONFIRMÉ — P1**
- `dashboard.routes.ts:25`; handler overview.
- Observé : aucun prédicat `s.status`; ventes/Reporting utilisent les quatre statuts actifs.
- Attendu : exclure annulée et tout statut non reconnu comme vente active.
- Preuve : SQL; divergence avec `dashboard.routes.ts:24` et `report.routes.ts:23-24`.
- Impact : marge fausse, potentiellement positive ou négative sur opérations annulées.
- Correction : réutiliser le contrat de statuts des ventes actives.
- Tests : un cas par statut, snapshot et fallback.
- Risque : séries historiques recalculées.

## A04 — Avoirs affectés à la date de facture

- **CONFIRMÉ — P1**
- `dashboard.routes.ts:23,32-33`; `report.routes.ts:29`.
- Observé : tout avoir issued/applied est soustrait à la facture, quelle que soit sa date; le reporting financier expose les avoirs par `cn.issue_date`.
- Attendu : convention comptable unique et documentée (révision de facture ou mouvement à date d'avoir).
- Preuve : sous-requête sans période contre filtre explicite de date.
- Impact : mois historiques instables et rapprochement impossible.
- Correction : décider le contrat comptable, puis mutualiser la requête.
- Tests : facture M1, avoir M2; partiel; changement de statut.
- Risque : impact transversal Reporting/Billing/export.

## A05 — Bornes supérieures absentes

- **CONFIRMÉ — P2**
- `dashboard.routes.ts:23-25,32-33`.
- Observé : périodes courantes utilisent une borne basse seulement.
- Attendu : intervalles fermés-ouverts explicites pour mois, semaine et fenêtre six mois.
- Preuve : absence de `< début période suivante`.
- Impact : documents futurs inclus, période partielle incomparable.
- Correction : ajouter les bornes hautes.
- Tests : minuit, fin de mois/année, dates futures.
- Risque : timezone/session SQL.

## A06 — Jours et mois sans données omis

- **CONFIRMÉ — P2**
- `dashboard.routes.ts:32-33`; `DashboardPage.tsx:62-64`.
- Observé : SQL ne retourne que les buckets présents; le graphique ne matérialise ni sept jours ni six mois complets.
- Attendu : axes calendaires stables avec zéros.
- Preuve : GROUP BY sur seules factures présentes.
- Impact : tendance visuelle trompeuse et comparaisons difficiles.
- Correction : compléter les buckets côté service.
- Tests : trous intermédiaires, aucune donnée.
- Risque : ordre/localisation des labels.

## A07 — Couleur positive forcée sur variation CA

- **CONFIRMÉ — P2**
- `DashboardPage.tsx:102-115`.
- Observé : classe `text-emerald-500` inconditionnelle.
- Attendu : négatif rouge, positif vert, inconnu neutre.
- Preuve : source frontend.
- Impact : baisse interprétée visuellement comme favorable.
- Correction : conditionner la classe au signe.
- Tests : positif, négatif, zéro, null.
- Risque : aucun calcul, seulement présentation.

## A08 — OR clôturés/annulés affichés « en cours »

- **CONFIRMÉ — P2**
- `DashboardPage.tsx:54,329-369`, hook `useRepairOrdersQuery`.
- Observé : requête sans statut; recette port 3001 : OR « Clôturé » et « Annulé » sous « actuellement sur les ponts ».
- Attendu : statuts actifs seulement.
- Cause : liste générique non filtrée.
- Impact : charge atelier fausse.
- Correction : filtre actif identique au KPI API ou endpoint dédié.
- Tests : actif/clôturé/annulé et ordre.
- Risque : contrat de pagination du hook.

## A09 — Livraison terminée affichée « prévue »

- **CONFIRMÉ — P2**
- `DashboardPage.tsx:54,371-410`, hook `useDeliveriesQuery`.
- Observé : requête vide; recette : `Livré & Signé` sous « prévues ».
- Attendu : planned futur/non daté et préparation/QC/prêt selon définition affichée.
- Cause : absence de filtre.
- Impact : planning remise client erroné.
- Correction : endpoint/filtre dédié cohérent avec l'API synthétique.
- Tests : chaque statut et date planifiée.
- Risque : différences entre « prévue » et « prête ».

## A10 — Libellé des ventes imprécis

- **CONFIRMÉ — P2**
- `dashboard.routes.ts:24`; `DashboardPage.tsx:119-133`.
- Observé : calcul de véhicules distincts vendus, libellé « Dossiers non annulés enregistrés ce mois ».
- Attendu : « Véhicules vendus ce mois » ou calcul de dossiers.
- Preuve : COUNT DISTINCT vehicle_id vs texte.
- Impact : mauvaise interprétation des ventes multi-véhicules.
- Correction : ajuster le libellé, sans changer le calcul si le KPI véhicule est voulu.
- Tests : vente multi-véhicules.
- Risque : terminologie métier.

## A11 — Erreur API confondue avec absence de données

- **CONFIRMÉ — P2**
- `DashboardPage.tsx:55,61,102-170`.
- Observé : seul `isLoading` est traité; erreur, permission nulle et absence deviennent `—`.
- Attendu : état d'erreur explicite avec relance.
- Preuve : aucune branche `isError`.
- Impact : panne silencieuse, décisions sur écran incomplet.
- Correction : état erreur global/sectionnel non intrusif.
- Tests : 401/403/500/réseau et retry.
- Risque : ne pas révéler une permission absente.

## A12 — Responsive 1024/375

- **CONFIRMÉ — P2**
- `DashboardPage.tsx:69-170` et layout applicatif.
- Observé : à 1024 le montant CA est tronqué; à 375 barre horizontale et titre cassé. 1440/768 utilisables.
- Attendu : aucun contenu financier tronqué ni scroll horizontal.
- Preuve : recette navigateur réelle port 3001.
- Correction : seuil de grille/typographie et contraintes `min-width`/overflow.
- Tests : captures 1440/1024/768/375, zoom 200 %.
- Risque : header et sidebar partagés.

## A13 — Cartes non accessibles au clavier

- **CONFIRMÉ — P2**
- `DashboardPage.tsx:102-165`.
- Observé : `div onClick` sans rôle, tabIndex ni touche clavier.
- Attendu : lien/bouton sémantique.
- Preuve : source et arbre d'accessibilité (cartes exposées comme texte, pas comme contrôles).
- Impact : navigation impossible au clavier/lecteur d'écran.
- Correction : élément sémantique conservant le style.
- Tests : Tab, Entrée, Espace et nom accessible.
- Risque : imbrication d'éléments interactifs.

## A14 — Fuseau SQL non contractualisé

- **PROBABLE — P2**
- `dashboard.routes.ts:23-33`; formatage UTC `DashboardPage.tsx:63-64`.
- Observé : `CURDATE/NOW` dépendent de la session MySQL; le frontend force UTC pour les libellés. Aucun réglage de session n'a été identifié dans le périmètre.
- Attendu : timezone métier unique documentée.
- Preuve manquante : valeur `@@session.time_zone` par environnement.
- Impact : bascule jour/semaine/mois décalée.
- Correction : fixer/convertir explicitement le fuseau après validation.
- Tests : minuit Brazzaville et DST d'autres déploiements.
- Risque : toutes les dates ERP.

## A15 — Contrat UI des graphiques incohérent avec l'API

- **PROBABLE — P3**
- `DashboardPage.tsx:53,172-252`; `dashboard.routes.ts:21-33`.
- Observé : UI conditionnée par `reporting.view`; données conditionnées par `billing.view`.
- Attendu : règle d'affichage alignée au contrat backend.
- Preuve : code; aucune fuite car le serveur filtre.
- Impact : graphique vide ou masqué malgré autorisation de données.
- Correction : décider la permission produit, aligner UI/API.
- Tests : reporting seul, billing seul, les deux.
- Risque : exposition fonctionnelle, pas de contournement serveur.

## Point à vérifier — Tests frontend fragiles

Les deux échecs de `dashboard-navigation-search-transversal.test.ts` portent sur des regex d'espacement alors que les appels existent. **À VÉRIFIER — P3** : confirmer que le test doit tester l'AST/comportement plutôt que le texte avant toute modification future.
