# Firebase Cloud Functions - Vote Counting Setup

## Overview
This Cloud Function ensures accurate vote counting even under high load by processing votes server-side with idempotency guarantees.

## Architecture

### Vote Flow
1. **Client** creates vote document in `votes/{voteId}` collection
2. **Cloud Function** (`onVoteCreate`) triggers automatically
3. **Function** increments report counts in a transaction
4. **Function** marks vote as applied with `appliedAt` timestamp (idempotency)

### Idempotency Mechanism
- Each vote can only increment counts once
- `appliedAt` field prevents duplicate processing
- Even if function retries, counts remain accurate

## Files Created

### 1. `/functions/package.json`
Dependencies and scripts for Cloud Functions

### 2. `/functions/tsconfig.json`
TypeScript configuration

### 3. `/functions/src/index.ts`
Two Cloud Functions:
- `onVoteCreate` - Automatically triggered on vote creation
- `recalculateReportCounts` - Manual count repair function

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd /Users/abolajifilani/Desktop/ansrd\ labs\ route/roadpulse/functions
npm install
```

This installs:
- `firebase-functions` - Cloud Functions SDK
- `firebase-admin` - Admin SDK for Firestore access
- `typescript` - TypeScript compiler

### Step 2: Build TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` folder.

### Step 3: Test Locally (Optional)

```bash
# Start Firebase emulators
npm run serve
```

This runs functions locally for testing before deployment.

### Step 4: Deploy to Firebase

```bash
# Deploy functions
npm run deploy

# Or deploy from project root
cd ..
firebase deploy --only functions
```

### Step 5: Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **routepulse-5701f**
3. Navigate to **Functions** section
4. Verify `onVoteCreate` is listed and active

## Function Details

### onVoteCreate

**Trigger**: `onCreate` for `votes/{voteId}` documents

**Process Flow**:
```typescript
1. New vote document created
   └─> Function triggers

2. Transaction starts
   ├─> Read vote document
   ├─> Check appliedAt (idempotency)
   │   └─> If exists: Exit (already processed)
   ├─> Read report document
   ├─> Increment upvotes or downvotes
   └─> Set appliedAt timestamp on vote

3. Transaction commits
   └─> Counts updated atomically
```

**Idempotency Check**:
```typescript
if (currentVoteData.appliedAt) {
  console.log(`Vote ${voteId} already applied`);
  return; // Exit without incrementing again
}
```

**Count Logic**:
```typescript
if (value === 1) {
  // Upvote
  newUpvotes = currentUpvotes + 1;
  update({ upvotes: newUpvotes });
} else if (value === -1) {
  // Downvote
  newDownvotes = currentDownvotes + 1;
  update({ downvotes: newDownvotes });
}
```

### recalculateReportCounts

**Type**: `onCall` (manually invoked)

**Purpose**: Fix inconsistent counts if needed

**Usage**:
```typescript
// From client
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const recalculate = httpsCallable(functions, 'recalculateReportCounts');

const result = await recalculate({ reportId: 'abc123' });
console.log(result.data); // { success: true, upvotes: 15, downvotes: 3 }
```

## Database Schema Updates

### Vote Document (Before Function)
```javascript
// votes/{reportId}_{uid}
{
  reportId: "abc123",
  uid: "user456",
  value: 1,
  createdAt: Timestamp
}
```

### Vote Document (After Function)
```javascript
// votes/{reportId}_{uid}
{
  reportId: "abc123",
  uid: "user456",
  value: 1,
  createdAt: Timestamp,
  appliedAt: Timestamp  // ← Added by Cloud Function
}
```

### Report Document
```javascript
// reports/{reportId}
{
  upvotes: 15,    // ← Incremented by Cloud Function
  downvotes: 3,   // ← Incremented by Cloud Function
  // ... other fields
}
```

## Client Code Changes

The client no longer updates counts directly:

**Before** (Client-side count update):
```typescript
transaction.set(voteRef, { reportId, uid, value, createdAt });
transaction.update(reportRef, { upvotes: currentUpvotes + 1 }); // ❌ Removed
```

**After** (Cloud Function handles counts):
```typescript
transaction.set(voteRef, { reportId, uid, value, createdAt });
// Cloud Function will increment counts automatically ✅
```

## Why This Approach?

### ✅ Advantages

**1. Idempotency**
- Function can be retried safely
- Counts never increment twice
- `appliedAt` marker prevents duplicates

