-- Create wishlist table
CREATE TABLE IF NOT EXISTS public.wishlists (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.recommendations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, recommendation_id)
);

-- Set up Row Level Security
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Allow users to read all wishlists (or just their own? For now, read their own)
CREATE POLICY "Users can read own upvotes/wishlists" ON public.wishlists
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own wishlists
CREATE POLICY "Users can insert own wishlists" ON public.wishlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own wishlists
CREATE POLICY "Users can delete own wishlists" ON public.wishlists
    FOR DELETE USING (auth.uid() = user_id);
