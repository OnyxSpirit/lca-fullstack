ALTER TABLE refresh_tokens
  ADD COLUMN authenticated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER expires_at,
  ADD COLUMN two_factor_verified_at DATETIME NULL AFTER authenticated_at,
  ADD COLUMN two_factor_grandfathered BOOLEAN NOT NULL DEFAULT TRUE AFTER two_factor_verified_at;

CREATE TABLE user_two_factor_auth (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  encrypted_secret TEXT NULL,
  secret_iv VARCHAR(32) NULL,
  secret_tag VARCHAR(32) NULL,
  secret_key_version VARCHAR(40) NULL,
  pending_encrypted_secret TEXT NULL,
  pending_secret_iv VARCHAR(32) NULL,
  pending_secret_tag VARCHAR(32) NULL,
  pending_key_version VARCHAR(40) NULL,
  pending_expires_at DATETIME NULL,
  enabled_at DATETIME NULL,
  individually_required BOOLEAN NOT NULL DEFAULT FALSE,
  reset_required BOOLEAN NOT NULL DEFAULT FALSE,
  last_accepted_time_step BIGINT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_2fa_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_user_2fa_secret CHECK (
    (enabled_at IS NULL AND encrypted_secret IS NULL AND secret_iv IS NULL AND secret_tag IS NULL AND secret_key_version IS NULL)
    OR
    (enabled_at IS NOT NULL AND encrypted_secret IS NOT NULL AND secret_iv IS NOT NULL AND secret_tag IS NOT NULL AND secret_key_version IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE two_factor_recovery_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code_hash CHAR(64) NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_2fa_recovery_hash(user_id,code_hash),
  INDEX idx_2fa_recovery_available(user_id,used_at),
  CONSTRAINT fk_2fa_recovery_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE two_factor_challenges (
  id CHAR(36) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  purpose ENUM('LOGIN_VERIFY','LOGIN_SETUP') NOT NULL,
  context_hash CHAR(64) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  blocked_until DATETIME NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_2fa_challenge_user(user_id,purpose,expires_at),
  INDEX idx_2fa_challenge_expiry(expires_at,consumed_at),
  CONSTRAINT fk_2fa_challenge_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE role_two_factor_policies (
  role_id BIGINT UNSIGNED PRIMARY KEY,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by BIGINT UNSIGNED NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_2fa_policy_role FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_2fa_policy_actor FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO permissions(module,action,code,name,label,group_name,description,is_active) VALUES
('auth','view','auth.2fa.view','Voir mon état 2FA','Voir mon état 2FA','Sécurité et authentification','Consulter son propre état de double authentification',TRUE),
('auth','manage','auth.2fa.manage','Gérer mon 2FA','Gérer mon 2FA','Sécurité et authentification','Activer, désactiver et régénérer ses facteurs personnels',TRUE),
('auth','view','auth.2fa.users.view','Voir le 2FA des utilisateurs','Voir le 2FA des utilisateurs','Sécurité et authentification','Consulter les états 2FA dans son périmètre',TRUE),
('auth','enforce','auth.2fa.users.enforce','Imposer le 2FA utilisateur','Imposer le 2FA utilisateur','Sécurité et authentification','Gérer l’obligation individuelle dans son périmètre',TRUE),
('auth','reset','auth.2fa.users.reset','Réinitialiser le 2FA utilisateur','Réinitialiser le 2FA utilisateur','Sécurité et authentification','Réinitialiser les facteurs dans son périmètre',TRUE),
('auth','policy','auth.2fa.policy.manage','Gérer les politiques 2FA','Gérer les politiques 2FA','Sécurité et authentification','Gérer les obligations 2FA des rôles dynamiques',TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name),label=VALUES(label),group_name=VALUES(group_name),description=VALUES(description),is_active=VALUES(is_active);

-- Le rôle système authentique reçoit les permissions de sécurité nécessaires.
-- Aucun rôle métier prédéfini n'est créé et aucune autre attribution n'est faite.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,CASE WHEN p.code IN('auth.2fa.view','auth.2fa.manage') THEN 'OWN' ELSE 'GLOBAL' END
FROM roles r CROSS JOIN permissions p
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE AND p.code LIKE 'auth.2fa.%'
ON DUPLICATE KEY UPDATE scope=VALUES(scope);
