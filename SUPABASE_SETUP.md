# Supabase Setup Guide

This document outlines the Supabase integration that has been implemented for BrightEd.

## What Has Been Implemented

### 1. Database Schema
- **Location**: `supabase-schema.sql`
- **Tables Created**:
  - `profiles` - User profiles with stats (XP, streak, consistency, B-Coins)
  - `businesses` - Registered business entities
  - `user_progress` - Learning path progress (all modules locked by default)
- **Features**:
  - Row Level Security (RLS) enabled
  - Auto-updating timestamps
  - Foreign key relationships

### 2. Supabase Client Setup
- **Client-side**: `lib/supabase/client.ts`
- **Server-side**: `lib/supabase/server.ts`
- Both configured to work with Next.js App Router

### 3. Authentication & Sign Up
- **Sign Up Page**: `app/signup/page.tsx`
  - Email/Password registration
  - Username, Full Name, Form Level, Subject Selection
  - Automatically creates profile and initializes user_progress with all modules locked
- **Login Page**: `app/login/page.tsx`
  - Email/Password authentication

### 4. Landing Page
- **Location**: `app/landing/page.tsx`
- **Sections**:
  - Hero: "Master Your Money. Build Your Empire."
  - Why Section: Explains the gamified learning approach
  - FAQs: Free for students, subjects covered
  - Developers: Kylon Thomas & Malachi Senhouse bios
  - CTA: Links to signup

### 5. Business Registration Fix
- **API Route**: `app/api/business/register/route.ts`
- **Component**: Updated `components/business/BusinessRegistration.tsx`
- **Fix**: 
  - Integrates with Supabase `businesses` table
  - Checks name uniqueness
  - Sets status to 'pending' initially
  - Auto-approves after 15 seconds (updates `is_verified` and profile `has_business`)

### 6. Real-Time Stats Updates
- **API Route**: `app/api/user/stats/route.ts`
- **Utility**: `lib/stats-updater.ts`
- **Features**:
  - XP tracking (Story: +50 XP, +20 B-Coins | Question: +10 XP)
  - Streak calculation (consecutive days)
  - Consistency score (Days Active in Last 7 / 7 * 100)
  - Updates `last_active` timestamp

### 7. Business Card on Profile
- **Updated**: `app/profile/page.tsx`
- **Features**:
  - Fetches business data from Supabase
  - Displays business card when `has_business` is true
  - Shows B-Coin balance from Supabase
  - Displays business name, valuation, and B-Coins

### 8. Access Gate for Stories
- **Component**: `components/business/BusinessAccessGate.tsx`
- **Updated**: `app/stories/page.tsx`
- **Logic**: 
  - Checks if user has registered business
  - Locks POB/Accounts stories if no business
  - Shows modal with link to business registration

### 9. Visual Enhancements
- **BCoinCard**: Enhanced with:
  - Shiny moving gradient effect on hover
  - 3D rotating B-Coin icon with glow
  - Improved visual depth
- **Dashboard Cards**: Consistent `#0F172A` background color

## Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Configure Environment Variables
Add to your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Schema
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` (or see `SUPABASE_SQL_SETUP.md` for the complete script)
4. Click **Run** to execute the script
5. Verify all tables, indexes, triggers, and policies were created successfully

**Important**: The SQL script creates:
- `profiles` table (user profiles with stats)
- `businesses` table (registered businesses)
- `user_progress` table (learning path progress - all modules locked by default)
- Indexes for performance
- Triggers for auto-updating timestamps
- Row Level Security (RLS) policies for data protection

### 4. Configure Authentication
1. In Supabase Dashboard, go to Authentication > Settings
2. Enable Email/Password authentication
3. (Optional) Configure email templates

### 5. Test the Integration
1. Start your Next.js dev server: `npm run dev`
2. Visit `/landing` to see the landing page
   - Should display Hero, Why, FAQs, and Developers sections
   - If already authenticated, will redirect to home
3. Visit `/signup` to create an account
   - Fill in all required fields (Email, Password, Username, Full Name, Form Level, Subjects)
   - After signup, you'll be redirected to `/onboarding`
   - Check Supabase dashboard to verify profile was created
4. Visit `/stories/business` to register a business
   - Enter a business name (minimum 3 characters)
   - Wait 15 seconds for auto-approval
   - Check Supabase dashboard to verify business was created in `businesses` table
   - Verify profile `has_business` flag is updated to `true`

**Note**: See `PAGE_VERIFICATION.md` for detailed testing checklist and verification status.

## API Routes Created

- `POST /api/business/register` - Register a new business
- `GET /api/business/status` - Get user's business status
- `POST /api/user/stats` - Update user stats (XP, streak, etc.)
- `GET /api/user/stats` - Get user stats

## Notes

- The business registration uses a `setTimeout` for the 15-second approval. In production, consider using:
  - Supabase Edge Functions
  - A job queue (e.g., Bull, BullMQ)
  - Database triggers with pg_cron
- The stats update function should be called when users complete stories/questions
- All API routes use server-side Supabase client for security
- RLS policies ensure users can only access their own data

## Next Steps

1. Add email verification (optional)
2. Implement password reset flow
3. Add social authentication (Google, GitHub, etc.)
4. Set up Supabase Edge Functions for background jobs
5. Add real-time subscriptions for live updates
6. Implement proper error handling and loading states
