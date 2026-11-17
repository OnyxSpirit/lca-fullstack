START TRANSACTION;

INSERT INTO roles(name,code,description,is_system,is_active,created_by)
VALUES('Opérateur SAV recette','FIN_E2E_SAV_OPERATEUR','Fixture isolée du scénario SAV financier',FALSE,TRUE,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),is_active=TRUE;

INSERT INTO users(agency_id,first_name,last_name,email,password_hash,job_title,is_active)
SELECT 1,'Opérateur','SAV recette','sav.operateur@lca.test',password_hash,'Conseiller et technicien SAV de recette',TRUE
FROM users WHERE id=1
ON DUPLICATE KEY UPDATE is_active=TRUE,agency_id=1;

SET @sav_user=(SELECT id FROM users WHERE email='sav.operateur@lca.test');
SET @sav_role=(SELECT id FROM roles WHERE code='FIN_E2E_SAV_OPERATEUR');

INSERT INTO user_agencies(user_id,agency_id,is_primary,status,created_by)
VALUES(@sav_user,1,TRUE,'ACTIVE',1)
ON DUPLICATE KEY UPDATE status='ACTIVE',is_primary=TRUE,deactivated_at=NULL,deactivated_by=NULL;
SET @sav_user_agency=(SELECT id FROM user_agencies WHERE user_id=@sav_user AND agency_id=1);
INSERT IGNORE INTO user_agency_roles(user_agency_id,role_id,assigned_by) VALUES(@sav_user_agency,@sav_role,1);

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT @sav_role,id,'AGENCY' FROM permissions
WHERE code IN('service.order.receive','service.order.update','workshop.session.track')
ON DUPLICATE KEY UPDATE scope='AGENCY';

INSERT INTO technicians(user_id,agency_id,employee_code,specialty,hourly_rate,available_hours_per_day,is_active)
VALUES(@sav_user,1,'FIN-E2E-SAV','Mécanique de recette',45000,8,TRUE)
ON DUPLICATE KEY UPDATE agency_id=1,is_active=TRUE;

INSERT INTO vehicles(agency_id,commercial_origin,commercial_origin_source,is_commercial_stock,identity_brand,identity_model,vehicle_type,vin,registration_number,mileage,status,created_by)
VALUES(1,'EXTERNAL','WORKSHOP',FALSE,'LCA','Recette SAV','used','FIN-E2E-SAV-VIN-001','E2E-SAV-001',42000,'delivered',1)
ON DUPLICATE KEY UPDATE agency_id=1,mileage=42000,archived_at=NULL;
SET @sav_vehicle=(SELECT id FROM vehicles WHERE vin='FIN-E2E-SAV-VIN-001');
INSERT INTO customer_vehicles(customer_id,vehicle_id,agency_id,relation_type,source_type,is_current,notes,created_by)
VALUES(1,@sav_vehicle,1,'OWNER','MANUAL',TRUE,'Fixture SAV financière isolée',1)
ON DUPLICATE KEY UPDATE is_current=TRUE,valid_to=NULL;

INSERT INTO locations(agency_id,name,type,address,is_active)
SELECT 1,'Magasin SAV recette','warehouse','Environnement Docker isolé',TRUE
WHERE NOT EXISTS(SELECT 1 FROM locations WHERE agency_id=1 AND name='Magasin SAV recette');
SET @sav_location=(SELECT id FROM locations WHERE agency_id=1 AND name='Magasin SAV recette' LIMIT 1);

INSERT INTO parts(reference,name,brand,description,purchase_price,sale_price,min_stock,max_stock,is_active)
VALUES('FIN-E2E-SAV-PIECE','Filtre SAV recette','LCA','Pièce fictive de recette SAV',6000,10000,1,100,TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),sale_price=VALUES(sale_price),is_active=TRUE;
SET @sav_part=(SELECT id FROM parts WHERE reference='FIN-E2E-SAV-PIECE');
INSERT INTO part_stocks(part_id,agency_id,location_id,current_stock,reserved_stock,min_stock,max_stock)
VALUES(@sav_part,1,@sav_location,20,0,1,100)
ON DUPLICATE KEY UPDATE current_stock=GREATEST(current_stock,20),reserved_stock=0;

COMMIT;

SELECT @sav_user AS advisor_user_id,(SELECT id FROM technicians WHERE user_id=@sav_user) AS technician_id,
       @sav_vehicle AS vehicle_id,@sav_part AS part_id,
       (SELECT id FROM part_stocks WHERE part_id=@sav_part AND agency_id=1 AND location_id=@sav_location) AS part_stock_id;
