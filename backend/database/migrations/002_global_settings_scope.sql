-- Rend la configuration globale réellement unique sous MySQL.
DELETE older FROM settings older
JOIN settings newer ON newer.scope_type='global'
  AND newer.setting_key=older.setting_key
  AND newer.scope_id IS NULL
  AND older.scope_id IS NULL
  AND newer.id>older.id
WHERE older.scope_type='global';

UPDATE settings SET scope_id=0 WHERE scope_type='global' AND scope_id IS NULL;
