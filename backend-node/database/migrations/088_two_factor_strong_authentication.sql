ALTER TABLE refresh_tokens
  ADD COLUMN strong_auth_at DATETIME NULL AFTER two_factor_verified_at,
  ADD COLUMN strong_auth_method ENUM('PASSWORD','PASSWORD_TOTP') NULL AFTER strong_auth_at;
