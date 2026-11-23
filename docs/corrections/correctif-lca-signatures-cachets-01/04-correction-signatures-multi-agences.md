# Signatures en contexte multi-agences

La résolution ne dépend plus de `users.agency_id`. Elle joint désormais :

```sql
user_agencies.user_id = users.id
AND user_agencies.agency_id = document.agency_id
AND user_agencies.status = 'ACTIVE'
```

Le choix reste borné à l'agence et à la concession du document et conserve les contrôles existants de politique, signature active et permission d'application. Une affectation principale seule n'accorde donc aucun droit dans une agence secondaire ; une affectation secondaire active peut être utilisée.

La régression structurelle est couverte dans `document-marks-lot2.test.ts`. La matrice MySQL exhaustive demandée (rôle désactivé, absence de permission et changement d'agence inclus) reste une réserve de qualification avant recette finale.
