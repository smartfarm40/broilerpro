# 🧪 Test Permission System

## Manual Testing Checklist

### Test 1: Login sebagai Owner
```
1. Login dengan user owner (u1)
2. Verify:
   ✅ Bisa lihat semua menu
   ✅ Bisa lihat cost/harga
   ✅ Bisa tambah kandang
   ✅ Bisa edit target
   ✅ Bisa undang anggota
   ✅ Console: AUTH.can('cost.view') === true
   ✅ Console: AUTH.getPermissions().length === 43
```

### Test 2: Login sebagai TS
```
1. Login dengan user TS (u5 - drts)
2. Verify:
   ❌ TIDAK bisa lihat cost/harga
   ❌ TIDAK bisa lihat menu "Cost Produksi"
   ❌ TIDAK bisa lihat menu "Pengiriman"
   ❌ Inventory TIDAK menampilkan harga
   ✅ Bisa lihat semua kandang
   ✅ Bisa buat target
   ✅ Bisa buat jadwal kunjungan
   ✅ Console: AUTH.can('cost.view') === false
   ✅ Console: AUTH.can('target.create') === true
   ✅ Console: AUTH.getPermissions().length === 22
```

### Test 3: Login sebagai Staff
```
1. Login dengan user Staff (u7 - staff)
2. Verify:
   ✅ Bisa lihat cost/harga
   ✅ Bisa lihat menu "Cost Produksi"
   ✅ Bisa lihat menu "Pengiriman"
   ✅ Inventory menampilkan harga
   ❌ TIDAK bisa edit target
   ❌ TIDAK bisa buat jadwal kunjungan
   ✅ Console: AUTH.can('cost.view') === true
   ✅ Console: AUTH.can('target.edit') === false
   ✅ Console: AUTH.getPermissions().length === 21
```

### Test 4: Login sebagai Operator
```
1. Login dengan user Operator (u2 - budi)
2. Verify:
   ❌ TIDAK bisa lihat cost/harga
   ❌ TIDAK bisa tambah kandang
   ❌ Hanya bisa lihat kandang assigned (K1)
   ✅ Bisa input laporan harian
   ✅ Bisa selesaikan hari
   ❌ TIDAK bisa edit laporan
   ✅ Console: AUTH.can('log.create') === true
   ✅ Console: AUTH.can('kandang.create') === false
   ✅ Console: AUTH.getPermissions().length === 11
```

### Test 5: Permission Caching
```
1. Login sebagai TS
2. Open DevTools > Application > Local Storage
3. Verify:
   ✅ Key: bt_permissions_<user_id> exists
   ✅ Value contains array of 22 permissions
   ✅ Timestamp is recent
4. Reload page
5. Verify:
   ✅ Permissions loaded from cache (no DB query)
   ✅ AUTH.can() works immediately
```

### Test 6: Permission Reload
```
1. Login sebagai Operator
2. Console: await AUTH.reloadPermissions()
3. Verify:
   ✅ Cache cleared
   ✅ New permissions loaded from DB
   ✅ AUTH.can() still works
```

---

## SQL Testing

### Test Database Functions

```sql
-- Test 1: Check owner permission
SELECT user_has_permission('u1', 'cost.view');
-- Expected: true

-- Test 2: Check TS permission (should be false)
SELECT user_has_permission('u5', 'cost.view');
-- Expected: false

-- Test 3: Check TS can create target
SELECT user_has_permission('u5', 'target.create');
-- Expected: true

-- Test 4: Get all permissions for TS
SELECT * FROM get_user_permissions('u5');
-- Expected: 22 rows

-- Test 5: Get all permissions for operator
SELECT * FROM get_user_permissions('u2');
-- Expected: 11 rows

-- Test 6: Verify role-permission mappings
SELECT 
  r.role,
  COUNT(*) as permission_count
FROM role_permissions r
GROUP BY r.role
ORDER BY r.role;
-- Expected:
-- manager:  43
-- operator: 11
-- owner:    43
-- staff:    21
-- ts:       22
-- viewer:   10
```

---

## Browser Console Testing

### Test AUTH Object

```javascript
// Test 1: Check if AUTH is initialized
console.log('Logged in:', AUTH.isLoggedIn);
console.log('User ID:', AUTH.userId);
console.log('Role:', AUTH.role);

// Test 2: Check permissions loaded
console.log('Permissions:', AUTH.getPermissions());
console.log('Permission count:', AUTH.getPermissions().length);

// Test 3: Test can() method
console.log('Can view cost:', AUTH.can('cost.view'));
console.log('Can create kandang:', AUTH.can('kandang.create'));
console.log('Can create target:', AUTH.can('target.create'));

// Test 4: Test canAny()
console.log('Can create OR edit kandang:', 
  AUTH.canAny('kandang.create', 'kandang.edit'));

// Test 5: Test canAll()
console.log('Can create AND edit kandang:', 
  AUTH.canAll('kandang.create', 'kandang.edit'));

// Test 6: Check cache
const cacheKey = 'bt_permissions_' + AUTH.userId;
const cached = localStorage.getItem(cacheKey);
console.log('Cached permissions:', JSON.parse(cached));
```

