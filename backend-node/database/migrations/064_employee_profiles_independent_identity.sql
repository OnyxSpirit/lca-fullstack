-- Lot 10 : le dossier employé RH devient autonome du compte utilisateur ERP.
ALTER TABLE employee_profiles
  DROP FOREIGN KEY fk_employee_user,
  MODIFY user_id BIGINT UNSIGNED NULL,
  ADD CONSTRAINT fk_employee_user_optional FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE employee_profiles
  ADD COLUMN concession_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD COLUMN agency_id BIGINT UNSIGNED NULL AFTER concession_id,
  ADD COLUMN first_name VARCHAR(100) NULL AFTER agency_id,
  ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN email VARCHAR(190) NULL AFTER last_name,
  ADD COLUMN phone VARCHAR(50) NULL AFTER email;

UPDATE employee_profiles ep
JOIN users u ON u.id=ep.user_id
JOIN agencies a ON a.id=u.agency_id
SET ep.concession_id=a.concession_id,
    ep.agency_id=u.agency_id,
    ep.first_name=u.first_name,
    ep.last_name=u.last_name,
    ep.email=u.email,
    ep.phone=u.phone;

ALTER TABLE employee_profiles
  MODIFY concession_id BIGINT UNSIGNED NOT NULL,
  MODIFY first_name VARCHAR(100) NOT NULL,
  MODIFY last_name VARCHAR(100) NOT NULL,
  ADD INDEX idx_employee_concession_status (concession_id,employment_status),
  ADD INDEX idx_employee_agency_status (agency_id,employment_status),
  ADD INDEX idx_employee_identity (last_name,first_name),
  ADD CONSTRAINT fk_employee_concession FOREIGN KEY (concession_id) REFERENCES concessions(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT fk_employee_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO permissions(module,action,code,name,group_name,description,is_active)
VALUES ('hr','manage','hr.employee.account.manage','Gérer le compte ERP d’un employé','RH & Administration','Lier ou délier explicitement un compte ERP au dossier employé dans son périmètre',TRUE)
ON DUPLICATE KEY UPDATE module=VALUES(module),action=VALUES(action),name=VALUES(name),group_name=VALUES(group_name),description=VALUES(description),is_active=TRUE;

INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL'
FROM roles r JOIN permissions p ON p.code='hr.employee.account.manage'
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE
ON DUPLICATE KEY UPDATE scope='GLOBAL';
