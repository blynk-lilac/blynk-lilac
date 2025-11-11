-- Adicionar coluna expires_at para posts temporários (banners)
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Índice para posts expirados
CREATE INDEX IF NOT EXISTS idx_posts_expires_at ON public.posts(expires_at)
WHERE expires_at IS NOT NULL;