### Test Permission Guards

```javascript
// Test 1: Check if guards applied
console.log('PermissionGuards:', PermissionGuards);

// Test 2: Manual apply
PermissionGuards.applyAll();

// Test 3: Check permission before action
const canCreate = PermissionGuards.checkPermission(
  'kandang.create', 
  'tambah kandang'
);
console.log('Can create kandang:', canCreate);

// Test 4: Test guard wrapper
const guardedFn = PermissionGuards.guard(
  'kandang.delete',
  'hapus kandang',
  function(id) {
    console.log('Deleting kandang:', id);
  }
);
guardedFn('K1'); // Will show error if no permission
```

---

## UI Testing

### Test Cost Hidden from TS

1. Login sebagai TS (u5)
2. Navigate to Dashboard
3. Verify:
   - [ ] No cost/price information visible
   - [ ] No "Total Cost" KPI
   - [ ] No "Profit" KPI

4. Navigate to Inventory
5. Verify:
   - [ ] Quantity shown
   - [ ] Price column hidden
   - [ ] Total value hidden

6. Navigate to Reports
7. Verify:
   - [ ] Growth report visible
   - [ ] Mortality report visible
   - [ ] Cost report hidden

### Test Operator Limited Access

1. Login sebagai Operator (u2)
2. Navigate to Kandang
3. Verify:
   - [ ] Only assigned kandang (K1) visible
   - [ ] "Tambah Kandang" button hidden
   - [ ] Cannot see other kandangs

4. Navigate to Daily Log
5. Verify:
   - [ ] Can input data
   - [ ] Can complete day
   - [ ] Cannot edit previous days

### Test Staff Can See Cost

1. Login sebagai Staff (u7)
2. Navigate to Dashboard
3. Verify:
   - [ ] Cost/price information visible
   - [ ] "Total Cost" KPI visible
   - [ ] "Profit" KPI visible

4. Navigate to Inventory
5. Verify:
   - [ ] Quantity shown
   - [ ] Price column visible
   - [ ] Total value visible

---

## Performance Testing

### Test Permission Caching

```javascript
// Test 1: First load (from DB)
console.time('First load');
await AUTH.init();
console.timeEnd('First load');
// Expected: ~200-500ms

// Test 2: Second load (from cache)
localStorage.clear();
await AUTH.init();
console.time('Second load');
await AUTH.init();
console.timeEnd('Second load');
// Expected: <50ms

// Test 3: Permission check speed
console.time('Permission check');
for (let i = 0; i < 1000; i++) {
  AUTH.can('cost.view');
}
console.timeEnd('Permission check');
// Expected: <10ms (O(1) lookup)
```

---

## Error Handling Testing

### Test Invalid Permission

```javascript
// Test 1: Check non-existent permission
console.log(AUTH.can('invalid.permission'));
// Expected: false (no error)

// Test 2: Check with null/undefined
console.log(AUTH.can(null));
// Expected: false (no error)

// Test 3: Check before login
localStorage.clear();
console.log(AUTH.can('cost.view'));
// Expected: false (no error)
```

---

## Regression Testing

### Test Existing Features Still Work

1. Login
   - [ ] Login works
   - [ ] Session persisted
   - [ ] Profile loaded

2. Dashboard
   - [ ] KPIs displayed
   - [ ] Charts rendered
   - [ ] Recent activity shown

3. Daily Log
   - [ ] Can input data
   - [ ] Can save progress
   - [ ] Can complete day

4. Kandang
   - [ ] List displayed
   - [ ] Can add kandang (if permission)
   - [ ] Can view details

5. Settings
   - [ ] Profile displayed
   - [ ] Can update settings (if permission)
   - [ ] Team members shown (if permission)

---

## Test Results Template

```
Date: ___________
Tester: ___________

Test 1: Owner Login
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 2: TS Login (No Cost)
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 3: Staff Login (With Cost)
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 4: Operator Login (Limited)
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 5: Permission Caching
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 6: UI Guards
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 7: Performance
- [ ] PASS  [ ] FAIL  Notes: ___________

Test 8: Error Handling
- [ ] PASS  [ ] FAIL  Notes: ___________

Overall Result: [ ] PASS  [ ] FAIL
```

---

## Known Issues

None at this time.

---

## Next Steps

After all tests pass:
1. Deploy to staging
2. User acceptance testing
3. Deploy to production
4. Monitor for issues

---

**Last Updated:** 2026-05-10  
**Status:** Ready for Testing
