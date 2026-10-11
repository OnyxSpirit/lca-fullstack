# ERP-14 — Transmission ChatGPT

1. Verdict général : conforme sur le noyau REC14 exécuté, avec couverture transversale partielle.
2. Scénarios prévus : chaîne CRM, Showroom, vente, finance, livraison, SAV, atelier, pièces, RH, notifications, audits et cloisonnement.
3. Scénarios exécutés : 21 contrôles automatisés, contrôles navigateur, API et MySQL.
4. Scénarios validés : CRM/Client 360, Showroom/CRM, stock/vente annulée, concurrence et audits.
5. Scénarios non validés : aucun scénario exécuté n'est en échec.
6. Scénarios partiels : finance/livraison, SAV/atelier/pièces, RH et notifications.
7. Scénario bloqué : multi-concessions, faute de deuxième concession et de workflow officiel de création.
8. Scénarios non exécutés : cycle neuf complet garantie et kilométrage.
9. CRM vers Clients 360 : création, recherche, modification et unicité vérifiées ; conversion générique absente.
10. Clients 360 vers CRM : fiche REC14 consultable et cohérente.
11. Showroom vers Commercial : visite terminée, conversion en prospect qualifié et rejeu idempotent.
12. Stock vers Vente : véhicule REC14 vendu par le workflow officiel.
13. Vente vers Facturation : blocage de facturation après annulation vérifié ; chaîne positive historique seulement relue.
14. Facturation vers Encaissement : cohérence historique relue, sans nouvel encaissement REC14.
15. Encaissement vers Livraison : cohérence historique relue, sans nouvelle livraison REC14.
16. Vente annulée : vente terminale annulée, véhicule redevenu disponible, facture et livraison refusées.
17. SAV vers OR : contrôles ciblés verts, sans nouveau dossier REC14.
18. OR vers Atelier : workflow historique relu et tests ciblés verts.
19. Atelier vers Pièces : mouvements et permissions couverts par les tests ciblés.
20. OR vers Facturation : cohérence historique relue, sans nouvelle facture SAV REC14.
21. Garanties : non exécutées de bout en bout dans cette campagne.
22. Kilométrage : non exécuté de bout en bout dans cette campagne.
23. RH vers Utilisateurs : utilisateur commercial REC14 actif dans l'agence 1 ; tests RH verts.
24. Notifications intermodules : émission temps réel d'agence constatée ; absence de persistance attendue sans permission `notifications.view`.
25. Notifications Pièces : tests de permissions verts, aucune notification REC14 créée.
26. Audits : deux traces REC14 persistées et relues.
27. RBAC : accès et permissions ciblés validés ; aucune élévation artificielle.
28. Multi-agences : contexte agence 1 vérifié ; cloisonnement multi-agences non exhaustif.
29. Multi-concessions : bloqué proprement, sans création SQL directe.
30. Intégrité MySQL : relations officielles `sale_items`, statuts et unicités cohérents sous MySQL 8.4.11.
31. Concurrence : création client concurrente et vente concurrente donnent chacune un seul gagnant.
32. Tests navigateur : CRM, Showroom, Véhicules et Ventes contrôlés sur le frontend 4176.
33. Tests API : 30 appels, zéro erreur 5xx et 21 contrôles sur 21 réussis.
34. Tests MySQL : ressources REC14, audits et relations vérifiés en lecture seule.
35. Non-régression ciblée : backend 8/8 et frontend 32/32.
36. Performance : moyenne 64,09 ms, médiane 8,47 ms, p95 413,77 ms, maximum 508,17 ms.
37. Anomalies identifiées : lacune fonctionnelle de conversion Prospect vers Client et limites de couverture documentées.
38. Anomalies corrigées : aucune correction applicative requise ; l'anomalie historique de colonne Showroom n'a pas été reproduite.
39. Réserves restantes : cycles positifs finance, livraison, SAV, garantie et kilométrage à rejouer avec ressources neuves.
40. Données conservées : utilisateur 25, leads 8 et 9, client 5, visite 1, véhicule 10 et vente 7, plus le second client concurrent.
41. Fichiers modifiés : un script de recette et vingt-sept rapports ERP-14 ; aucun fichier métier ni migration.
42. État Git : changements ERP-14 non commités, conformément à la mission.
43. État conteneurs : recette isolée sur 4176/3004/33321 ; services historiques préservés et port 3001 intact.
44. Prochaine campagne : compléter les chaînes positives non rejouées et provisionner officiellement une seconde concession.
45. Preuve principale : `scripts/stabilisation-erp-14-integration.mjs`, résultat d'exécution `/tmp/stabilisation-erp-14-integration.json`.

Toutes les ressources de preuve doivent rester en place jusqu'à validation métier.
