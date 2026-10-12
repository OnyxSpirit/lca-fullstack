# Inventaire des livrables préparés

## Remise envisagée à la LCA après autorisation

| Catégorie | Élément | État |
|---|---|---|
| Source assainie | `ERP-LCA-v1.0.0-rc2-source.tar.gz` | techniquement qualifiée, distribution bloquée |
| Intégrité | manifeste externe et SHA-256 RC2 | disponibles |
| Technique | `README.md`, `DEPLOYMENT.md`, documentation backend/base/frontend | actualisés ou référencés |
| Dossier officiel | 12 documents `docs/livraison-lca/` | préparés pour revue |
| Exploitation | installation, configuration, administration, sauvegarde/restauration | préparées |
| Qualité | synthèse ERP-01 à ERP-22 et rapports sources | disponibles |
| Gouvernance | registre des réserves | préparé |
| Remise | modèle de procès-verbal | non signé |

## Empreinte de référence

Version `ERP-LCA-v1.0.0-rc2`, 786 fichiers réguliers, SHA-256 `31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6`.

Le dossier `docs/livraison-lca/` a été créé après l'export RC2 et n'est donc pas inclus silencieusement dans cette archive. Le paquet officiel devra associer l'archive inchangée à une documentation versionnée et inventoriée séparément, ou produire une nouvelle candidate explicitement qualifiée. Ne jamais modifier RC2 tout en conservant son nom ou son empreinte.

## Exclusions impératives

Historique `.git`, fichiers `.env` réels, mots de passe/jetons, accès de démonstration, `ll/`, `tmp/`, `dist/`, `node_modules`, GED/uploads/sauvegardes de qualification, données historiques non autorisées, dumps, archives antérieures, logs et caches.

## Contrôles avant remise

Rotation des accès confirmée, autorisation écrite, empreinte recalculée, scan secrets/données, liens documentaires contrôlés, destinataire LCA vérifié, signature éventuelle, canal de transfert approuvé et procès-verbal complété sans présumer sa signature.

