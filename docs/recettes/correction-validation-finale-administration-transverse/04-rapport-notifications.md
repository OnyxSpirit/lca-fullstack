# 04 — Rapport Centre de notifications

Le scénario réel `notifications-agency-rbac-mysql.integration.test.ts` a réussi sur MySQL : destinataire, notifications personnelles/agence, autre utilisateur, autre agence, lecture, lecture globale, archivage, suppression logique, changement d’agence, retrait/rétablissement de rôle, refus 403/404, révocation 401 et diffusion Socket.IO positive/négative.

Le test vérifie aussi que MySQL refuse désormais une tentative de réattribution `GLOBAL`. La recette navigateur du build corrigé n’a pas été redéployée, conformément à l’interdiction de déploiement ; elle reste une vérification manuelle pré-GO.
