# Rapport de restructuration Stock, CRM et pro forma

## 1. Synthèse

Le lot intègre le référentiel technique existant au module Stock, conserve la séparation entre profils de version et unités VIN, ajoute le démarrage d'une pro forma depuis une fiche véhicule, rend le pipeline CRM libre côté interface et retire les dépendances d'étape de l'essai et de la vente. Aucune migration ni modification d'une base métier n'a été réalisée.

## 2. Architecture finale

- `vehicles` reste l'autorité des unités physiques et du stock réel.
- `commercial_models` reste le profil technique partagé 1:1 de `versions`.
- `commercial_model_images` et `vehicle_images` restent deux galeries distinctes.
- `vehicle-technical-profile.ts` centralise la résolution profil/version/unité pour la consultation et les snapshots pro forma.
- Le moteur pro forma, son idempotence, ses calculs, ses snapshots, son PDF et son archivage GED existants sont réutilisés.
- La matrice CRM serveur existante reste l'autorité des transitions libres et du verrou terminal.

## 3. Fichiers modifiés

### Backend

- `src/modules/vehicles/vehicle-technical-profile.ts` (nouveau)
- `src/modules/vehicles/vehicle.routes.ts`
- `src/modules/vehicles/commercial-catalog.routes.ts`
- `src/modules/proformas/proforma.routes.ts`
- `src/modules/showroom/showroom-test-drive.ts`
- `src/modules/sales/sale.service.ts`
- tests `commercial-final-workflow`, `commercial-residuals`, `stock-crm-proforma-restructure`

### Frontend

- `src/modules/vehicles/VehiclesListPage.tsx`
- `src/modules/vehicles/CommercialCatalogPage.tsx`
- `src/modules/vehicles/NewVehicleModal.tsx`
- `src/modules/vehicles/VehicleDetailPage.tsx`
- `src/modules/proformas/ProformasPage.tsx`
- `src/modules/crm/CrmPage.tsx`
- `src/api/erpHooks.ts`, `src/App.tsx`, `src/components/layout/Sidebar.tsx`
- tests `commercial-workflow`, `stock-crm-proforma-restructure`

## 4. Stock et référentiel technique

Le Stock possède désormais deux vues explicites : « Véhicules en stock » et « Modèles sur commande ». La seconde réutilise les profils `commercial_models` sans créer de ligne `vehicles`, donc sans fausser compteurs, réservations ou rapports. « Catalogue commercial » a été retiré de la navigation principale et `/vehicles/catalog` redirige vers `/vehicles`.

Le formulaire d'entrée accepte un `versionId` normalisé, préremplit les valeurs communes disponibles et conserve la saisie historique libre lorsqu'aucune référence n'existe. Les recherches de référence libre neutralisent les différences de casse et d'espaces. Les photographies restent facultatives et sont présentées comme photographies individuelles.

L'éditeur du profil commun couvre les champs techniques de la migration 103 : motorisation, puissances, couple, accélération, autonomies, places, motricité, dimensions, capteurs, refroidissement batterie, suspension, freins ventilés, écran/tableau de bord, contrôle distant, direction, garantie, disponibilité, délai et caractéristiques supplémentaires.

La fiche véhicule affiche le profil commun, avertit de son caractère partagé, conserve les véhicules historiques sans profil et distingue la galerie commune de la galerie individuelle.

## 5. Pro formas

La fiche véhicule expose « Générer une pro forma » lorsque `proformas.create` est accordée. L'éditeur s'ouvre avec la première ligne déjà sélectionnée et conserve l'ajout d'autres véhicules physiques ou modèles sur commande.

Pour une ligne véhicule physique, le serveur verrouille et recharge le véhicule, contrôle `vehicles.view` et son scope, puis résout marque, modèle, version, VIN, profil technique, équipements, disponibilité, garantie, prix et images. Les valeurs techniques arbitraires du frontend ne sont pas retenues comme autorité. Les données sont écrites dans les snapshots existants ; l'émission et le PDF historique continuent donc d'utiliser le mécanisme immuable existant.

## 6. CRM et indépendance des opérations

La fiche prospect propose toutes les destinations tant que l'étape n'est ni Gagné ni Perdu. Le Kanban permet le glisser-déposer et fournit aussi un sélecteur accessible. Les cartes terminales ne sont pas déplaçables ; le passage à Perdu conserve le motif et la permission dédiés.

Un essai conserve son vrai rendez-vous comme précondition opérationnelle existante, mais ne dépend plus de la colonne « Rendez-vous fixé » et ne change plus automatiquement l'étape CRM.

La création de vente ne requiert plus Offre/Négociation. Une opportunité Perdue est explicitement refusée. La vente, la réservation du véhicule, l'acceptation du devis et le passage à Gagné restent dans la même transaction. Une opportunité déjà Gagnée n'est pas rouverte et aucune transition contradictoire n'est créée.

Les rendez-vous et le chemin de devis flexible étaient déjà indépendants de l'étape dans l'existant ; ils ont été préservés. Une pro forma n'effectue aucun changement d'étape.

## 7. Permissions et scopes

