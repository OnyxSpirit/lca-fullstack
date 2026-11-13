-- Fixtures exclusivement destinées à la base isolée lca_recette.
-- Les identifiants élevés et les clés REC-DOC-* rendent le script idempotent.
UPDATE concessions SET legal_name='La Congolaise de l’Automobile',legal_form='SARL',tax_identifier='NIU-RECETTE-001',rccm='RCCM-RECETTE-001',rib='RIB-RECETTE-001',website='https://recette.lca.invalid',address='Avenue de la Recette',city='Brazzaville' WHERE id=1;
INSERT IGNORE INTO agencies(id,concession_id,name,code,city) VALUES(9002,1,'Agence documentaire secondaire','REC-DOC-B','Pointe-Noire');
INSERT IGNORE INTO brands(id,name,code) VALUES(9001,'Marque Recette','REC-DOC');
INSERT IGNORE INTO models(id,brand_id,name,code) VALUES(9001,9001,'Modèle Démonstration','REC-DOC-M');
INSERT IGNORE INTO versions(id,model_id,name,code) VALUES(9001,9001,'Version Élégance','REC-DOC-V');
INSERT IGNORE INTO suppliers(id,name,code,is_parts_supplier,is_vehicle_supplier) VALUES(9001,'Fournisseur Recette','REC-DOC-S',TRUE,TRUE);
INSERT IGNORE INTO locations(id,agency_id,name,type) VALUES(9001,1,'Magasin de recette','warehouse'),(9002,9002,'Magasin secondaire','warehouse');
INSERT IGNORE INTO part_categories(id,name,code) VALUES(9001,'Catégorie recette','REC-DOC-CAT');
INSERT IGNORE INTO customers(id,customer_code,customer_type,agency_id,first_name,last_name,company_name,email,phone,address,city,tax_identifier,assigned_user_id,created_by)
 VALUES(9001,'REC-DOC-CLI','individual',1,'Élodie','Mavoungou',NULL,'elodie.recette@example.invalid','+242000000001','Avenue de la Recette','Brazzaville','NIU-CLIENT-RECETTE',1,1),
       (9002,'REC-DOC-AUTRE','individual',9002,'Client','Autre agence',NULL,'autre@example.invalid','+242000000002',NULL,'Pointe-Noire',NULL,NULL,1);
INSERT IGNORE INTO leads(id,customer_id,agency_id,assigned_user_id,created_by,source,status,priority,lead_type,first_name,last_name,email,phone,notes)
 VALUES(9001,9001,1,1,1,'showroom','active','high','individual','Élodie','Mavoungou','elodie.recette@example.invalid','+242000000001','Prospect fictif avec accents.');
INSERT IGNORE INTO opportunities(id,lead_id,customer_id,assigned_user_id,title,stage,expected_value,probability,expected_close_date,notes)
 VALUES(9001,9001,9001,1,'Acquisition véhicule de démonstration','test_drive',45000000,70,CURRENT_DATE,'Opportunité fictive.');
INSERT IGNORE INTO vehicles(id,version_id,agency_id,location_id,supplier_id,vehicle_type,vin,stock_number,registration_number,year,color,fuel_type,transmission,mileage,purchase_price,sale_price,status,created_by)
 VALUES(9001,9001,1,9001,9001,'new','RECETTEVIN00000001','REC-DOC-VH-1','RC-001-AA',2026,'Rouge','Essence','Automatique',120,30000000,45000000,'available',1),
       (9002,9001,9002,9002,9001,'used','RECETTEVIN00000002','REC-DOC-VH-2','RC-002-AA',2025,'Bleu','Diesel','Manuelle',12000,20000000,28000000,'available',1);
INSERT IGNORE INTO vehicle_movements(id,vehicle_id,from_location_id,to_location_id,from_agency_id,to_agency_id,movement_type,quantity,reason,performed_by)
 VALUES(9001,9001,9001,9001,1,1,'entry',1,'Réception fictive de recette',1);
INSERT IGNORE INTO showroom_visits(id,customer_id,lead_id,origin,visitor_name,phone,reason,preferred_model,vehicle_id,assigned_user_id,greeted_by,agency_id,queue_number,status,outcome,arrival_at,completed_at,notes)
 VALUES(9001,9001,9001,'showroom','Élodie Mavoungou','+242000000001','Essai Véhicule','Modèle Démonstration',9001,1,1,1,1,'completed','follow_up',NOW(),NOW(),'Visite fictive terminée.');
INSERT IGNORE INTO showroom_test_drives(id,visit_id,customer_id,lead_id,vehicle_id,agency_id,advisor_id,created_by,driver_name,driver_phone,license_number,mileage_out,mileage_in,status,scheduled_at,started_at,returned_at,customer_feedback,internal_notes)
 VALUES(9001,9001,9001,9001,9001,1,1,1,'Élodie Mavoungou','+242000000001','PERMIS-RECETTE',120,132,'completed',NOW(),NOW(),NOW(),'Conduite agréable.','Essai fictif finalisé.');
