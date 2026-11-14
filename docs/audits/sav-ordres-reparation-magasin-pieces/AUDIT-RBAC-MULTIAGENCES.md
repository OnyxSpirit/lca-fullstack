# Audit RBAC multi-agences

La recette possède 6 agences actives, 5 utilisateurs et un rôle système `SUPER_ADMIN` doté de 375 permissions, dont 37 SAV et 35 Pièces. Les permissions concernées sont `GLOBAL`.

Les profils métier demandés ne sont pas provisionnés dans cette recette : impossible de rejouer Responsable SAV, réceptionniste, technicien, magasinier, comptabilité et sans permission par connexion réelle.

Les tests valident OWN/AGENCY/CONCESSION/GLOBAL, isolation des agences, permissions spécialisées et absence de bypass par nom de rôle. Défaut confirmé : les vues SAV financières ne normalisent pas le Super Admin `GLOBAL` vers le scope métier de l'agence active.

Verdict : **PARTIELLEMENT CONFORME**.

