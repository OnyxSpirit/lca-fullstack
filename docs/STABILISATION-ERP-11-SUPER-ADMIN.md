# ERP-11 — Super Admin

MySQL confirme exactement un Super Admin système actif. Sa désactivation par lui-même retourne 409, sa modification de rôle retourne 403 et le bouton de désactivation est désactivé dans l’UI. Un rôle nommé « Super Administrateur REC11 » mais non système et sans permission reçoit 403 sur `/users`.
