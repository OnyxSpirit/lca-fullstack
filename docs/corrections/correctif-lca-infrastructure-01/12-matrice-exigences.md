# Matrice des exigences

| Exigence | Réalisation | État |
|---|---|---|
| INFRA-01 | Artefact 135 exact + remplacement FK phasé | Réussi isolé |
| INFRA-02 | Checksums conservés, journal réconcilié par postconditions | Réussi isolé |
| INFRA-03 | 136 appliquée sur copie historique et fraîche | Réussi isolé |
| INFRA-04 | Objets 094 retirés de baseline 071 | Réussi |
| INFRA-05 | Runner conservé, adaptation minimale ciblée | Réussi |
| INFRA-06 | Reprise, idempotence, divergence, concurrence | Réussi |
| INFRA-07 | Politique, contrôle Git et additive 137 | Réussi |
| INFRA-08 | Démarrage isolé qualifié; principal non modifié | En attente autorisation principal |
| INFRA-09 | Node 22, MySQL 8.4, sorties isolées, ressources étiquetées | Réussi |
| INFRA-10 | `AGENTS.md` et politique permanente | Réussi |

Les anomalies DCK-001/002/003/004/005/007/009/010/011 sont corrigées ou qualifiées isolément. DCK-006 reste une restriction de sécurité gérée par autorisations. DCK-008 est inventoriée sans nettoyage, conformément à l'interdiction.
