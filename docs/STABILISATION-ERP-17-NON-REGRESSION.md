# ERP-17 — Non-régression

Build backend TypeScript réussi après correction de l'inférence générique du helper PDF. Build frontend Vite réussi.
Tests : backend69 dont67 réussis/2 ignorés ; frontend62/62 ; GED1/1 ; PDF1/1.
Lecture API : Facturation pagination/recherche/type, OR7, facture16, ventes10/11, livraison6 cohérents. Contrôle MySQL exact : factures A2=12/A3=11 ; lignes13/14/16/23.
Les suites couvrent Garantie, Livraison, Notifications et permissions Pièces. Pas de cycle métier neuf ; pas de paiement ou mouvement réel.
Phase 2 : backend ciblé71 dont69 réussis/2 ignorés ; frontend62/62 ; builds backend/frontend réussis ; git diff --check réussi. Le navigateur est disponible et valide Facturation et le détail Garantie sur l'image active. Les corrections n'ont pas été déployées ; non-régression navigateur après correction Pièces/Nouvel OR/PDF NON EXÉCUTÉE.

Contrôle final : git diff --check sans erreur ; HEAD toujours b102417 ; dix fichiers suivis modifiés et dix-sept nouveaux fichiers (treize rapports, trois fichiers source/tests et un script). Aucun commit/push/déploiement. Les six IDs Docker initiaux sont inchangés et healthy.
SELECT finaux : OR7 delivered, OR8 invoiced ; factures16/19/20/21/22/23 et créance2 identiques à l'état initial ; ventes9/11 delivered et10 reserved ; livraisons5/6 delivered ; pièce7 stocks0/1 et réservés0/0.
Dernière exécution GED/PDF/contexte documentaire :6 tests réussis,0 échec (/tmp/erp17-final-targeted.log).
