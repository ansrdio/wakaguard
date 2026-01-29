/**
 * Admin UIDs allowlist
 * 
 * Add Firebase Auth UIDs here to grant admin access to moderation panel.
 * IMPORTANT: Keep this file secure and never commit actual admin UIDs to public repos.
 */

export const ADMIN_UIDS: string[] = [
  // Add admin UIDs here
  // Example: 'xYz123AbcDefGhiJkl',
];

/**
 * Check if a user is an admin
 */
export function isAdmin(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return ADMIN_UIDS.includes(uid);
}

/**
 * Add your own UID to the list above to test admin features.
 * To get your UID:
 * 1. Sign in to the app
 * 2. Open browser console
 * 3. Run: firebase.auth().currentUser.uid
 * 4. Copy the UID and add it to ADMIN_UIDS array above
 */
