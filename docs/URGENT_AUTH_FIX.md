# 🔥 URGENT: Fix Authentication on Render

## Problem
You're seeing: **"Authentication service is temporarily unavailable"**

This means Firebase environment variables are NOT set in Render.

## ✅ QUICK FIX (5 minutes)

### Step 1: Get Your Firebase Config
1. Go to https://console.firebase.google.com
2. Select your project
3. Click ⚙️ (gear icon) → Project settings
4. Scroll down to "Your apps" section
5. Find the web app (</> icon) and click it
6. You'll see a code block like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};
```

### Step 2: Add to Render (CRITICAL)
1. Go to https://dashboard.render.com
2. Click your BrightEd service
3. Click **"Environment"** in left sidebar
4. Click **"+ Add Environment Variable"** (add each one):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

5. Click **Save** → **Save and deploy**

### Step 3: Verify
Wait 2-3 minutes for deployment, then:

1. Visit: `https://your-app.render.com/api/health`
   - Should show: `"status": "healthy"`

2. Try logging in again
   - Should work now!

## 🔍 Diagnostic Tools

### Check #1: Health Endpoint
Visit: `https://your-app.render.com/api/health`

**Good response:**
```json
{
  "status": "healthy",
  "firebase": {
    "configured": true,
    ...
  }
}
```

**Bad response:**
```json
{
  "status": "unhealthy",
  "firebase": {
    "configured": false,
    ...
  }
}
```

### Check #2: Login Page Diagnostic
- Go to login page
- If you see a **yellow warning box** with config status, variables are missing
- It will show exactly which variables are missing (✗)

### Check #3: Browser Console
- Open DevTools (F12)
- Look for:
  - ✅ `[Firebase] ✅ Configuration loaded successfully` = GOOD
  - ❌ `[Firebase] ❌ CRITICAL: Configuration is missing` = BAD

## 🚨 Common Mistakes

### ❌ Mistake #1: Typos in variable names
**Wrong:** `NEXT_PUBLIC_FIREBASE_APIKEY`
**Right:** `NEXT_PUBLIC_FIREBASE_API_KEY`

### ❌ Mistake #2: Missing NEXT_PUBLIC_ prefix
**Wrong:** `FIREBASE_API_KEY`
**Right:** `NEXT_PUBLIC_FIREBASE_API_KEY`

### ❌ Mistake #3: Wrong values
Make sure you copied from the RIGHT Firebase project!

### ❌ Mistake #4: Not redeploying
After adding environment variables, you MUST redeploy!
Click: **Save and deploy** (not just "Save")

## 📋 Required Variables Checklist

Copy this and check each one:

- [ ] NEXT_PUBLIC_FIREBASE_API_KEY
- [ ] NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- [ ] NEXT_PUBLIC_FIREBASE_PROJECT_ID
- [ ] NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- [ ] NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- [ ] NEXT_PUBLIC_FIREBASE_APP_ID

## 🆘 Still Not Working?

### Check Render Logs
1. Dashboard → Your Service → Logs
2. Look for errors about Firebase

### Run Config Check Locally
```bash
node scripts/check-firebase-config.js
```

### Test Locally First
```bash
npm run dev
```
- If it works locally but not on Render → Environment variables issue
- If it doesn't work locally → Wrong Firebase config values

### Contact Support
If still stuck:
1. Screenshot your Render Environment Variables page
2. Screenshot the `/api/health` response
3. Screenshot the browser console errors
4. Send to support with these screenshots

## 📚 Documentation

- Full setup guide: `docs/RENDER_SETUP.md`
- Authentication fix details: `docs/AUTHENTICATION_FIX.md`

## ⏱️ Timeline

After you add environment variables and deploy:
- 30 seconds: Build starts
- 2-3 minutes: Build completes
- After that: Test login

**If it still doesn't work after 5 minutes, check the logs!**
