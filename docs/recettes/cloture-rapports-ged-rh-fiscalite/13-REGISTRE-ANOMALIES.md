# Registre des anomalies

| Réf. | Module | Gravité | Cause | Correction | État |
|---|---|---:|---|---|---|
| RGF-001 | RH/Trésorerie | Haute | contrôles d’identité codés en dur | suppression de sept interdictions, permissions/scopes conservés | Corrigée |
| RGF-002 | Frontend RH | Haute | bouton d’approbation masqué pour le demandeur | affichage fondé uniquement sur `hr.leave.approve` | Corrigée |
| RGF-003 | RBAC | Moyenne | domaines techniques non traduits | dictionnaire et traduction des clés composées | Corrigée |
| RGF-004 | Fiscalité | Haute | absence de socle transversal | migration 130, API, UI, GED, reporting | Corrigée |
| RGF-005 | Recette | Moyenne | premier build réutilisait des noms de volumes fixes | override Compose à volumes dédiés ; aucun volume antérieur supprimé | Corrigée |
| RGF-006 | Test fiscal | Faible | regex trop large confondant audit et restriction | expression limitée aux comparaisons d’identité | Corrigée |
| RGF-007 | Fiscalité API | Haute | un règlement nul n’était pas explicitement rejeté | validation backend `amount > 0` et test MySQL | Corrigée |
| RGF-008 | Fiscalité UI | Haute | état d’ouverture sans rendu de la modale « nature » | formulaire complet rendu et contrôlé au navigateur | Corrigée |
| RGF-009 | Fiscalité UI | Moyenne | formulaires fermés même après erreur API | fermeture uniquement après succès confirmé | Corrigée |
| RGF-010 | Fiscalité UI | Moyenne | actions recliquables pendant la mutation | boutons `disabled/loading`, test anti-double-clic | Corrigée |

Reproduction, fichiers et preuves détaillées figurent dans les rapports thématiques et le diff de la campagne.