**2. Accuracy Under Load**
- Server-side transactions
- No race conditions
- Counts always match vote count

**3. Separation of Concerns**
- Client: Create vote document
- Server: Update counts
- Clear responsibility split

**4. Automatic Retry**
- Cloud Functions auto-retry on failure
- No manual error handling needed
- Eventually consistent

**5. Auditability**
- Function logs all operations
- Can verify counts vs votes
- Easy debugging

### ⚠️ Considerations

**Eventual Consistency**
- Small delay (milliseconds) between vote creation and count update
- UI shows optimistic update immediately
- Actual count updates within ~100-500ms

**Cost**
- Each vote triggers a function invocation
- Free tier: 2 million invocations/month
- Should be sufficient for most use cases

## Monitoring

### Check Function Logs

```bash
# View recent logs
firebase functions:log

# Follow logs in real-time
firebase functions:log --only onVoteCreate
```

### Firebase Console
1. Go to Functions section
2. Click on `onVoteCreate`
3. View **Logs** tab
4. Check for errors or performance issues

### Verify Counts

```bash
# In Firebase Console > Firestore
# Compare:
# - votes collection (count documents)
# - reports document (upvotes + downvotes)
# Should match!
```

## Testing Strategy

### 1. Single Vote Test
```typescript
// Create vote
await addDoc(collection(db, 'votes'), {
  reportId: 'test123',
  uid: 'user1',
  value: 1,
  createdAt: serverTimestamp()
});

// Wait 1 second
await new Promise(resolve => setTimeout(resolve, 1000));

// Check report
const report = await getDoc(doc(db, 'reports', 'test123'));
console.log(report.data().upvotes); // Should be incremented
```

### 2. Concurrent Votes Test
```typescript
// Create 10 votes simultaneously
const promises = [];
for (let i = 0; i < 10; i++) {
  promises.push(
    addDoc(collection(db, 'votes'), {
      reportId: 'test123',
      uid: `user${i}`,
      value: 1,
      createdAt: serverTimestamp()
    })
  );
}
await Promise.all(promises);

// Wait 2 seconds
await new Promise(resolve => setTimeout(resolve, 2000));

// Check report
const report = await getDoc(doc(db, 'reports', 'test123'));
console.log(report.data().upvotes); // Should be exactly 10
```

### 3. Idempotency Test
```typescript
// Manually trigger function twice with same vote
// (This would normally only happen due to retries)

// Count should only increment once
// appliedAt should prevent second increment
```

## Troubleshooting

### Issue: Counts Not Updating

**Check**:
1. Function deployed: `firebase functions:list`
2. Function active: Check Firebase Console
3. Logs for errors: `firebase functions:log`

**Solution**:
```bash
firebase deploy --only functions
```

### Issue: Counts Off By One

**Cause**: Vote created before function deployed

**Solution**: Use `recalculateReportCounts`
```typescript
const result = await recalculate({ reportId: 'problem-report-id' });
```

### Issue: Function Timeout

**Cause**: Large transaction or network issue

**Solution**: Functions auto-retry, no action needed

### Issue: Duplicate Counts

**Check**: Vote document has `appliedAt` field

**If missing**: Idempotency not working
```bash
# Redeploy function
firebase deploy --only functions --force
```

## Cost Estimation

### Free Tier (Spark Plan)
- 2M invocations/month
- 400K GB-seconds/month
- 200K CPU-seconds/month

### Blaze Plan (Pay-as-you-go)
- First 2M invocations: Free
- Additional: $0.40 per million

### Example Usage
- 10,000 votes/month → Free
- 100,000 votes/month → Free
- 5,000,000 votes/month → ~$1.20/month

## Next Steps

1. **Deploy Function**: `cd functions && npm install && npm run deploy`
2. **Test Vote**: Create a test vote and verify count updates
3. **Monitor Logs**: Check for any errors
4. **Update Firestore Rules**: Ensure votes collection allows writes
5. **Performance Test**: Try concurrent votes

## Related Files

- `functions/src/index.ts` - Function implementation
- `src/hooks/useVote.ts` - Client-side vote submission
- `src/app/r/[id]/page.tsx` - Vote UI
- `FIREBASE-STORAGE-SETUP.md` - Storage rules documentation

## Support Resources

- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Cloud Functions Pricing](https://firebase.google.com/pricing)
