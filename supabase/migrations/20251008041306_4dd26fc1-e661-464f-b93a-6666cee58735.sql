-- Adicionar suporte a múltiplas mídias nos posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_urls text[];