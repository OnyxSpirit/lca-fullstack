-- Diagnostic strictement en lecture seule : prospects actuellement affectés
-- à un utilisateur possédant le rôle RECEPTIONIST.
SELECT
  l.id AS lead_id,
  l.created_by,
  l.assigned_user_id,
  CONCAT_WS(' ', u.first_name, u.last_name) AS assigned_user_name,
  u.agency_id AS assigned_user_agency_id,
  l.created_at
FROM leads AS l
JOIN users AS u
  ON u.id = l.assigned_user_id
JOIN user_roles AS ur
  ON ur.user_id = u.id
JOIN roles AS r
  ON r.id = ur.role_id
WHERE r.code = 'RECEPTIONIST'
ORDER BY l.created_at DESC, l.id DESC;

-- Résumé quantitatif, sans modification des données.
SELECT COUNT(DISTINCT l.id) AS receptionist_assigned_lead_count
FROM leads AS l
JOIN user_roles AS ur
  ON ur.user_id = l.assigned_user_id
JOIN roles AS r
  ON r.id = ur.role_id
WHERE r.code = 'RECEPTIONIST';
