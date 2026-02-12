#!/bin/bash

# =============================================================================
# Render Environment Setup Helper
# =============================================================================
# This script helps set up environment variables for Render deployment
# Usage: ./scripts/setup-render-env.sh
# =============================================================================

echo "🚀 BrightEd Render Environment Setup Helper"
echo "============================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    echo ""
    echo "Please create a .env.local file with your Firebase configuration."
    echo "Copy from .env.example and fill in your values:"
    echo "  cp .env.example .env.local"
    echo ""
    exit 1
fi

echo "✅ Found .env.local"
echo ""

# Extract Firebase config values
echo "📋 Extracting Firebase configuration..."
echo ""

FIREBASE_API_KEY=$(grep "NEXT_PUBLIC_FIREBASE_API_KEY=" .env.local | cut -d '=' -f2)
FIREBASE_AUTH_DOMAIN=$(grep "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=" .env.local | cut -d '=' -f2)
FIREBASE_PROJECT_ID=$(grep "NEXT_PUBLIC_FIREBASE_PROJECT_ID=" .env.local | cut -d '=' -f2)
FIREBASE_STORAGE_BUCKET=$(grep "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=" .env.local | cut -d '=' -f2)
FIREBASE_MESSAGING_SENDER_ID=$(grep "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=" .env.local | cut -d '=' -f2)
FIREBASE_APP_ID=$(grep "NEXT_PUBLIC_FIREBASE_APP_ID=" .env.local | cut -d '=' -f2)
FIREBASE_MEASUREMENT_ID=$(grep "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=" .env.local | cut -d '=' -f2)
FIREBASE_DATABASE_URL=$(grep "NEXT_PUBLIC_FIREBASE_DATABASE_URL=" .env.local | cut -d '=' -f2)

# Generate secrets if not present
echo "🔐 Checking security secrets..."

if ! grep -q "NEXTAUTH_SECRET=" .env.local || [ -z "$NEXTAUTH_SECRET" ]; then
    echo "  Generating NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.local
fi

if ! grep -q "SESSION_SECRET=" .env.local || [ -z "$SESSION_SECRET" ]; then
    echo "  Generating SESSION_SECRET..."
    SESSION_SECRET=$(openssl rand -base64 32)
    echo "SESSION_SECRET=$SESSION_SECRET" >> .env.local
fi

if ! grep -q "CSRF_SECRET=" .env.local || [ -z "$CSRF_SECRET" ]; then
    echo "  Generating CSRF_SECRET..."
    CSRF_SECRET=$(openssl rand -base64 32)
    echo "CSRF_SECRET=$CSRF_SECRET" >> .env.local
fi

if ! grep -q "RATE_LIMIT_SECRET=" .env.local || [ -z "$RATE_LIMIT_SECRET" ]; then
    echo "  Generating RATE_LIMIT_SECRET..."
    RATE_LIMIT_SECRET=$(openssl rand -base64 32)
    echo "RATE_LIMIT_SECRET=$RATE_LIMIT_SECRET" >> .env.local
fi

if ! grep -q "ENCRYPTION_KEY=" .env.local || [ -z "$ENCRYPTION_KEY" ]; then
    echo "  Generating ENCRYPTION_KEY..."
    ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env.local
fi

echo ""
echo "✅ Security secrets generated"
echo ""

# Create Render export file
echo "📄 Creating Render environment export..."
cat > render-env.txt << EOF
# BrightEd Environment Variables for Render
# Copy these values to your Render Dashboard
# Service: Environment → Environment Variables

NEXT_PUBLIC_FIREBASE_API_KEY=$FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=$FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$FIREBASE_MEASUREMENT_ID
NEXT_PUBLIC_FIREBASE_DATABASE_URL=$FIREBASE_DATABASE_URL

# Security Secrets (generated)
NEXTAUTH_SECRET=$(grep "NEXTAUTH_SECRET=" .env.local | cut -d '=' -f2)
SESSION_SECRET=$(grep "SESSION_SECRET=" .env.local | cut -d '=' -f2)
CSRF_SECRET=$(grep "CSRF_SECRET=" .env.local | cut -d '=' -f2)
RATE_LIMIT_SECRET=$(grep "RATE_LIMIT_SECRET=" .env.local | cut -d '=' -f2)
ENCRYPTION_KEY=$(grep "ENCRYPTION_KEY=" .env.local | cut -d '=' -f2)

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-name.render.com
AUDIT_LOG_ENABLED=true
AUDIT_LOG_LEVEL=info
EOF

echo "✅ Created render-env.txt"
echo ""

# Check for Firebase Admin SDK
echo "🔍 Checking Firebase Admin SDK configuration..."
if grep -q "FIREBASE_ADMIN_SERVICE_ACCOUNT" .env.local; then
    echo "✅ Firebase Admin SDK configuration found"
    
    # Check if base64 encoded version exists
    if grep -q "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64=" .env.local; then
        echo "✅ Base64 encoded service account found"
    else
        echo "⚠️  Consider converting your service account to base64 for Render:"
        echo "   cat service-account.json | base64 | pbcopy"
        echo "   Then add to .env.local: FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64=<pasted-value>"
    fi
else
    echo "⚠️  Firebase Admin SDK not configured"
    echo "   For server-side operations, you need to set up the Admin SDK"
    echo "   See docs/RENDER_SETUP.md for instructions"
fi

echo ""
echo "============================================"
echo "📋 Setup Summary"
echo "============================================"
echo ""
echo "1. ✅ Local environment configured (.env.local)"
echo "2. ✅ Security secrets generated"
echo "3. ✅ Render export file created (render-env.txt)"
echo ""
echo "Next Steps:"
echo "-----------"
echo "1. Review render-env.txt to ensure all values are correct"
echo "2. Copy the contents to your Render Dashboard:"
echo "   Dashboard → Your Service → Environment → Environment Variables"
echo "3. Click 'Add from .env' and paste the contents"
echo "4. Save and deploy"
echo ""
echo "📖 For detailed instructions, see: docs/RENDER_SETUP.md"
echo ""
echo "🔍 To verify your configuration:"
echo "   npm run dev"
echo "   # Check browser console for Firebase status"
echo ""
echo "✨ Done!"
