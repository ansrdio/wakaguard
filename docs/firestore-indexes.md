# Firestore Composite Indexes Required

**Purpose:** Document all required Firestore composite indexes for RoadPulse queries to function in production.

**Status:** ⚠️ Indexes must be created before production deployment

---

## 📋 Required Indexes

### 1. Reports by State and Status (Primary Query)

**Collection:** `reports`

**Fields:**
1. `state` (Ascending)
2. `status` (Ascending)
3. `createdAt` (Descending)

**Used by:** `src/hooks/useReports.ts`

**Query:**
```typescript
query(
  collection(db, 'reports'),
  where('state', '==', selectedState),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(200)
)
```

**Firebase Console Command:**
```bash
firebase firestore:indexes:create \
  --collection-group=reports \
  --query-scope=COLLECTION \
  --field=state,asc \
  --field=status,asc \
  --field=createdAt,desc
```

---

### 2. Comments by Report (Active Only)

**Collection:** `comments`

**Fields:**
1. `reportId` (Ascending)
2. `status` (Ascending)
3. `createdAt` (Descending)

**Used by:** `src/hooks/useComments.ts`

**Query:**
```typescript
query(
  collection(db, 'comments'),
  where('reportId', '==', reportId),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc')
)
```

**Firebase Console Command:**
```bash
firebase firestore:indexes:create \
  --collection-group=comments \
  --query-scope=COLLECTION \
  --field=reportId,asc \
  --field=status,asc \
  --field=createdAt,desc
```

---

### 3. Flags by Type and Status

**Collection:** `flags`

**Fields:**
1. `targetType` (Ascending)
2. `status` (Ascending)
3. `createdAt` (Descending)

**Used by:** `src/hooks/useFlags.ts` (Admin moderation)

**Query:**
```typescript
query(
  collection(db, 'flags'),
  where('targetType', '==', type),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
)
```

**Firebase Console Command:**
```bash
firebase firestore:indexes:create \
  --collection-group=flags \
  --query-scope=COLLECTION \
  --field=targetType,asc \
  --field=status,asc \
  --field=createdAt,desc
```

---

### 4. Votes by Report and User (Duplicate Prevention)

**Collection:** `votes`

**Fields:**
1. `reportId` (Ascending)
2. `uid` (Ascending)

**Used by:** Vote lookup and validation

**Query:**
```typescript
query(
  collection(db, 'votes'),
  where('reportId', '==', reportId),
  where('uid', '==', uid)
)
```

**Firebase Console Command:**
```bash
firebase firestore:indexes:create \
  --collection-group=votes \
  --query-scope=COLLECTION \
  --field=reportId,asc \
  --field=uid,asc
```

---

### 5. Safety Timers by User (Active Only)

**Collection:** `safetyTimers`

**Fields:**
1. `uid` (Ascending)
2. `acknowledged` (Ascending)
3. `expiresAt` (Ascending)

**Used by:** Safety timer checks

**Query:**
```typescript
query(
  collection(db, 'safetyTimers'),
  where('uid', '==', uid),
  where('acknowledged', '==', false),
  where('expiresAt', '<', now)
)
```

**Firebase Console Command:**
```bash
firebase firestore:indexes:create \
  --collection-group=safetyTimers \
  --query-scope=COLLECTION \
  --field=uid,asc \
  --field=acknowledged,asc \
  --field=expiresAt,asc
```

---

### 6. Alerts by User and Type

**Collection:** `alerts`

**Fields:**
1. `uid` (Ascending)
2. `type` (Ascending)
3. `createdAt` (Descending)

**Used by:** Safety alert history

**Query:**
```typescript
query(
  collection(db, 'alerts'),
  where('uid', '==', uid),
  where('type', '==', 'sos'),
  orderBy('createdAt', 'desc')
)
```

**Firebase Console Command:**
```bash
firebase firestore:indexes:create \
  --collection-group=alerts \
  --query-scope=COLLECTION \
  --field=uid,asc \
  --field=type,asc \
  --field=createdAt,desc
```

---

## 🚀 Creating Indexes

### Method 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **RoadPulse**
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Select collection group and add fields from above
6. Click **Create**
7. Wait for index to build (can take minutes to hours depending on data size)

**Status Check:**
- Building: Yellow indicator
- Ready: Green checkmark
- Error: Red X (check field names match exactly)

---

### Method 2: Firebase CLI

Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "state", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reportId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "flags",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "targetType", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "votes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reportId", "order": "ASCENDING" },
        { "fieldPath": "uid", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "safetyTimers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "acknowledged", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "alerts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

---

### Method 3: Automatic Index Creation (Development Only)

When running queries in development, Firestore will show error messages with direct links to create missing indexes:

```
The query requires an index. You can create it here:
https://console.firebase.google.com/project/roadpulse-xyz/firestore/indexes?create_composite=...
```

**Warning:** Only use this in development. Always create indexes manually for production before deploying.

---

## 📊 Index Management

### Monitoring Index Usage

1. Go to **Firestore Database** → **Indexes**
2. Check **Status** column:
   - 🟢 Ready: Index is active
   - 🟡 Building: Index creation in progress
   - 🔴 Error: Index creation failed

3. **Serving** column shows if queries are using the index

### Deleting Unused Indexes

```bash
firebase firestore:indexes:delete <index-id>
```

**Before deleting:**
- Verify no queries use the index (check code)
- Test in staging with index disabled
- Monitor for "index required" errors

---

## ⚠️ Common Issues

### Issue 1: Index Already Exists
**Error:** "Index with these fields already exists"

**Solution:** Check existing indexes in console, may have been auto-created during development.

---

### Issue 2: Field Name Mismatch
**Error:** "Index build failed - field not found"

**Solution:** 
- Verify field names match exactly (case-sensitive)
- Check Firestore collection for actual field names
- Ensure documents have the fields (not all optional)

---

### Issue 3: Slow Index Build
**Symptom:** Index stuck in "Building" for hours

**Solution:**
- Large collections (>100k docs) take time
- Check Firebase Console for build progress
- Contact Firebase support if stuck >24h

---

### Issue 4: Query Still Fails After Index Created
**Error:** "The query requires an index"

**Solution:**
- Index may still be building (check status)
- Clear browser cache and reload
- Verify index field order matches query exactly
- Check queryScope is COLLECTION not COLLECTION_GROUP

---

## 🧪 Testing Index Performance

### Verify Index is Used

1. Enable Firestore debug logging:
```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

// Check if query uses index
const q = query(...);
console.log('Query:', q);
```

2. Check Firebase Console → **Usage** tab
   - Document reads should be low
   - Index scans should be high

### Performance Benchmarks

| Query Type | Without Index | With Index |
|------------|---------------|------------|
| Reports by state | ~200 reads | ~5 reads |
| Comments by reportId | ~100 reads | ~3 reads |
| Flags by type | ~50 reads | ~2 reads |

**Goal:** Composite indexes should reduce reads by 95%+

---

## 📝 Index Maintenance Checklist

- [ ] All 6 indexes created in Firebase Console
- [ ] Index status shows "Ready" (green)
- [ ] Queries tested in staging environment
- [ ] No "index required" errors in console
- [ ] Performance verified (low document reads)
- [ ] `firestore.indexes.json` committed to repo
- [ ] Team notified of index requirements
- [ ] Documentation updated if queries change

---

## 🔗 Resources

- [Firestore Index Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Query Limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations)

---

**Last Updated:** January 2026  
**Next Review:** When adding new complex queries
