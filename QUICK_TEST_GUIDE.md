# 🚀 Quick Test Guide - Permission System

## 📍 Server Info
**URL:** http://localhost:8080  
**Status:** ✅ RUNNING

---

## 🔑 Test Accounts

| User | Password | Role | Key Test |
|------|----------|------|----------|
| **drts** | drts123 | TS | ❌ Cannot see cost |
| **staff** | staff123 | Staff | ✅ Can see cost |
| **budi** | budi123 | Operator | 🔒 Limited access |
| **owner** | owner123 | Owner | ✅ Full access |

---

## ⚡ Quick Tests

### 1️⃣ Test TS (No Cost) - 2 minutes

```
1. Login: drts / drts123
2. Press F12 (DevTools)
3. Console:
   AUTH.can('cost.view')        // false ✅
   AUTH.can('target.create')    // true ✅
4. Visual:
   ❌ No "Cost Produksi" menu
   ❌ No price in Inventory
   ✅ Can see "Target" menu
```

### 2️⃣ Test Staff (With Cost) - 2 minutes

```
1. Login: staff / staff123
2. Console:
   AUTH.can('cost.view')        // true ✅
   AUTH.can('target.edit')      // false ✅
3. Visual:
   ✅ "Cost Produksi" menu visible
   ✅ Price in Inventory visible
   ❌ Cannot edit target
```

### 3️⃣ Test Operator (Limited) - 2 minutes

```
1. Login: budi / budi123
2. Console:
   AUTH.can('log.create')       // true ✅
   AUTH.can('kandang.create')   // false ✅
3. Visual:
   ❌ No "Add Kandang" button
   ✅ Can input daily log
   🔒 Only see assigned kandang
```

---

## 🎯 Pass Criteria

- [ ] TS: `AUTH.can('cost.view')` = **false**
- [ ] Staff: `AUTH.can('cost.view')` = **true**
- [ ] Operator: `AUTH.can('kandang.create')` = **false**
- [ ] No console errors
- [ ] UI elements hidden/shown correctly

---

## 🐛 Quick Fix

**Issue:** Permissions not loading
```javascript
localStorage.clear();
location.reload();
```

**Issue:** UI not updating
```javascript
PermissionGuards.applyAll();
```

---

## 📊 Console Commands

```javascript
// Check current user
AUTH.role                        // "ts" | "staff" | "operator" | "owner"
AUTH.getPermissions().length     // 22 | 21 | 11 | 43

// Test permissions
AUTH.can('cost.view')            // true/false
AUTH.can('target.create')        // true/false
AUTH.can('kandang.create')       // true/false

// Debug
console.table(AUTH.getPermissions())
```

---

**Total Test Time:** ~10 minutes  
**Expected Result:** All tests PASS ✅
