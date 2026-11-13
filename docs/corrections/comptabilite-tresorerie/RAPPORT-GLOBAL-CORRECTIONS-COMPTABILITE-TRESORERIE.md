# Rapport global de corrections — Comptabilité & Trésorerie

Date : 13 novembre 2026. Périmètre : anomalies AUDIT-CT-001 à AUDIT-CT-016. Aucun commit, push ou déploiement n'a été effectué. La base protégée `concession_erp` n'a subi aucune écriture.

## Résumé exécutif

Quatorze anomalies sont corrigées et validées par compilation, tests de contrat/non-régression et bootstrap MySQL isolé. AUDIT-CT-003 est partiellement validée : l'image reconstruite contient Poppler, Tesseract et `fra+eng`, mais aucun PDF bancaire image réel n'a été soumis à une extraction bout en bout. AUDIT-CT-013 reste une réserve fonctionnelle bloquée par l'absence de spécification Sage et de référentiel officiel validé. Verdict : **CORRECTIONS VALIDÉES AVEC RÉSERVES**.

## Environnement et protection des données

- Docker Compose : services MySQL, backend et frontend initialement sains.
- Base créée : `lca_compta_recette_isolee`, indépendante et explicitement dédiée à cette mission.
- Compte applicatif autorisé uniquement sur cette base pour la campagne.
- Bootstrap officiel : niveau 124 ; 54 migrations appliquées ; 0 en attente ; 0 avertissement ; 0 blocage.
- Image backend reconstruite localement, sans déploiement.
- OCR : `pdftotext`/`pdftoppm` 22.12.0, Tesseract 5.3.0, langues `eng`, `fra`, `osd`.

## Corrections réalisées

- Workflow unique de clôture : l'ancienne route délègue aux invariants avancés ; l'UI directe a été retirée ; motif de réouverture contrôlé.
- Garde comptable fondée sur l'ensemble des permissions et resynchronisation au changement d'agence.
- Rapprochement avancé : tableau de bord, allocations, groupes, annulation, écarts et mouvements non rapprochés.
- Profils bancaires : CRUD brouillon, validation/désactivation, sélection d'un profil validé et configuration filtrée.
- Limites client alignées : CSV 5 Mo, XLSX 10 Mo, PDF 15 Mo ; séparation import/validation RBAC.
- Contrôles, clôture annuelle, report à nouveau préparatoire, modèles d'états et profils d'échange raccordés.
- Gestion des comptes, journaux, liaisons et historique ajoutée.
- Erreurs de mutations remontées sans faux succès ; dialogue natif remplacé par une modale.
- Export dashboard corrigé en `.xlsx`.
- Tests de contrat périmés actualisés.
- Construction Docker accélérée par `COPY --chown`, évitant un `chown -R /app` coûteux découvert pendant la mission.

## Statut des anomalies

| ID | Gravité | Statut final | Preuve principale |
|---|---|---|---|
| CT-001 | P1 | CORRIGÉE ET VALIDÉE | route déléguée, UI contrôlée, tests backend/frontend |
| CT-002 | P1 | CORRIGÉE ET VALIDÉE | hooks et écrans groupes/allocations/écarts, build et tests |
| CT-003 | P1 | PARTIELLEMENT CORRIGÉE | image reproductible et binaires/langues validés ; PDF image réel non exécuté |
| CT-004 | P1 | CORRIGÉE ET VALIDÉE | garde multi-permissions et filtrage des onglets |
| CT-005 | P2 | CORRIGÉE ET VALIDÉE | service/routes/hooks/UI de profils, sélection validée |
| CT-006 | P2 | CORRIGÉE ET VALIDÉE | détail contrôles, préparation annuelle/report, consultations |
| CT-007 | P2 | CORRIGÉE ET VALIDÉE | édition/activation/historique des référentiels |
| CT-008 | P2 | CORRIGÉE ET VALIDÉE | permission de validation, rejet et annulation avec motif |
| CT-009 | P2 | CORRIGÉE ET VALIDÉE | limites différenciées et tests statiques |
| CT-010 | P2 | CORRIGÉE ET VALIDÉE | actions unitaires et liste non rapprochée consommées |
| CT-011 | P2 | CORRIGÉE ET VALIDÉE | effet de resynchronisation agence/permissions |
| CT-012 | P2 | CORRIGÉE ET VALIDÉE | erreurs centralisées, états d'attente et messages visibles |
| CT-013 | P2 | BLOQUÉE / RÉSERVE EXTERNE | aucune spécification Sage ni source réglementaire autorisée |
| CT-014 | P3 | CORRIGÉE ET VALIDÉE | extension `.xlsx` et contrat MIME |
| CT-015 | P3 | CORRIGÉE ET VALIDÉE | suites ciblées vertes |
| CT-016 | P3 | CORRIGÉE ET VALIDÉE | modale, minimum 10 caractères, erreur API |

## Nouvelle anomalie découverte

`NEW-CT-001` : la construction de l'image restait durablement bloquée sur `chown -R node:node /app`. Correction par ownership au moment des `COPY` et limitation du `chown` aux répertoires d'écriture. Reconstruction finale réussie en environ 51 secondes.

## Tests et résultats

- Frontend : 8 fichiers ciblés sur 8 réussis ; lint TypeScript réussi ; build Vite réussi (2 546 modules).
- Backend : 7 fichiers ciblés sur 7 réussis ; lint et build TypeScript réussis.
- MySQL : bootstrap officiel sur base vide, niveau 124, état `READY`, 54/54 migrations, aucun blocage.
- OCR : image reconstruite ; versions et langues confirmées. Extraction PDF textuel couverte par test automatisé ; extraction OCR d'un PDF image réel non exécutée.
- RBAC/multi-agences : contrats de garde, permission de validation et resynchronisation testés statiquement ; parcours navigateur avec deux comptes réels à faire manuellement.

## Décisions, réserves et risques résiduels

- Les migrations historiques 119 à 124 n'ont pas été modifiées par cette mission. Le fichier 124 était déjà présent non suivi au démarrage et a seulement été appliqué par le mécanisme officiel.
- Le report à nouveau et la clôture annuelle restent volontairement préparatoires et bloqués lorsque les paramètres métier manquent.
- Aucun adaptateur Sage ni état SYSCOHADA « officiel » n'est revendiqué.
- Les scénarios métiers destructifs complets (1↔N, N↔1, clôture réelle, multi-agences navigateur) sont reportés au guide manuel ; l'environnement isolé est prêt à les recevoir.
- Le logiciel n'est pas déclaré prêt pour la production.

## Verdict

**CORRECTIONS VALIDÉES AVEC RÉSERVES**

