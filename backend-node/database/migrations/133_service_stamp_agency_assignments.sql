-- Cachets : agence propriétaire obligatoire pour les nouvelles créations et
-- affectations d'utilisation explicites, sans élargissement implicite.
CREATE TABLE service_stamp_agencies (
  stamp_id BIGINT UNSIGNED NOT NULL,
  agency_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (stamp_id,agency_id),
  KEY idx_service_stamp_agency_access (agency_id,stamp_id),
  CONSTRAINT fk_service_stamp_agency_stamp FOREIGN KEY (stamp_id) REFERENCES service_stamps(id) ON DELETE RESTRICT,
  CONSTRAINT fk_service_stamp_agency_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_service_stamp_agency_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Seuls les propriétaires déjà qualifiés sont repris. Les cachets historiques
-- sans agence restent préservés et inaccessibles jusqu'à décision humaine.
INSERT INTO service_stamp_agencies(stamp_id,agency_id,created_by)
SELECT id,agency_id,created_by FROM service_stamps WHERE agency_id IS NOT NULL;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active) VALUES
('documents','assign','stamp.assign_agencies','Partager les cachets entre agences','Documents & Gouvernance','Gérer les agences autorisées à utiliser un cachet appartenant à l’agence active',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'AGENCY' FROM roles r JOIN permissions p ON p.code='stamp.assign_agencies'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
ON DUPLICATE KEY UPDATE scope='AGENCY';
