# Plan global de corrections — Comptabilité & Trésorerie

Ce plan constitue une séquence unique, ordonnée par risque et dépendances. Il ne crée pas six nouveaux lots.

## Principes

1. Préserver l'immuabilité des mouvements et écritures définitives.
2. Ne jamais modifier les migrations historiques 119–124 ; toute évolution de schéma est additive.
3. Conserver le RBAC dynamique et le contexte d'agence ; ne pas coder de noms de rôles.
4. Établir une base de recette jetable, documentée et migrée avant tout test d'écriture.
5. Une action UI ne doit afficher un succès qu'après confirmation API et invalidation des caches concernés.

## Séquence recommandée

### Étape 0 — Sécuriser la recette et les preuves

- Créer une base dédiée, isolée de `concession_erp`, avec propriétaire et politique de purge explicites.
- Appliquer les migrations par le runner officiel jusqu'à 124+ et archiver le statut.
- Installer/healthchecker Poppler et Tesseract `fra+eng` dans l'image backend.
- Remplacer les trois tests statiques périmés par des tests de contrat et d'interaction.
- **Anomalies :** AUDIT-CT-003, 015.
- **Sortie :** environnement autorisé pour les tests de persistance, rollback et concurrence.

### Étape 1 — Unifier la gouvernance des périodes

- Déprécier le changement direct `PATCH /accounting/periods/:id/status` ou le faire déléguer au moteur avancé.
- Faire passer toute fermeture par préparation + contrôles ; toute réouverture par motif et audit.
- Remplacer le dialogue natif par une modale contrôlée.
- Ajouter tests concurrence, période fermée, reprise, motif et journal d'audit.
- **Anomalies :** AUDIT-CT-001, 016.
- **Priorité :** première correction métier, car elle protège les écritures ultérieures.

### Étape 2 — Corriger la porte d'entrée RBAC et le changement d'agence

- Autoriser `/treasury/accounting` si l'utilisateur possède au moins une permission comptable affichable.
- Conserver le filtrage fin de chaque onglet et action.
- Resynchroniser l'onglet actif après changement d'agence et annuler/refetch les requêtes du contexte précédent.
- Aligner le bouton de validation d'import sur `validate_import` et exposer rejet/annulation selon permission.
- Tester Super Admin, comptable, limité, sans permission et multi-agences A/B.
- **Anomalies :** AUDIT-CT-004, 008, 011.

### Étape 3 — Raccorder les capacités déjà opérationnelles côté backend

- Paramétrage comptable : édition/activation et historique des comptes ; édition journaux et mappings.
- Contrôles : détail des anomalies d'une exécution.
- Banque : rejet/annulation de relevé et mouvements non rapprochés.
- Uniformiser erreurs, toasts, invalidations TanStack Query et doubles clics.
- **Anomalies :** AUDIT-CT-006 (détail), 007, 010, 012.

### Étape 4 — Livrer le rapprochement bancaire avancé de bout en bout

- Écran de pilotage, rapprochement groupé, allocations partielles, annulation de groupe et gestion des écarts.
- CRUD/version/validation des profils d'import ; sélection obligatoire d'un profil validé pour les formats non standards.
- Afficher les avertissements et la confiance d'extraction ; rendre explicite la validation humaine OCR.
- Aligner limites client/serveur (CSV 5, XLSX 10, PDF 15 Mo, ou politique unique documentée).
- Tests d'idempotence, surallocation, doublons, ambiguïté, multi-devise et scope agence.
- **Anomalies :** AUDIT-CT-002, 005, 009.

### Étape 5 — Finaliser ou maintenir explicitement bloquée la comptabilité avancée

- Raccorder préparation annuelle et report à nouveau sans permettre de comptabilisation tant que journal, contreparties et affectation du résultat ne sont pas validés.
- Exposer les modèles d'états et profils d'échange en lecture ; n'activer génération/validation qu'avec référentiel officiel autorisé.
- Spécifier produit/version/format Sage avant adaptateur.
- **Anomalies :** AUDIT-CT-006, 013.
- **Décision attendue :** critères métier externes signés ; sinon conserver l'étiquette « préparatoire ».

### Étape 6 — Finitions et non-régression globale

- Corriger l'extension `.xlsx` du dashboard.
- Rejouer le parcours Vente → Facture → Encaissement → Treasury → écriture → grand livre → balance → rapprochement, y compris annulation/contrepassation.
- Vérifier exports CSV/XLSX/PDF par contenu, MIME et ouverture.
- Exécuter suites frontend/backend complètes puis scénarios MySQL concurrents.
- **Anomalie :** AUDIT-CT-014 et clôture de toutes les autres.

## Matrice de dépendances

| Étape | Dépend de | Bloque |
|---|---|---|
| 0 Recette | — | toutes validations dynamiques |
| 1 Périodes | 0 | clôtures annuelles, recette moteur |
| 2 RBAC | 0 | recette UI multi-agences |
| 3 Raccordements | 2 | recette fonctionnelle complète |
| 4 Banque avancée | 0, 2, 3 | parcours financier transversal |
| 5 Avancée | 1, spécifications externes | verdict états/Sage |
| 6 Non-régression | 1–5 | livraison recette globale |

## Tests de non-régression minimaux

- Débit = crédit, deux lignes minimum, compte actif/imputable, période ouverte.
- Numérotation et idempotence sous appels concurrents.
- Source métier comptabilisée une seule fois ; retry sans doublon.
- Contrepassation unique et lien aller/retour.
- Solde Treasury par devise ; transferts exclus des produits/charges.
- Rapprochement sans surallocation, même compte/devise/sens, annulation libérant les allocations.
- Scopes GLOBAL/CONCESSION/AGENCY et changement d'agence en session.
- Tous les exports avec permission positive et 403 négatif.
- Aucun test d'écriture sur `concession_erp`.

## Migrations additives possibles

Aucune migration n'est requise pour les corrections UI et le workflow de délégation. Une migration additive ne serait justifiée que si la spécification retenue exige : versionnement des profils d'import, contraintes supplémentaires d'unicité d'allocation, ou métadonnées officielles des modèles d'états/Sage. Elle devra être numérotée après 124 et ne jamais réécrire 119–124.
