# ERP-17 — RBAC

Audit statique : un défaut produit confirmé dans RepairOrderDetailPage. Les actions sur pièce estimée étaient conditionnées par workActive et la réservation, sans permissions create/consume propres. Le backend contrôle déjà ces permissions et l'agence : pas de contournement API démontré.
Correction : garde parts.reservation.create pour Réserver et parts.reservation.consume pour Consommer. Aucune permission ni rôle modifié.

Le test demandant quatre codes sur cette page était trop large : aucun bouton de libération autonome n'y existe ; libération via arrêt OR. Le test conserve les assertions sur les actions proposées et vérifie l'absence d'action released non protégée.

Phase 2 : navigateur DISPONIBLE. Session Super Administrateur observée ; menus complets et accès directs Billing/Parts/Service/OR/Invoice contrôlés. Aucun profil secondaire n'a été connecté : les identifiants n'étaient pas disponibles sans extraction de secret ou réinitialisation de compte, opérations volontairement exclues. Les tests automatisés ne sont pas présentés comme preuves navigateur multi-profils.
Profils à couvrir : Commercial, Responsable commercial, Comptable, Réceptionniste, Responsable livraison, Conseiller SAV, Responsable SAV, Chef atelier, Technicien, Magasinier, Responsable pièces, Direction.
