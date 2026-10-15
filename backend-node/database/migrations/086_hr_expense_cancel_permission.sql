-- Permission dédiée : aucune attribution automatique à un rôle métier.
INSERT INTO permissions(module,action,code,name,group_name,description,is_active)
VALUES('hr','cancel','hr.expense.cancel','Annuler une dépense','RH & Administration','Annuler une dépense non décaissée de son périmètre avec traçabilité',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);
