INSERT INTO agencies(concession_id,name,code,city,is_active)
SELECT id,'Agence secondaire','STOCK-AGENCY-B','Pointe-Noire',TRUE FROM concessions WHERE code='LCA-CG';
INSERT INTO groups_company(name,code) VALUES('Groupe externe','STOCK-GROUP-2');
INSERT INTO concessions(group_id,name,code,country) VALUES(LAST_INSERT_ID(),'Concession externe','STOCK-CONCESSION-2','Congo');
INSERT INTO agencies(concession_id,name,code,city,is_active) VALUES(LAST_INSERT_ID(),'Agence externe','STOCK-AGENCY-C','Dolisie',TRUE);

INSERT INTO brands(name,code) VALUES('Toyota','STOCK-TOYOTA'),('Hyundai','STOCK-HYUNDAI'),('Ford','STOCK-FORD');
INSERT INTO models(brand_id,name,code)
SELECT id,'Hilux','STOCK-HILUX' FROM brands WHERE code='STOCK-TOYOTA';
INSERT INTO models(brand_id,name,code)
SELECT id,'Corolla','STOCK-COROLLA' FROM brands WHERE code='STOCK-TOYOTA';
INSERT INTO models(brand_id,name,code)
SELECT id,'Tucson','STOCK-TUCSON' FROM brands WHERE code='STOCK-HYUNDAI';
INSERT INTO models(brand_id,name,code)
SELECT id,'Ranger','STOCK-RANGER' FROM brands WHERE code='STOCK-FORD';
INSERT INTO versions(model_id,name,code,fuel_type,transmission)
SELECT id,'Standard',CONCAT(code,'-V'),'Diesel','Manuelle' FROM models WHERE code LIKE 'STOCK-%';

INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,stock_number,year,fuel_type,transmission,sale_price,status,entry_date)
SELECT v.id,a.id,'new','STOCKVIN0000000001','STOCK-001',2026,'Diesel','Manuelle',25000000,'available',CURDATE() FROM versions v JOIN models m ON m.id=v.model_id JOIN agencies a ON a.code='LCA-BZV' WHERE m.code='STOCK-HILUX';
INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,stock_number,year,fuel_type,transmission,sale_price,status,entry_date)
SELECT v.id,a.id,'new','STOCKVIN0000000002','STOCK-002',2026,'Diesel','Manuelle',25000000,'sold',CURDATE() FROM versions v JOIN models m ON m.id=v.model_id JOIN agencies a ON a.code='LCA-BZV' WHERE m.code='STOCK-HILUX';
INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,stock_number,year,fuel_type,transmission,sale_price,status,entry_date)
SELECT v.id,a.id,'new','STOCKVIN0000000003','STOCK-003',2026,'Essence','Automatique',18000000,'available',CURDATE() FROM versions v JOIN models m ON m.id=v.model_id JOIN agencies a ON a.code='LCA-BZV' WHERE m.code='STOCK-COROLLA';
INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,stock_number,year,fuel_type,transmission,sale_price,status,entry_date)
SELECT v.id,a.id,'used','STOCKVIN0000000004','STOCK-004',2024,'Essence','Automatique',16000000,'available',CURDATE() FROM versions v JOIN models m ON m.id=v.model_id JOIN agencies a ON a.code='STOCK-AGENCY-B' WHERE m.code='STOCK-TUCSON';
INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,stock_number,year,fuel_type,transmission,sale_price,status,entry_date)
SELECT v.id,a.id,'new','STOCKVIN0000000005','STOCK-005',2026,'Diesel','Automatique',30000000,'available',CURDATE() FROM versions v JOIN models m ON m.id=v.model_id JOIN agencies a ON a.code='STOCK-AGENCY-C' WHERE m.code='STOCK-RANGER';
