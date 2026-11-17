# Corrections backend

Les types, rangs et prédicats RBAC sont limités à `OWN` et `AGENCY`. Les services et routes ne construisent plus de prédicat d’accès concession/global.

Les référentiels concessionnels autorisés avec `AGENCY` déterminent la concession depuis l’agence active. Les identifiants territoriaux reçus du client ne sont jamais une source d’autorité. Le seed système, le provisioning administrateur et la baseline neuve utilisent `AGENCY`; les migrations historiques n’ont pas été modifiées.