- L'édition du profil commun reste sous `vehicles.catalog.manage`.
- Sa consultation reste sous `vehicles.catalog.view`.
- La pro forma depuis véhicule exige `proformas.create` au niveau route/UI et `vehicles.view` avec vérification AGENCY/CONCESSION/GLOBAL sur chaque unité physique.
- Les coûts individuels restent derrière les protections financières existantes.
- Le pipeline utilise `crm.pipeline.advance`; Perdu conserve `crm.prospect.lose` et son motif.
- Aucun nom de rôle n'a été ajouté dans une autorisation.

## 8. Migrations

Aucune migration créée. La migration 103 et les tables existantes suffisent. Aucune base métier, donnée historique ou volume Docker n'a été modifié.

## 9. Anomalies corrigées

- Profil technique incomplet dans le contrat TypeScript et dans l'éditeur.
- Absence de résolution serveur des profils et images pour une ligne pro forma physique.
- Valeurs techniques frontend précédemment acceptables comme snapshot d'une ligne physique.
- Catalogue autonome dans la navigation.
- Formulaire d'entrée sans rattachement normalisé explicite à une version.
- Sélecteur CRM séquentiel et Kanban non déplaçable.
- Essai conditionné par l'étape et déplacement automatique vers Essai routier.
- Vente conditionnée par Offre/Négociation.

## 10. Résultats des tests

| Commande / scénario | Résultat |
|---|---|
| `cd backend-node && npm run lint` | Réussi, 0 erreur TypeScript |
| `cd backend-node && npm run build` | Réussi |
| Tests backend ciblés restructuration + matrice CRM | 3 fichiers réussis, 0 échec |
| Test backend `commercial-residuals` isolé | 17/17 réussis |
| `cd frontend && npm run lint` | Réussi, 0 erreur TypeScript |
| `cd frontend && npm run build` | Réussi, 2521 modules transformés |
| Suite frontend complète (premier passage) | 988/989 ; l'unique échec était une assertion historique imposant l'ancien pipeline séquentiel |
| Relance ciblée après réalignement du test | 12/12 réussis |
| `git diff --check` | Réussi, aucune erreur |

La première suite backend globale a rencontré des échecs dans des tests HTTP/intégration dépendant de services locaux et a été interrompue avant son récapitulatif complet. Les tests directement affectés ont ensuite été exécutés isolément et réussissent. Aucun test MySQL 8.4 isolé n'a été exécuté dans ce lot, faute d'instance jetable préparée ; aucune base existante n'a été utilisée comme substitut.

## 11. Tests navigateur

Aucune recette navigateur complète n'a été déclarée validée : aucune session applicative multi-profils et aucune base isolée n'étaient préparées. Les scénarios manuels ci-dessous restent obligatoires avant déploiement.

## 12. Réserves et risques résiduels

- Vérifier sur MySQL 8.4 réel les agrégations JSON, verrous et snapshots multi-images.
- Vérifier le rendu PDF multipage avec plusieurs véhicules et plusieurs photographies.
- Vérifier visuellement le formulaire Stock sur petits écrans et avec les profils RBAC OWN/AGENCY/CONCESSION/GLOBAL.
- La présence d'un rendez-vous demeure une règle opérationnelle de l'essai ; seule l'étape CRM a été découplée.
- L'éditeur des caractéristiques supplémentaires utilise un objet JSON pour préserver le contrat souple existant ; une taxonomie métier future pourra fournir des champs dédiés.

## 13. Procédure de recette fonctionnelle

1. Avec `vehicles.create`, créer une unité minimale sans photo puis l'enrichir.
2. Avec `vehicles.catalog.manage`, créer le profil complet d'une version et sa galerie.
3. Créer une seconde unité sur la même version et vérifier le préremplissage sans duplication.
4. Vérifier qu'un modèle sur commande apparaît sans modifier les KPI de stock.
5. Depuis une fiche, ouvrir la pro forma, choisir destinataire, ajouter un second véhicule, émettre, ouvrir le PDF et l'archive GED.
6. Modifier ensuite véhicule/profil/images et vérifier que le document émis ne change pas.
7. Pour chaque étape non terminale, tester avant, arrière, saut, Gagné et Perdu ; vérifier le refus depuis Gagné/Perdu.
8. Créer rendez-vous, essai, devis et pro forma depuis plusieurs étapes et vérifier l'absence de déplacement automatique.
9. Transformer un devis émis depuis Nouveau/Qualifié/Négociation : vente unique et passage atomique à Gagné.
10. Rejouer la requête et doubler le clic : aucune seconde vente. Tester Perdu : refus explicite.

## 14. Procédure de déploiement proposée (non exécutée)

1. Sauvegarder base, GED et téléversements selon la procédure d'exploitation.
2. Déployer backend et frontend construits depuis les sources validées.
3. Ne lancer aucune migration pour ce lot.
4. Vérifier les permissions dynamiques catalogue, Stock, CRM et pro forma.
5. Exécuter la recette de fumée Stock → pro forma → PDF/GED puis CRM → vente → Gagné.
6. Surveiller erreurs API, conflits 409, archivage GED et événements temps réel.
7. Conserver un retour applicatif vers l'artefact précédent ; aucune transformation de données n'est requise.

## 15. Verdict

Le code du lot est intégré et compilable, avec les tests ciblés réussis. Le verdict est **techniquement prêt pour recette sur environnement isolé**, mais pas « validé production » tant que les tests MySQL 8.4, PDF/GED et la recette navigateur multi-profils n'ont pas été exécutés.