INSERT IGNORE INTO repair_orders(id,order_number,customer_id,vehicle_id,agency_id,advisor_id,mileage_in,complaint,diagnosis_summary,status,created_by,received_at,closed_at)
 VALUES(9001,'REC-DOC-OR-1',9001,9001,1,1,132,'Bruit intermittent décrit très précisément par le client.','Roulement contrôlé et réglé.','closed',1,NOW(),NOW());
INSERT IGNORE INTO technicians(id,user_id,agency_id,employee_code,specialty) VALUES(9001,1,1,'REC-TECH','Diagnostic');
INSERT IGNORE INTO diagnostics(id,repair_order_id,technician_id,diagnosis,recommendations,estimated_hours)
 VALUES(9001,9001,9001,'Diagnostic de recette : jeu léger détecté.','Contrôle périodique recommandé.',1.5);
INSERT IGNORE INTO repair_quality_controls(id,repair_order_id,planned_work_completed,defect_corrected,road_test_performed,no_leaks,levels_checked,cleanliness_checked,result,observations,controlled_by)
 VALUES(9001,9001,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,'passed','Contrôle fictif conforme.',1);
INSERT IGNORE INTO repair_order_handovers(id,repair_order_id,customer_name,mileage_out,observations,handed_over_by,handover_type)
 VALUES(9001,9001,'Élodie Mavoungou',135,'Restitution fictive sans réserve.',1,'standard');
INSERT IGNORE INTO parts(id,category_id,supplier_id,reference,oem_reference,name,brand,description,purchase_price,sale_price,min_stock,max_stock,current_stock,reserved_stock)
 VALUES(9001,9001,9001,'REC-DOC-PR-1','OEM-REC-1','Filtre de démonstration','Marque Recette','Pièce fictive avec désignation accentuée.',10000,15000,2,50,20,3);
INSERT IGNORE INTO repair_order_estimate_items(id,repair_order_id,part_id,item_type,description,quantity,unit_price,discount,tax_rate,line_total,request_key,created_by)
 VALUES(9001,9001,9001,'part','Filtre de démonstration demandé',2,10000,0,18,23600,'REC-DOC-ESTIMATE-ITEM',1);
INSERT IGNORE INTO part_stocks(id,part_id,agency_id,location_id,current_stock,reserved_stock,min_stock,max_stock)
 VALUES(9001,9001,1,9001,20,3,2,50);
INSERT IGNORE INTO part_movements(id,part_id,agency_id,location_id,movement_type,quantity,stock_before,stock_after,reference_type,reference_id,correlation_key,reason,performed_by)
 VALUES(9001,9001,1,9001,'return',2,18,20,'repair_order','9001','REC-DOC-MVT-1','Retour fictif',1);
INSERT IGNORE INTO purchase_orders(id,order_number,supplier_id,agency_id,created_by,status,ordered_at,expected_at,subtotal,tax_total,total,notes)
 VALUES(9001,'REC-DOC-BC-1',9001,1,1,'received',CURRENT_DATE,CURRENT_DATE,100000,18000,118000,'Commande fictive finalisée.');
INSERT IGNORE INTO purchase_order_items(id,purchase_order_id,part_id,quantity_ordered,quantity_received,unit_price,tax_rate,line_total)
 VALUES(9001,9001,9001,10,10,10000,18,118000);
INSERT IGNORE INTO purchase_order_receipts(id,purchase_order_id,receipt_number,idempotency_key,agency_id,location_id,received_by,notes)
 VALUES(9001,9001,'REC-DOC-BR-1','REC-DOC-RECEIPT-1',1,9001,1,'Réception fictive complète.');
INSERT IGNORE INTO purchase_order_receipt_items(id,receipt_id,purchase_order_item_id,part_id,quantity)
 VALUES(9001,9001,9001,9001,10);
INSERT IGNORE INTO repair_approvals(id,repair_order_id,approved,approved_amount,customer_name,notes,recorded_by)
 VALUES(9001,9001,TRUE,23600,'Élodie Mavoungou','Approbation fictive de recette',1);
INSERT IGNORE INTO sav_part_requests(id,request_number,repair_order_id,agency_id,accepted_approval_id,status,created_by)
 VALUES(9001,'REC-DOC-DP-1',9001,1,9001,'COMPLETED',1);
INSERT IGNORE INTO sav_part_request_items(id,request_id,estimate_item_id,part_id,quantity_requested,quantity_prepared,quantity_delivered,quantity_received,quantity_consumed,quantity_returned)
 VALUES(9001,9001,9001,9001,2,2,2,2,1,1);
INSERT IGNORE INTO sales(id,sale_number,customer_id,opportunity_id,agency_id,salesperson_id,status,subtotal,discount_total,tax_total,total,tax_mode,price_input_mode,tax_rate_snapshot,currency_code,deposit_amount,balance_due,notes,idempotency_key,created_by,cancellation_reason)
 VALUES(9001,'REC-DOC-VTE-1',9001,9001,1,1,'cancelled',30000000,0,5400000,35400000,'TAXABLE','HT',18,'XAF',0,35400000,'Vente fictive annulée','REC-DOC-SALE-IDEM',1,'Annulation fictive documentée');
