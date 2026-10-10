# Checklist de livraison configurable

## Modèle

La configuration est commune à une concession. `delivery_checklist_categories` porte les étapes ordonnées et `delivery_checklist_items` leurs contrôles ordonnés, obligatoires ou facultatifs. Une catégorie ou un item déjà utilisé est désactivé, jamais supprimé. Les permissions de configuration sont `delivery.checklist.config.view` et `delivery.checklist.config.manage`; `OWN` et `AGENCY` sont refusés, `CONCESSION` reste borné à la concession de l'acteur et `GLOBAL` utilise le mécanisme RBAC canonique.

L'exécution opérationnelle conserve les permissions existantes `delivery.checklist.view` et `delivery.checklist.manage`, scopées par la livraison.

## Snapshot et progression

Le snapshot relationnel est créé lors du premier passage réel de `planned` à `preparing`, avec les catégories actives sélectionnées et leurs items actifs. La sélection propose toutes les catégories actives par défaut. Codes, libellés, descriptions, caractère obligatoire et ordres sont copiés dans `delivery_checklist_category_instances` et `delivery_checklist_item_instances`. Un retry de démarrage réutilise le snapshot existant; aucune modification ultérieure du catalogue ne le reconstruit.

Les états `NOT_STARTED`, `IN_PROGRESS` et `COMPLETED`, ainsi que la progression obligatoire, sont dérivés des items. Une mutation transmet seulement l'état complété; le backend renseigne `completed_by` et `completed_at`. Un item peut être rouvert avant la remise, puis toute mutation est refusée après `delivered` ou `cancelled`.

## Finalisation, PV et concurrence

La finalisation verrouille d'abord la livraison, puis ses instances. Elle exige un snapshot et tous les items obligatoires complétés. Les items facultatifs incomplets ne bloquent pas. Ce garde s'ajoute au contrôle financier des Lots 6 et 7 et ne crée aucune écriture Treasury.

Le PV lit exclusivement les noms et ordres snapshotés. Son archive GED officielle reste immuable selon le Lot 1A.

Le démarrage, les mutations et la finalisation utilisent l'ordre de verrouillage livraison puis instances. La lecture du catalogue pendant le snapshot utilise des verrous partagés; les mutations de configuration verrouillent catégorie puis items. Le réordonnancement verrouille la collection et utilise temporairement des positions hors plage avant d'écrire les positions finales uniques.

## Migration historique 062

La migration `062_configurable_delivery_checklists.sql` est additive. Elle initialise les quatre catégories et les dix items qui existaient déjà, sans inventer de nouvel item métier. Elle transforme les lignes historiques de `delivery_checklists` et `delivery_documents` en snapshots en recopiant strictement leur état, auteur et horodatage existants. Une livraison sans preuve historique ne reçoit aucun snapshot artificiel. Les anciennes tables restent disponibles pour la compatibilité et la traçabilité.

Sur une installation fraîche, le provisioning initial de la concession crée le même catalogue par défaut. Le seed système crée uniquement le rôle `SUPER_ADMIN`; celui-ci reçoit les deux permissions de configuration avec scope `GLOBAL` par le mécanisme existant.

Les événements d'audit couvrent création, modification, activation, désactivation, réordonnancement, création du snapshot et changement réel d'un item. Le realtime est émis après commit vers les agences de la concession concernée et n'est pas émis pour un retry sans changement.
