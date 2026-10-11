# STABILISATION-ERP-03 — Tests

Automatisation : `scripts/stabilisation-erp-03-crm.mjs` exécute créations, validations, pipeline, rendez-vous, activités, affectations, clients 360, doublons, RBAC, concurrence et mesures. Résultat final : 62 appels, aucune réponse 5xx.

MySQL 8.4 réel : 5 leads, 3 clients REC03 (dont témoin concurrent), 26 activités liées, 0 notification et 16 audits dans l'échantillon contrôlé. Statuts relus directement : appointment, new et lost.

Navigateur réel : connexion COMMERCIAL, dashboard (2 prospects actifs), CRM Kanban, filtre « Toute l'équipe », cartes/compteurs/budgets, recherche Clients par nom accentué, ouverture de `CLI-000001`, sections et états vides. Aucune erreur/warning console capturée.

Tests de concurrence : double création client identique 201/409 ; deux PATCH simultanés sur des champs distincts 200/200 avec conservation des deux valeurs.

Limites : Socket.IO n'a pas pu être validé fonctionnellement en l'absence de notification persistée ; responsive et charge volumétrique non exécutés ; aucune vente/devis/essai créé conformément au périmètre.

