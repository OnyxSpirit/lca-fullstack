# ERP-10 — Anomalies

Corrigée: une référence pièce dupliquée remontait ER_DUP_ENTRY en HTTP 500. Cause: absence de traduction au point de création. Correction minimale: HTTP 409 `Cette référence de pièce existe déjà`, avec test de non-régression.
