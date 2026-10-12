-- Permission additive pour les installations versionnées au niveau 033.
INSERT IGNORE INTO permissions(module,action,code,label,group_name,description,is_active)
VALUES('roles','delete','roles.delete','Supprimer un rôle','Rôles & habilitations','Réaffecter ses utilisateurs puis supprimer un rôle métier',TRUE);
