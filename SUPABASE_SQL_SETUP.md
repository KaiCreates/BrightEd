# Supabase SQL Setup Scripts

This document contains all the SQL scripts you need to run in your Supabase SQL Editor to set up the BrightEd database.

## Quick Setup Instructions

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the entire contents of `supabase-schema.sql` (shown below)
5. Click **Run** to execute the script
6. Verify all tables, indexes, triggers, and policies were created successfully

---

## Complete SQL Schema

```sql
-- BrightEd Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  form_level INT,
  subjects TEXT[], -- Array of subjects
  mastery_score FLOAT DEFAULT 0.0,
  streak_count INT DEFAULT 0,
  xp_total INT DEFAULT 0,
  consistency_score INT DEFAULT 0,
  b_coins_balance INT DEFAULT 100,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_business BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses Table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  valuation INT DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning Path Progress (Fixes the "pre-opened" bug)
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  is_unlocked BOOLEAN DEFAULT FALSE, -- This ensures paths are closed by default
  completion_percentage INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON user_progress(module_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Businesses: Users can manage their own businesses
CREATE POLICY "Users can view own businesses" ON businesses
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own businesses" ON businesses
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own businesses" ON businesses
    FOR UPDATE USING (auth.uid() = owner_id);

-- User Progress: Users can manage their own progress
CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id);
```

---

## Verification Queries

After running the schema, verify everything was created correctly:

### Check Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'businesses', 'user_progress');
```

### Check Indexes
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'businesses', 'user_progress');
```

### Check RLS Policies
```sql
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'businesses', 'user_progress');
```

### Check Triggers
```sql
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('profiles', 'businesses', 'user_progress');
```

---

## What Each Table Does

### `profiles`
- Stores user profile information
- Linked to `auth.users` via `id` (UUID)
- Tracks: username, full name, form level, subjects, stats (XP, streak, consistency), B-Coins balance
- `has_business` flag indicates if user has registered a business

### `businesses`
- Stores registered business entities
- Linked to `profiles` via `owner_id`
- Tracks: business name, verification status, valuation
- Auto-approves after 15 seconds (handled by application code)

### `user_progress`
- Tracks learning path progress for each user
- Ensures all modules start as `is_unlocked: false` (fixes "pre-opened" bug)
- Unique constraint on `(user_id, module_id)` prevents duplicates

---

## Security Features

1. **Row Level Security (RLS)**: Enabled on all tables
2. **Policies**: Users can only access their own data
3. **Foreign Keys**: Cascade deletes ensure data integrity
4. **Indexes**: Optimize query performance

---

## Troubleshooting

### If you get "relation already exists" errors:
- The `IF NOT EXISTS` clauses should prevent this, but if you need to start fresh:
```sql
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```
Then re-run the schema script.

### If RLS policies aren't working:
- Make sure RLS is enabled: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
- Check that policies exist: Run the verification query above
- Ensure you're authenticated when testing

### If triggers aren't updating `updated_at`:
- Verify triggers exist: Run the verification query above
- Check that the function exists: `SELECT * FROM pg_proc WHERE proname = 'update_updated_at_column';`

---

## Next Steps

After running this SQL script:

1. ✅ Verify all tables were created
2. ✅ Test authentication flow
3. ✅ Create a test user via `/signup`
4. ✅ Verify profile was created in `profiles` table
5. ✅ Test business registration
6. ✅ Verify business was created in `businesses` table

See `SUPABASE_SETUP.md` for complete setup instructions.
