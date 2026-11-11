# DRIFT Private Messenger
A standalone frontend hosted on GitHub Pages, with Supabase for authentication, database, file storage and realtime synchronization.

## Architecture
- **Hosting:** GitHub Pages (not AppDeploy).
- **Identity:** Supabase Auth email/password (with email confirmation if required by the Supabase project).
- **Database:** Existing Supabase PostgreSQL instance using Row Level Security, friend-request/group/chat RPCs and message membership rules.
- **Code:** Plain browser JavaScript, HTML, and CSS. No JavaScript build process or proprietary SDK. The browser imports the public Supabase JavaScript package from jsDelivr.
- **Privacy:** The repository is public because of free GitHub Pages hosting; there are no private keys in it. Do not put service-role keys, passwords, or other secrets into public source code.

## Signing in
1. Open the GitHub Pages URL.
2. Choose Create account, enter email/password/username, and confirm the verification email if prompted.
3. Return to DRIFT and sign in using that email and password.
4. Search for another user by username to send a friend request.

The Supabase public/publishable key is meant to be embedded in browser applications; data access is restricted by database RLS policies. Email/password verification and password reset links use the project's Auth redirect configuration, which may need updating if those email links point to an old site.

## Limitations
- This is an initial version. Test with two separate accounts before sharing widely.
- Direct messaging requires accepted friendship.
- Message content is protected by server membership policies, not end-to-end encryption.
- Reporting stores a record but does not provide human moderation.
- Current group administration UI can rename or leave groups; adding members after creation is not in this version.
- Browser network filtering may block GitHub Pages or Supabase.
- Profile avatars use expiring signed links.
- No AppDeploy code or runtime is used by this frontend.
