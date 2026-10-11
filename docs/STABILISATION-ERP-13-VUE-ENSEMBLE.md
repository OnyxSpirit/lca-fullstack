# STABILISATION-ERP-13 — Vue d’ensemble

Verdict : conforme après correction. Recette réelle le 11 octobre 2026 sur frontend `4176`, API `3004` et MySQL `33321`. Les KPI réels affichent 4 dossiers actifs, 1 article sous seuil et un budget de 100 000 XAF dont 90 000 XAF engagés et 10 000 XAF disponibles.

Une anomalie a été détectée puis corrigée : les agrégats incluaient les dépenses non approuvées. Les synthèses ne retiennent désormais que `approval_status='approved'`.
