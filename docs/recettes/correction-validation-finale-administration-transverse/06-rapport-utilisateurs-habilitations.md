# 06 — Rapport Utilisateurs & habilitations

Les créations et modifications de rôles rejettent tout scope autre que `OWN`/`AGENCY`. Les affectations multi-agences, rôles locaux, retrait de rôle, changement d’agence, invalidation de contexte et protection du véritable Super Administrateur ont été validés par les intégrations LOT2/PH2A.

La fixture Super Administrateur matérialise un facteur 2FA actif et une session TOTP vérifiée ; aucune politique 2FA n’a été désactivée. Les faux rôles ressemblant à Super Administrateur restent refusés.
