-- =====================================================
-- REMOVE KANDANG.DELETE PERMISSION FROM MANAGER
-- Hanya Owner yang bisa hapus kandang
-- =====================================================

-- Hapus permission kandang.delete dari role manager
DELETE FROM role_permissions
WHERE role = 'manager'
  AND permission_id = (
    SELECT id FROM permissions WHERE code = 'kandang.delete'
  );

-- Verify: Tampilkan permission kandang untuk semua role
SELECT 
  rp.role,
  p.code as permission_code,
  p.description
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
WHERE p.code LIKE 'kandang.%'
ORDER BY rp.role, p.code;
