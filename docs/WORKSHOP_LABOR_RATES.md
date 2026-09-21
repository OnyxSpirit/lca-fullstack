# Barèmes horaires atelier dynamiques

Le référentiel `workshop_labor_rates` contient les barèmes par défaut d’une concession. Une ligne de surcharge agence référence son barème parent par `parent_rate_id`; l’héritage ne duplique donc pas tout le référentiel.

La résolution effective applique les règles suivantes :

- un barème concession inactif n’est jamais proposé ;
- sans surcharge, l’agence hérite du tarif concession ;
- une surcharge active remplace uniquement le tarif pour l’agence ciblée ;
- une surcharge inactive désactive explicitement le barème pour cette agence ;
- l’action « Hériter » désactive logiquement la surcharge et restaure le tarif concession, sans supprimer l’identité éventuellement référencée par l’historique.

Les routes d’administration utilisent `settings.view` et `settings.update`. `OWN` ne donne aucun droit sur ce référentiel collectif, `AGENCY` permet seulement la surcharge de l’agence courante, `CONCESSION` gère le référentiel et les agences de sa concession, et `GLOBAL` suit le périmètre global normal. Aucun nom de rôle ne participe à la décision.

Pour une nouvelle ligne de main-d’œuvre, le navigateur transmet `laborRateId`. Le serveur vérifie que ce barème est actif et effectif pour l’agence de l’OR, ignore tout prix client, puis persiste `labor_rate_id`, `rate_code_snapshot`, `rate_label_snapshot` et `unit_price`. Les anciens OR conservent leurs champs snapshot à `NULL`; aucune histoire n’est déduite depuis leur prix.

Les anciennes clés `workshop.rate_t1` à `workshop.rate_t4` sont conservées pour transition. La migration 040 les lit une seule fois afin d’initialiser T1–T4 par concession, puis le flux SAV utilise exclusivement le nouveau référentiel. Les ponts, postes et ressources restent inchangés.
