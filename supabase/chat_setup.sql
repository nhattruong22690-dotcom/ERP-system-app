-- Presence & Messaging Setup
-- Run this in Supabase SQL Editor

-- 1. Update Users Table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_users_presence ON public.users(is_online, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

-- 4. Enable Realtime
-- Make sure the publication exists and add tables if they aren't already included
DO $$ 
BEGIN
    -- Create publication if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add users table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;

    -- Add messages table if not already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 5. RLS Policies
-- Note: Since the app uses a manual login system (not Supabase Auth),
-- auth.uid() will be null. For now, we enable RLS but allow all authenticated
-- anon access, or disable RLS if you prefer simplicity for this internal tool.
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- If you later switch to Supabase Auth, use these policies:
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (true);
-- CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (true);
