-- Permissions minimales dédiées aux réservations de pièces Atelier.
INSERT INTO permissions(module,action,code,name,category,description,is_active) VALUES
('parts','view','parts.reservation.view','Voir les réservations de pièces','Pièces & stock','Consulter les réservations liées aux ordres de réparation',TRUE),
('parts','create','parts.reservation.create','Réserver des pièces','Pièces & stock','Réserver du stock disponible pour un ordre de réparation',TRUE),
('parts','update','parts.reservation.release','Libérer une réservation de pièces','Pièces & stock','Libérer une réservation active sans consommer le stock physique',TRUE),
('parts','update','parts.reservation.consume','Consommer une réservation de pièces','Pièces & stock','Consommer une réservation active et décrémenter le stock physique',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),category=VALUES(category),description=VALUES(description),is_active=TRUE;

-- Continuité des droits existants : les rôles qui possédaient explicitement
-- parts.stock.adjust reçoivent les permissions dédiées avec le même scope.
INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
SELECT existing.role_id,target.id,existing.scope
FROM role_permissions existing
JOIN permissions legacy ON legacy.id=existing.permission_id AND legacy.code='parts.stock.adjust'
JOIN permissions target ON target.code IN('parts.reservation.view','parts.reservation.create','parts.reservation.release','parts.reservation.consume');
