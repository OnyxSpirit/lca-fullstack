# RBAC et multi-agences

- Scopes actifs : `OWN`, `AGENCY` uniquement.
- Aucun bypass fondé sur un nom de rôle.
- Les lectures et mutations revalident le contexte d’agence.
- Les suites de matrice véhicules, CRM, Showroom, facturation, SAV, RH et Reporting sont vertes.
- Les intégrations RBAC conditionnelles ont révélé puis fait corriger la fixture 2FA et les gardes d’isolation trop spécifiques ; les validations restent exclusivement `OWN` et `AGENCY`.
