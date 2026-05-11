# 🧪 Testing Instructions - Permission System

## 🚀 Server Running

**Server Status:** ✅ RUNNING  
**URL:** http://localhost:8080  
**Port:** 8080

---

## 📋 Test Accounts

Gunakan akun berikut untuk testing:

| Username | Password | Role | Permissions | Test Focus |
|----------|----------|------|-------------|------------|
| **owner** | owner123 | Owner | 43 (Full) | Full access |
| **drts** | drts123 | TS | 22 (No Cost) | **Cannot see cost** ✨ |
| **staff** | staff123 | Staff | 21 (With Cost) | Can manage cost |
| **budi** | budi123 | Operator | 11 (Limited) | Limited to assigned kandang |

---

## 🎯 Test Scenarios

### Test 1: TS Cannot See Cost ⭐ PRIORITY

**Steps:**
1. Open browser: http://localhost:8080
2. Login dengan:
   - Username: `drts`
   - Password: `drts123`
3. Setelah login, buka **DevTools Console** (F12)
4. Jalankan commands berikut:

```javascript
// Check role
console.log('Role:', AUTH.role);
// Expected: "ts"

// Check permissions count
console.log('Total permissions:', AUTH.getPermissions().length);
// Expected: 22

// Check cost permission (SHOULD BE FALSE)
console.log('Can view cost:', AUTH.can('cost.view'));
// Expected: false ✅

// Check target permission (SHOULD BE TRUE)
console.log('Can create target:', AUTH.can('target.create'));
// Expected: true ✅

// List all permissions
console.log('All permissions:', AUTH.getPermissions());
```

**Visual Checks:**
- [ ] ❌ Menu "Cost Produksi" TIDAK terlihat
- [ ] ❌ Menu "Pengiriman" TIDAK terlihat
- [ ] ✅ Menu "Target" terlihat
- [ ] ✅ Menu "Jadwal Kunjungan" terlihat
- [ ] ❌ Dashboard TIDAK menampilkan KPI "Total Cost"
- [ ] ❌ Dashboard TIDAK menampilkan KPI "Profit"

**Navigate to Inventory:**
- [ ] ✅ Kolom "Jumlah" terlihat
- [ ] ❌ Kolom "Harga" TIDAK terlihat
- [ ] ❌ Kolom "Total Nilai" TIDAK terlihat

**Expected Result:** ✅ TS TIDAK bisa lihat cost/harga sama sekali

---

### Test 2: Staff Can See Cost

**Steps:**
1. Logout (jika masih login sebagai TS)
2. Login dengan:
   - Username: `staff`
   - Password: `staff123`
3. Open DevTools Console (F12)

```javascript
// Check role
console.log('Role:', AUTH.role);
// Expected: "staff"

// Check cost permission (SHOULD BE TRUE)
console.log('Can view cost:', AUTH.can('cost.view'));
// Expected: true ✅

// Check delivery permission (SHOULD BE TRUE)
console.log('Can create delivery:', AUTH.can('delivery.create'));
// Expected: true ✅

// Check target edit (SHOULD BE FALSE)
console.log('Can edit target:', AUTH.can('target.edit'));
// Expected: false ✅
```

**Visual Checks:**
- [ ] ✅ Menu "Cost Produksi" terlihat
- [ ] ✅ Menu "Pengiriman" terlihat
- [ ] ✅ Dashboard menampilkan KPI "Total Cost"
- [ ] ✅ Dashboard menampilkan KPI "Profit"
- [ ] ❌ Tombol "Edit Target" TIDAK terlihat

**Navigate to Inventory:**
- [ ] ✅ Kolom "Jumlah" terlihat
- [ ] ✅ Kolom "Harga" terlihat
- [ ] ✅ Kolom "Total Nilai" terlihat

**Expected Result:** ✅ Staff bisa lihat cost, tapi tidak bisa edit target

---

### Test 3: Operator Limited Access

**Steps:**
1. Logout
2. Login dengan:
   - Username: `budi`
   - Password: `budi123`
3. Open DevTools Console (F12)

```javascript
// Check role
console.log('Role:', AUTH.role);
// Expected: "operator"

// Check permissions
console.log('Can create log:', AUTH.can('log.create'));
// Expected: true ✅

console.log('Can create kandang:', AUTH.can('kandang.create'));
// Expected: false ✅

console.log('Can view cost:', AUTH.can('cost.view'));
// Expected: false ✅
```

**Visual Checks:**
- [ ] ❌ Tombol "Tambah Kandang" TIDAK terlihat
- [ ] ❌ Menu "Cost Produksi" TIDAK terlihat
- [ ] ✅ Bisa input laporan harian
- [ ] ✅ Bisa selesaikan hari
- [ ] ❌ Hanya bisa lihat kandang assigned (K1)

**Expected Result:** ✅ Operator terbatas ke kandang assigned, tidak bisa lihat cost

---

### Test 4: Owner Full Access

**Steps:**
1. Logout
2. Login dengan:
   - Username: `owner`
   - Password: `owner123`
3. Open DevTools Console (F12)

```javascript
// Check role
console.log('Role:', AUTH.role);
// Expected: "owner"

// Check permissions count
console.log('Total permissions:', AUTH.getPermissions().length);
// Expected: 43

// Check all permissions
console.log('Can view cost:', AUTH.can('cost.view'));
// Expected: true ✅

console.log('Can create kandang:', AUTH.can('kandang.create'));
// Expected: true ✅

console.log('Can edit target:', AUTH.can('target.edit'));
// Expected: true ✅
```

**Visual Checks:**
- [ ] ✅ Semua menu terlihat
- [ ] ✅ Semua tombol aktif
- [ ] ✅ Bisa lihat cost/harga
- [ ] ✅ Bisa tambah kandang
- [ ] ✅ Bisa edit target

