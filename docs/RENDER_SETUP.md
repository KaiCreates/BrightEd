# Render Deployment Setup Guide

## Firebase Authentication Configuration

To fix authentication on Render, you need to set up the following environment variables in your Render Dashboard.

## Required Environment Variables

### Firebase Client Configuration (Public)
These are safe to expose and are needed for client-side Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
```

### Firebase Admin SDK (Private - Server-side only)
For server-side operations, you need the Firebase Admin SDK. Choose ONE of these methods:

#### Option 1: Base64 Encoded Service Account (Recommended for Render)
1. Download your service account JSON from Firebase Console
2. Base64 encode it: `cat service-account.json | base64`
3. Add to Render:
```
FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64=your-base64-encoded-json
```

#### Option 2: JSON String
```
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

#### Option 3: Secret File (Best for security)
1. Upload your `service-account.json` as a Secret File in Render Dashboard
2. Set the path:
```
FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH=/etc/secrets/service-account.json
```

## How to Set Up in Render Dashboard

### Step 1: Get Firebase Config
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon → Project settings
4. Scroll to "Your apps" section
5. Click the web app (</> icon)
6. Copy the Firebase SDK config values

### Step 2: Add to Render
1. In Render Dashboard, select your service
2. Click "Environment" in the left sidebar
3. Click "+ Add Environment Variable"
4. Add each variable from your Firebase config
5. For the Admin SDK, use the base64 method for security
6. Click "Save" → "Save and deploy"

### Step 3: Verify
After deployment, check your browser console for:
- ✅ "Firebase initialized successfully" (good)
- ❌ "Firebase configuration is missing" (missing variables)

## Troubleshooting

### Issue: "Firebase configuration is missing or invalid"
**Cause**: Environment variables not set or incorrect

**Fix**:
1. Check all NEXT_PUBLIC_FIREBASE_* variables are set
2. Ensure no typos in variable names
3. Verify values match your Firebase project
4. Redeploy after fixing

### Issue: "auth/user-not-found" on login
**Cause**: Firebase Auth not properly initialized

**Fix**:
1. Check NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is correct
2. Ensure Authentication is enabled in Firebase Console
3. Check Email/Password provider is enabled

### Issue: "Permission denied" errors
**Cause**: Firestore security rules or missing Admin SDK

**Fix**:
1. Update Firestore rules to allow authenticated access
2. Ensure FIREBASE_ADMIN_SERVICE_ACCOUNT_* is set for server operations

## Environment Variables Checklist

### Client-side (NEXT_PUBLIC_*)
- [ ] NEXT_PUBLIC_FIREBASE_API_KEY
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID
- [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- [ ] NEXT_PUBLIC_FIREBASE_APP_ID
- [ ] NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
- [ ] NEXT_PUBLIC_FIREBASE_DATABASE_URL

### Server-side
- [ ] FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 (or JSON)
- [ ] NEXTAUTH_SECRET (generate random string)
- [ ] SESSION_SECRET
- [ ] CSRF_SECRET
- [ ] RATE_LIMIT_SECRET

### Optional but Recommended
- [ ] AUDIT_LOG_ENABLED=true
- [ ] AUDIT_LOG_LEVEL=info
- [ ] CSP_NONCE_SECRET

## Generating Secrets

For security secrets (NEXTAUTH_SECRET, SESSION_SECRET, etc.), generate strong random strings:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Testing After Setup

1. Deploy to Render
2. Visit your app URL
3. Open browser DevTools → Console
4. Check for Firebase initialization messages
5. Try logging in
6. Check Network tab for auth requests

## Security Best Practices

1. ✅ Never commit `.env.local` to git
2. ✅ Use Render's Secret Files for service account JSON
3. ✅ Rotate secrets periodically
4. ✅ Use separate Firebase projects for staging/production
5. ✅ Enable Firebase App Check for additional security
6. ✅ Set up Firebase Authentication domain restrictions

## Quick Commands

```bash
# Generate all required secrets
node -e "
console.log('NEXTAUTH_SECRET:', require('crypto').randomBytes(32).toString('hex'));
console.log('SESSION_SECRET:', require('crypto').randomBytes(32).toString('hex'));
console.log('CSRF_SECRET:', require('crypto').randomBytes(32).toString('hex'));
console.log('RATE_LIMIT_SECRET:', require('crypto').randomBytes(32).toString('hex'));
console.log('ENCRYPTION_KEY:', require('crypto').randomBytes(32).toString('hex'));
console.log('CSP_NONCE_SECRET:', require('crypto').randomBytes(32).toString('hex'));
"
```

## Support

If issues persist:
1. Check Render logs: Dashboard → Service → Logs
2. Verify Firebase Console for auth errors
3. Test locally with `npm run dev` to isolate Render-specific issues
