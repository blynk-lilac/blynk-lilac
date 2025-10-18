-- Adicionar coluna audio_url na tabela comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_url text;

-- Comentário sobre a coluna
COMMENT ON COLUMN public.comments.audio_url IS 'URL do áudio gravado do comentário';