**Expected Result:** ✅ Owner punya full access

---

## 🔍 Advanced Testing

### Test 5: Permission Caching

```javascript
// Check cache
const cacheKey = 'bt_permissions_' + AUTH.userId;
const cached = localStorage.getItem(cacheKey);
console.log('Cached permissions:', JSON.parse(cached));

// Check timestamp
const data = JSON.parse(cached);
const age = Date.now() - data.timestamp;
console.log('Cache age (ms):', age);
console.log('Cache age (minutes):', Math.floor(age / 60000));
// Expected: < 60 minutes

// Reload permissions
await AUTH.reloadPermissions();
console.log('Permissions reloaded');
```

### Test 6: Permission Guards

```javascript
// Check if guards applied
console.log('PermissionGuards:', PermissionGuards);

// Manual apply
PermissionGuards.applyAll();
console.log('Guards applied');

// Test checkPermission
const canCreate = PermissionGuards.checkPermission(
  'kandang.create', 
  'tambah kandang'
);
console.log('Can create kandang:', canCreate);
// Will show toast if no permission
```

### Test 7: Database Functions (SQL)

Open Supabase SQL Editor dan jalankan:

```sql
-- Test 1: Check TS permission
SELECT user_has_permission('u5', 'cost.view');
-- Expected: false

-- Test 2: Check TS can create target
SELECT user_has_permission('u5', 'target.create');
-- Expected: true

-- Test 3: Get all TS permissions
SELECT * FROM get_user_permissions('u5');
-- Expected: 22 rows

-- Test 4: Verify role-permission mappings
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

## 📊 Test Results Checklist

### ✅ Test 1: TS Cannot See Cost
- [ ] Role is "ts"
- [ ] Permission count is 22
- [ ] `AUTH.can('cost.view')` returns false
- [ ] `AUTH.can('target.create')` returns true
- [ ] Cost menu hidden
- [ ] Delivery menu hidden
- [ ] Inventory price hidden

### ✅ Test 2: Staff Can See Cost
- [ ] Role is "staff"
- [ ] `AUTH.can('cost.view')` returns true
- [ ] `AUTH.can('delivery.create')` returns true
- [ ] `AUTH.can('target.edit')` returns false
- [ ] Cost menu visible
- [ ] Delivery menu visible
- [ ] Inventory price visible

### ✅ Test 3: Operator Limited
- [ ] Role is "operator"
- [ ] Permission count is 11
- [ ] `AUTH.can('log.create')` returns true
- [ ] `AUTH.can('kandang.create')` returns false
- [ ] Only assigned kandang visible
- [ ] Add kandang button hidden

### ✅ Test 4: Owner Full Access
- [ ] Role is "owner"
- [ ] Permission count is 43
- [ ] All menus visible
- [ ] All buttons active
- [ ] Can see cost/price

### ✅ Test 5: Permission Caching
- [ ] Cache exists in localStorage
- [ ] Cache has timestamp
- [ ] Cache age < 60 minutes
- [ ] Reload works

### ✅ Test 6: Permission Guards
- [ ] Guards applied automatically
- [ ] Manual apply works
- [ ] checkPermission shows toast
- [ ] UI elements hidden/shown correctly

---

## 🐛 Troubleshooting

### Issue: Login tidak berhasil
**Solution:**
1. Check console untuk error
2. Verify Supabase connection
3. Check `.env.local` file
4. Verify user exists di database

### Issue: Permissions tidak load
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Reload page
3. Check console untuk error
4. Verify `get_user_permissions()` function exists

### Issue: UI elements tidak hidden
**Solution:**
1. Check if `permission-guards.js` loaded
2. Run `PermissionGuards.applyAll()` manually
3. Check console untuk error
4. Verify permission codes match

### Issue: Cache tidak work
**Solution:**
1. Clear cache: `localStorage.removeItem('bt_permissions_' + AUTH.userId)`
2. Reload permissions: `await AUTH.reloadPermissions()`
3. Check timestamp in cache

---

## 📝 Test Report Template

```
Date: ___________
Tester: ___________
Browser: ___________

Test 1: TS Cannot See Cost
Status: [ ] PASS  [ ] FAIL
Notes: ___________

Test 2: Staff Can See Cost
Status: [ ] PASS  [ ] FAIL
Notes: ___________

Test 3: Operator Limited
Status: [ ] PASS  [ ] FAIL
Notes: ___________

Test 4: Owner Full Access
Status: [ ] PASS  [ ] FAIL
Notes: ___________

Test 5: Permission Caching
Status: [ ] PASS  [ ] FAIL
Notes: ___________

Test 6: Permission Guards
Status: [ ] PASS  [ ] FAIL
Notes: ___________

Overall Result: [ ] PASS  [ ] FAIL

Issues Found:
1. ___________
2. ___________
3. ___________

Recommendations:
1. ___________
2. ___________
3. ___________
```

---

## 🎯 Success Criteria

All tests must pass:
- ✅ TS cannot see cost/price anywhere
- ✅ Staff can see cost/price
- ✅ Operator limited to assigned kandang
- ✅ Owner has full access
- ✅ Permission caching works
- ✅ UI guards applied automatically
- ✅ No console errors
- ✅ Performance acceptable (<500ms load)

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Mark Sprint 1 as complete
2. ✅ Deploy to staging
3. ✅ User acceptance testing
4. ✅ Start Sprint 2 (Jadwal Kunjungan TS)

If tests fail:
1. ❌ Document issues
2. ❌ Fix bugs
3. ❌ Re-test
4. ❌ Repeat until all pass

---

**Server URL:** http://localhost:8080  
**Last Updated:** 2026-05-10  
**Status:** Ready for Testing 🧪
