# Non-régression

Backend build et lint réussis. Suite backend complète : 363 fichiers, 335 réussis et 28 échoués, exactement le nombre d’échecs de référence LCA-02 ; aucun échec nouveau attribué à LCA-03. Frontend TypeScript/lint réussis. Suite frontend exécutée directement avec le chargeur Node : 231 fichiers, 223 réussis et 8 échoués, exactement la référence LCA-02. Le script npm ordinaire rencontre EPERM sur le socket IPC tsx, contourné sans désactiver de test. Le build Vite transforme 2 554 modules puis échoue sur le nettoyage d’un dist appartenant à un autre UID (EACCES), sans erreur TypeScript.