INSERT IGNORE INTO invoices(id,invoice_number,customer_id,agency_id,invoice_type,status,issue_date,subtotal,tax_total,total,amount_paid,balance_due,currency_code,cancellation_reason,cancelled_by,cancelled_at,created_by)
 VALUES(9001,'REC-DOC-FAC-1',9001,1,'manual','cancelled',CURRENT_DATE,100000,18000,118000,0,118000,'XAF','Annulation fictive documentée',1,NOW(),1),
       (9002,'REC-DOC-FAC-2',9001,1,'manual','paid',CURRENT_DATE,100000,18000,118000,118000,0,'XAF',NULL,NULL,NULL,1);
INSERT IGNORE INTO payments(id,payment_number,invoice_id,customer_id,payment_method_id,received_by,amount,payment_date,reference,status,notes,idempotency_key)
 VALUES(9001,'REC-DOC-PAY-1',9002,9001,1,1,118000,NOW(),'REF-RECETTE','refunded','Paiement fictif remboursé','REC-DOC-PAY-IDEM');
INSERT IGNORE INTO credit_notes(id,credit_note_number,invoice_id,customer_id,created_by,status,reason,amount,issue_date,idempotency_key)
 VALUES(9001,'REC-DOC-AV-1',9002,9001,1,'applied','Avoir fictif',118000,CURRENT_DATE,'REC-DOC-CN-IDEM');
INSERT IGNORE INTO payment_refunds(id,payment_id,invoice_id,credit_note_id,amount,reason,refunded_by,idempotency_key)
 VALUES(9001,9001,9002,9001,118000,'Remboursement fictif complet',1,'REC-DOC-REFUND-IDEM');
INSERT IGNORE INTO accounting_journals(id,code,name,journal_type,created_by) VALUES(9001,'REC','Journal de recette','MISCELLANEOUS',1);
INSERT IGNORE INTO accounting_fiscal_years(id,code,name,start_date,end_date,status,created_by) VALUES(9001,'REC-2026','Exercice de recette 2026','2026-01-01','2026-12-31','OPEN',1);
INSERT IGNORE INTO accounting_periods(id,fiscal_year_id,period_number,name,start_date,end_date,status) VALUES(9001,9001,1,'Période de recette','2026-01-01','2026-12-31','OPEN');
INSERT IGNORE INTO accounting_accounts(id,reference_version_id,parent_id,number,label,account_class,level,account_type,normal_balance,is_reference,is_postable,is_active,created_by)
 VALUES(9001,1,4,'411REC','Clients recette',4,2,'BALANCE_SHEET','DEBIT',FALSE,TRUE,TRUE,1),(9002,1,5,'571REC','Caisse recette',5,2,'BALANCE_SHEET','DEBIT',FALSE,TRUE,TRUE,1);
INSERT IGNORE INTO accounting_entries(id,journal_id,fiscal_year_id,period_id,agency_id,entry_number,draft_reference,label,accounting_date,currency_code,status,created_by,validated_by,posted_by,validated_at,posted_at)
 VALUES(9001,9001,9001,9001,1,'REC-2026-0001','REC-DRAFT-1','Pièce comptable fictive équilibrée','2026-11-13','XAF','POSTED',1,1,1,NOW(),NOW());
INSERT IGNORE INTO accounting_entry_lines(id,entry_id,line_order,account_id,agency_id,label,debit,credit,currency_code)
 VALUES(9001,9001,1,9001,1,'Débit client',118000,0,'XAF'),(9002,9001,2,9002,1,'Crédit caisse',0,118000,'XAF');
INSERT IGNORE INTO treasury_accounts(id,concession_id,agency_id,attachment_type,code,name,account_type,currency_code,created_by)
 VALUES(9001,1,1,'AGENCY','REC-BANK','Banque de recette','BANK','XAF',1);
INSERT IGNORE INTO bank_statements(id,account_id,agency_id,concession_id,currency_code,bank_name,external_reference,period_start,period_end,opening_balance,closing_balance,total_credits,total_debits,line_count,file_name,file_hash,source_content,mapping_json,decimal_separator,delimiter,status,imported_by,validated_by,validated_at)
 VALUES(9001,9001,1,1,'XAF','Banque de recette','REC-STATEMENT','2026-11-01','2026-11-30',1000000,1118000,118000,0,1,'releve-recette.csv',REPEAT('a',64),'date;libelle;montant','{}','COMMA','SEMICOLON','VALIDATED',1,1,NOW());
INSERT IGNORE INTO bank_statement_lines(id,statement_id,line_number,operation_date,description,bank_reference,signed_amount,raw_data)
 VALUES(9001,9001,1,'2026-11-13','Encaissement fictif avec accents','REC-BANK-LINE',118000,'{}');
