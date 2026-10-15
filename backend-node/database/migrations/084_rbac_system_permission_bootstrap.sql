-- Amorçage ciblé des permissions 071 et 083 sur le seul rôle système authentique.
-- Aucune attribution n'est créée sur un rôle métier.
INSERT INTO role_permissions(role_id,permission_id,scope)
SELECT r.id,p.id,'GLOBAL'
FROM roles r
JOIN permissions p ON p.code IN(
  'workshop.vehicles.view',
  'workshop.external_vehicle.create',
  'workshop.vehicle.associations.create',
  'workshop.vehicle.associations.view',
  'workshop.vehicle.associations.close',
  'hr.budget.fund.request',
  'hr.budget.fund.request.view',
  'hr.budget.fund.approve',
  'treasury.reservation.submit',
  'treasury.reservation.approve',
  'treasury.reservation.cancel',
  'treasury.reservation.expire'
)
WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE
ON DUPLICATE KEY UPDATE scope=role_permissions.scope;
