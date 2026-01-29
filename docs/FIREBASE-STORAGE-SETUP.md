# Firebase Storage Security Rules - Deployment Guide

## Overview
These security rules ensure safe photo handling for the RoadPulse application with authenticated uploads, size restrictions, and public read access.

## Security Rules Features

### ✅ Authenticated Uploads Only
- Users must be signed in to upload photos
- Users can only upload to their own path: `report_photos/{their-uid}/...`
- Prevents unauthorized uploads and path traversal attacks

### ✅ File Size Restriction
- Maximum file size: **5MB**
- Enforced server-side (in addition to client-side compression)
- Prevents storage abuse

### ✅ Content Type Validation
- Only image files allowed (`image/*`)
- Accepts: `image/jpeg`, `image/png`, `image/webp`, etc.
- Blocks non-image files

### ✅ Public Reads
- Anyone can view photos (authenticated or not)
- Enables easy sharing and public access to reports
- No authentication required to view report photos

### ✅ Owner-Only Deletes
- Only the photo owner can delete their files
- Prevents malicious deletion by other users

## Deployment Instructions

### Option 1: Firebase Console (Recommended for First-Time Setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **routepulse-5701f**
3. Navigate to **Storage** in the left sidebar
4. Click the **Rules** tab
5. Copy the contents of `storage.rules` file
6. Paste into the rules editor
7. Click **Publish**

### Option 2: Firebase CLI (For Developers)

```bash
# 1. Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. Initialize Firebase in your project (if not already done)
cd /Users/abolajifilani/Desktop/ansrd\ labs\ route/roadpulse
firebase init storage

# 4. Deploy storage rules
firebase deploy --only storage
```

## Rule Breakdown

### Path Structure
```
report_photos/{uid}/{reportId}/{filename}
```

- **{uid}**: User's Firebase Auth UID
- **{reportId}**: Firestore document ID of the report
- **{filename}**: UUID-based filename (e.g., `abc123.jpg`)

### Example Valid Path
```
report_photos/xYz123UserId/rpt_456ReportId/uuid-789.jpg
```

### Security Checks on Upload

1. **Authentication Check**: `request.auth != null`
   - User must be signed in

2. **Owner Check**: `request.auth.uid == uid`
   - User can only write to paths containing their own UID

3. **Image Check**: `request.resource.contentType.matches('image/.*')`
   - File must be an image type

4. **Size Check**: `request.resource.size < 5 * 1024 * 1024`
   - File must be under 5MB

## Testing the Rules

### Test Valid Upload (Should Succeed)
```javascript
// User authenticated as uid: "user123"
// Uploading to: report_photos/user123/report456/photo.jpg
// File: image/jpeg, 2MB
// Result: ✅ Success
```

### Test Invalid Upload - Wrong User (Should Fail)
```javascript
// User authenticated as uid: "user123"
// Uploading to: report_photos/user999/report456/photo.jpg
// Result: ❌ Permission Denied
```

### Test Invalid Upload - Too Large (Should Fail)
```javascript
// User authenticated as uid: "user123"
// Uploading to: report_photos/user123/report456/photo.jpg
// File: image/jpeg, 6MB
// Result: ❌ Permission Denied (file too large)
```

### Test Invalid Upload - Not an Image (Should Fail)
```javascript
// User authenticated as uid: "user123"
// Uploading to: report_photos/user123/report456/malicious.exe
// File: application/exe, 1MB
// Result: ❌ Permission Denied (not an image)
```

### Test Public Read (Should Succeed)
```javascript
// User: Not authenticated
// Reading: report_photos/user123/report456/photo.jpg
// Result: ✅ Success (public reads allowed)
```

## Security Best Practices

### ✅ Implemented
- Path-based authorization (users can't access other users' paths)
- File size limits (prevents storage exhaustion)
- Content type validation (prevents malicious file uploads)
- Public reads for sharing
- Owner-only deletes

### 🔒 Additional Recommendations
1. **Enable Cloud Storage for Firebase versioning** to recover from accidental deletes
2. **Set up lifecycle rules** to auto-delete photos from expired reports
3. **Monitor storage usage** via Firebase Console
4. **Set up alerts** for unusual upload patterns
5. **Consider adding rate limiting** via Cloud Functions if abuse is detected

## Troubleshooting

### Error: "Firebase Storage: User does not have permission to access..."

**Cause**: User trying to upload to wrong path or not authenticated

**Solution**: 
- Ensure user is signed in
- Verify path matches: `report_photos/{user's uid}/...`
- Check that client code uses correct UID

### Error: "File exceeds maximum size"

**Cause**: File larger than 5MB after client compression

**Solution**:
- Check client-side compression settings
- Target should be ≤600KB (well under 5MB limit)
- Review `imageCompression.ts` settings

### Error: "Invalid content type"

**Cause**: Non-image file uploaded

**Solution**:
- Ensure only image files selected
- Check file validation in `CreateReportModal.tsx`
- Verify MIME type is `image/*`

## Migration Notes

If you have existing photos without rules:
1. Deploy these rules first
2. Existing photos remain accessible (reads are public)
3. Future uploads follow new rules
4. No data migration needed

## Related Files

- `storage.rules` - Security rules definition
- `src/lib/imageCompression.ts` - Client-side compression
- `src/components/CreateReportModal.tsx` - Upload implementation
- `.env.local` - Firebase configuration

## Support

For issues with Firebase Storage rules:
- [Firebase Storage Security Rules Documentation](https://firebase.google.com/docs/storage/security)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
