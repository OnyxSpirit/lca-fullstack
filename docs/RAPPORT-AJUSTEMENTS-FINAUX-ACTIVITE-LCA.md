# Rapport d'ajustements finaux — Activité utilisateurs

Date de qualification : 14 octobre 2026  
Périmètre : présentation métier, confidentialité RBAC et PDF du module **Activité utilisateurs**.

## 1. Cause exacte

Deux causes indépendantes ont été identifiées :

- la présentation ajoutait une référence construite à partir de `entity_type` et `entity_id`, ce qui exposait des libellés techniques tels que `sale #5` ; les événements sans traduction explicite reprenaient aussi le nom interne de l'entité ;
- la divulgation des détails appliquait une liste `alwaysRestricted` avant l'évaluation RBAC. Elle masquait donc systématiquement certaines activités RH et documentaires, y compris lorsque l'utilisateur possédait la permission métier requise avec le scope `GLOBAL`.

La base actuelle confirme que le compte Super Administrateur possède bien les permissions nécessaires avec le scope `GLOBAL`. Le défaut était donc applicatif et non une absence de droits en base.

## 2. Éléments affectés

Les événements observés concernaient notamment : ventes, devis, signatures personnelles, cachets de service, documents et employés. Les libellés internes `user_signature`, `service_stamp` et `quotation`, ainsi que les références dérivées d'identifiants numériques, pouvaient apparaître dans les détails ou les PDF.

## 3. Corrections réalisées

- Suppression de toute référence métier fabriquée depuis `entityId`.
- Conservation des seules références fonctionnelles présentes dans les données (`saleNumber`, `quotationNumber`, `invoiceNumber`, `paymentNumber`, `orderNumber`, `reference`).
- Ajout de titres français pour les opérations de devis, bons de commande, signatures personnelles et cachets de service.
- Remplacement du fallback exposant l'entité interne par un intitulé métier générique.
- Traduction des modules `quotations` en **Devis** et `deliveries` en **Livraisons** dans les filtres.
- Remplacement de la liste de masquage absolu par une résolution permission/ressource : RH, GED, signature, cachet, devis, vente, budget, trésorerie et facturation.
- Application uniforme des scopes `GLOBAL`, `OWN`, `AGENCY` et `CONCESSION`, sans exception fondée sur le nom du rôle Super Admin.
- Conservation du nettoyage indépendant des clés sensibles (`password`, `token`, `secret`, `authorization`, `credential`, `cookie`, `hash`).
- Utilisation du titre métier comme référence d'en-tête de la fiche PDF individuelle.

## 4. Règles de confidentialité obtenues

- Une permission absente masque les détails.
- `GLOBAL` autorise les détails de la ressource.
- `OWN` exige que l'auteur de l'activité soit l'utilisateur courant.
- `AGENCY` exige la même agence.
- `CONCESSION` exige la même concession.
- Une activité sans ressource confidentielle identifiée reste consultable dans le périmètre général `activity.view`.
- Aucune règle ne teste le code ou le nom d'un rôle pour contourner ces contrôles.

## 5. Recette exécutée

### Tests automatisés ciblés

Commande directe Node sur quatre suites : **4 réussies, 0 échec**.

Les assertions couvrent :

- absence de référence technique et conservation d'une vraie référence de vente ;
- traductions signature/cachet/devis et fallback générique ;
- correspondance entre ressources et permissions métier ;
- scopes `GLOBAL`, `OWN`, `AGENCY`, `CONCESSION` et permission absente ;
- maintien de la sanitation des secrets ;
- absence de bypass Super Admin.

### Builds

- Backend TypeScript : réussi.
- Frontend Vite : réussi, 2 490 modules transformés.

### API réelle sur le port 3001

Le backend Docker était `healthy`. Des lectures authentifiées ont été faites sur des activités existantes, sans écriture en base :

| Ressource | Résultat détail | Titre métier | PDF |
|---|---:|---|---:|
| vente | non masqué | Création d'une vente automobile | 200 |
| employé | non masqué | Association d'un compte à un employé | 200 |
| signature personnelle | non masqué | Création d'une signature personnelle | 200 |
| cachet de service | non masqué | Désactivation d'un cachet de service | 200 |
| devis | non masqué | Création d'un devis | 200 |
| document | non masqué | Consultation d'un document | 200 |

Les présentations JSON et le texte extrait des six PDF ne contiennent aucun des motifs techniques recherchés (`Référence technique`, `sale #n`, `user_signature`, `service_stamp`, `quotation #n`, `Service Stamp`).

### Navigateur réel

Sur `http://127.0.0.1:3001/activity` :

- le détail RH est accessible au Super Administrateur sans message de confidentialité ;
- la vente affiche sa référence fonctionnelle `V-…` sous **Référence de vente** ;
- aucune référence numérique technique n'est affichée ;
- les titres Signature, Cachet et Devis sont en français.

## 6. Fichiers modifiés

- `backend-node/src/modules/activity/activity-presentation.ts`
- `backend-node/src/modules/activity/activity.routes.ts`
- `backend-node/test/activity-targeted-adjustments.test.ts`
- `docs/RAPPORT-AJUSTEMENTS-FINAUX-ACTIVITE-LCA.md`

## 7. Garanties et limites

- Aucune donnée MySQL n'a été modifiée par cette mission.
- Aucun volume, réseau ou conteneur MySQL n'a été modifié.
- Aucun commit, push, reset, restore, stash, clean ou changement de branche n'a été effectué.
- L'archive `livrables/LCA-ERP-LIVRAISON-FINALE.zip` n'a pas été modifiée ; son SHA-256 reste `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.
- Les contrôles de scopes ordinaires ont été validés par tests unitaires déterministes ; la recette dynamique a utilisé le compte Super Administrateur existant et uniquement des requêtes de lecture.

## 8. Verdict

**CONFORME pour le périmètre demandé.** Les identifiants techniques ciblés ont disparu des vues métier et des PDF, tandis que les détails autorisés sont désormais visibles selon les permissions et scopes réels. Les secrets et les restrictions des utilisateurs ordinaires restent protégés.
