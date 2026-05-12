-- =====================================================
-- ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Helper function
CREATE OR REPLACE FUNCTION assign_permissions_to_role(
  p_role VARCHAR,
  p_permission_codes TEXT[]
)
RETURNS VOID AS $$
DECLARE
  perm_code TEXT;
  perm_id UUID;
BEGIN
  FOREACH perm_code IN ARRAY p_permission_codes
  LOOP
    SELECT id INTO perm_id FROM permissions WHERE code = perm_code;
    IF perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role, permission_id)
      VALUES (p_role, perm_id)
      ON CONFLICT (role, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- OWNER: Full Access
SELECT assign_permissions_to_role('owner', ARRAY[
  'kandang.view', 'kandang.view_all', 'kandang.create', 'kandang.edit', 'kandang.delete',
  'log.view', 'log.create', 'log.edit', 'log.delete', 'log.complete',
  'cost.view', 'cost.edit', 'cost.report',
  'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.delete',
  'target.view', 'target.create', 'target.edit', 'target.delete',
  'visit.view', 'visit.create', 'visit.edit', 'visit.delete', 'visit.complete',
  'medication.view', 'medication.create', 'medication.edit', 'medication.delete', 'medication.execute',
  'inventory.view', 'inventory.view_cost', 'inventory.edit',
  'member.view', 'member.invite', 'member.edit', 'member.remove',
  'settings.view', 'settings.edit',
  'report.view', 'report.export', 'report.cost'
]);

-- MANAGER: Full Access KECUALI DELETE KANDANG
SELECT assign_permissions_to_role('manager', ARRAY[
  'kandang.view', 'kandang.view_all', 'kandang.create', 'kandang.edit',
  'log.view', 'log.create', 'log.edit', 'log.delete', 'log.complete',
  'cost.view', 'cost.edit', 'cost.report',
  'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.delete',
  'target.view', 'target.create', 'target.edit', 'target.delete',
  'visit.view', 'visit.create', 'visit.edit', 'visit.delete', 'visit.complete',
  'medication.view', 'medication.create', 'medication.edit', 'medication.delete', 'medication.execute',
  'inventory.view', 'inventory.view_cost', 'inventory.edit',
  'member.view', 'member.invite', 'member.edit', 'member.remove',
  'settings.view', 'settings.edit',
  'report.view', 'report.export', 'report.cost'
]);

-- TS: Monitoring + Target, TANPA COST
SELECT assign_permissions_to_role('ts', ARRAY[
  'kandang.view', 'kandang.view_all',
  'log.view',
  'target.view', 'target.create', 'target.edit', 'target.delete',
  'visit.view', 'visit.create', 'visit.edit', 'visit.delete', 'visit.complete',
  'medication.view', 'medication.create', 'medication.edit', 'medication.delete', 'medication.execute',
  'inventory.view',
  'member.view',
  'settings.view',
  'report.view', 'report.export'
]);

-- STAFF: Input Pengiriman + Cost
SELECT assign_permissions_to_role('staff', ARRAY[
  'kandang.view', 'kandang.view_all',
  'log.view',
  'cost.view', 'cost.edit', 'cost.report',
  'delivery.view', 'delivery.create', 'delivery.edit', 'delivery.delete',
  'target.view',
  'visit.view',
  'medication.view',
  'inventory.view', 'inventory.view_cost', 'inventory.edit',
  'member.view',
  'settings.view',
  'report.view', 'report.export', 'report.cost'
]);

-- OPERATOR: Input Harian Saja
SELECT assign_permissions_to_role('operator', ARRAY[
  'kandang.view',
  'log.view', 'log.create', 'log.complete',
  'target.view',
  'visit.view',
  'medication.view', 'medication.execute',
  'inventory.view',
  'settings.view',
  'report.view'
]);

-- VIEWER: Read-Only
SELECT assign_permissions_to_role('viewer', ARRAY[
  'kandang.view', 'kandang.view_all',
  'log.view',
  'target.view',
  'visit.view',
  'medication.view',
  'inventory.view',
  'member.view',
  'settings.view',
  'report.view'
]);

-- Cleanup
DROP FUNCTION IF EXISTS assign_permissions_to_role(VARCHAR, TEXT[]);

-- Verify
SELECT 
  r.role,
  COUNT(*) as permission_count
FROM role_permissions r
GROUP BY r.role
ORDER BY r.role;
