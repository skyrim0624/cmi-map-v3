-- Create stickers table
CREATE TABLE public.stickers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon_url TEXT NOT NULL,
    is_native BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for stickers
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;

-- Anyone can read stickers
CREATE POLICY "Stickers are viewable by everyone" ON public.stickers
    FOR SELECT USING (true);

-- Create placed_stickers table
CREATE TABLE public.placed_stickers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sticker_id UUID NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
    x_ratio FLOAT NOT NULL,
    y_ratio FLOAT NOT NULL,
    rotation FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on RLS for placed_stickers
ALTER TABLE public.placed_stickers ENABLE ROW LEVEL SECURITY;

-- Anyone can read placed stickers
CREATE POLICY "Placed stickers are viewable by everyone" ON public.placed_stickers
    FOR SELECT USING (true);

-- Only authenticated users can place stickers
CREATE POLICY "Users can place stickers" ON public.placed_stickers
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can delete their own placed stickers
CREATE POLICY "Users can delete own stickers" ON public.placed_stickers
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed native stickers
INSERT INTO public.stickers (name, icon_url, is_native) VALUES
('太赞了 (+1)', '/stickers/plus1.svg', true),
('有猫！', '/stickers/cat.svg', true),
('网速飞快', '/stickers/wifi.svg', true),
('避坑警告', '/stickers/trap.svg', true);
