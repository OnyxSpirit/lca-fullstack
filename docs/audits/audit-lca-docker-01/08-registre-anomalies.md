# Registre des anomalies

| ID | Gravité | Cause confirmée | Conséquence | Correction recommandée |
|---|---|---|---|---|
| DCK-001 | Critique | Checksum de l’étape 2 de 135 différent du journal | Backend principal et qualifications en boucle | Restaurer l’artefact exact appliqué ou préparer une réconciliation contrôlée, puis figer les migrations |
| DCK-002 | Critique | Étape 7 de 135 FAILED_PARTIAL sur `fk_invoice_customer` | Schéma intermédiaire, 135 non validée | Migration corrective additive qui gère explicitement la FK existante |
| DCK-003 | Haute | Migration et serveur chaînés dans le même conteneur avec restart automatique | Boucle rapide, diagnostic bruyant | Job de migration à exécution unique avant service applicatif |
| DCK-004 | Moyenne | Frontend bloqué sur `service_healthy` | UI principale non démarrée | Conserver la dépendance ; corriger le backend |
| DCK-005 | Haute | Baseline 071 contient les colonnes de 094 | Installation fraîche non reproductible | Refaire une baseline numérotée au vrai niveau ou retirer les ajouts postérieurs |
| DCK-006 | Moyenne | Socket Docker inaccessible dans le sandbox Codex | Diagnostics ordinaires refusés | Prévoir l’escalade contrôlée et documenter la différence terminal/Codex |
| DCK-007 | Moyenne | Artefacts dist possédés par un UID remappé | Build hôte EACCES | Construire dans un répertoire isolé ou harmoniser UID/GID à la création |
| DCK-008 | Moyenne | 76 conteneurs et 2 250 caches issus de qualifications multiples | Complexité, ports et stockage difficiles à gouverner | Politique d’inventaire et de rétention, nettoyage seulement après approbation |
| DCK-009 | Moyenne | Runtimes Node divergents | Résultats de build/test variables | Épingler Node 22 via image et fichier de version |
| DCK-010 | Moyenne | Tests navigateur dépendants des capacités de session | Recette visuelle incomplète | Service Playwright dédié dans le profil qualification |
| DCK-011 | Haute | Migration 136 jamais atteinte sur la base principale | LCA-03 indisponible | Qualifier 135→136 sur clone anonymisé après correction 135 |

Aucun risque de perte immédiate n’est confirmé. Le risque principal est une intervention manuelle non préparée sur le journal ou les contraintes ; elle pourrait désynchroniser davantage schéma et historique.

