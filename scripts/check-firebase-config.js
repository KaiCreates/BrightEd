/**
 * Firebase Configuration Diagnostic
 * 
 * Run this script to check if all required environment variables are set.
 * Usage: node scripts/check-firebase-config.js
 */

const requiredEnvVars = {
  client: [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ],
  optional: [
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
  ],
  server: [
    // At least one of these should be set for server-side operations
    'FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON',
    'FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64',
    'FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH',
  ],
  security: [
    'NEXTAUTH_SECRET',
    'SESSION_SECRET',
    'CSRF_SECRET',
    'RATE_LIMIT_SECRET',
  ]
};

function checkEnvVar(name) {
  const value = process.env[name];
  return {
    name,
    set: !!value && value !== '' && value !== 'undefined',
    value: value ? `${value.substring(0, 10)}...` : 'NOT SET'
  };
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function printResult(result, required = true) {
  const status = result.set ? '✅' : required ? '❌' : '⚠️';
  const color = result.set ? '\x1b[32m' : required ? '\x1b[31m' : '\x1b[33m';
  const reset = '\x1b[0m';
  console.log(`${color}${status}${reset} ${result.name}: ${result.value}`);
}

function runDiagnostics() {
  console.log('\n🔍 Firebase Configuration Diagnostic\n');
  
  let hasErrors = false;
  let hasWarnings = false;

  // Check client-side vars (CRITICAL)
  printHeader('Client-Side Firebase Configuration (REQUIRED)');
  requiredEnvVars.client.forEach(varName => {
    const result = checkEnvVar(varName);
    printResult(result, true);
    if (!result.set) hasErrors = true;
  });

  // Check optional vars
  printHeader('Optional Firebase Configuration');
  requiredEnvVars.optional.forEach(varName => {
    const result = checkEnvVar(varName);
    printResult(result, false);
  });

  // Check server-side vars
  printHeader('Server-Side Firebase Admin SDK (At least one required)');
  let hasServerConfig = false;
  requiredEnvVars.server.forEach(varName => {
    const result = checkEnvVar(varName);
    printResult(result, false);
    if (result.set) hasServerConfig = true;
  });
  
  if (!hasServerConfig) {
    console.log('\n\x1b[33m⚠️  Warning: No server-side Firebase Admin SDK configured\x1b[0m');
    console.log('Some features may not work properly.\n');
    hasWarnings = true;
  }

  // Check security vars
  printHeader('Security Configuration (Recommended)');
  requiredEnvVars.security.forEach(varName => {
    const result = checkEnvVar(varName);
    printResult(result, false);
    if (!result.set) hasWarnings = true;
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  if (hasErrors) {
    console.log('\x1b[31m❌ CONFIGURATION INCOMPLETE\x1b[0m');
    console.log('\nMissing required environment variables!');
    console.log('Authentication will NOT work properly.\n');
    console.log('To fix:');
    console.log('1. Copy .env.example to .env.local');
    console.log('2. Fill in all Firebase configuration values');
    console.log('3. Restart your development server');
    console.log('\nFor Render deployment, see docs/RENDER_SETUP.md\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('\x1b[33m⚠️  CONFIGURATION HAS WARNINGS\x1b[0m');
    console.log('\nCore Firebase authentication is configured.');
    console.log('Some optional features may not work.\n');
    process.exit(0);
  } else {
    console.log('\x1b[32m✅ ALL CONFIGURATION COMPLETE\x1b[0m');
    console.log('\nFirebase is properly configured!');
    console.log('Authentication should work correctly.\n');
    process.exit(0);
  }
}

// Run diagnostics
runDiagnostics();
