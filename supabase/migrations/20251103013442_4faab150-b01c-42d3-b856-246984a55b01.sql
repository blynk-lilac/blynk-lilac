-- Adicionar coluna audio_url à tabela verification_video_comments
ALTER TABLE public.verification_video_comments
ADD COLUMN IF NOT EXISTS audio_url text;

-- Comentário sobre a coluna
COMMENT ON COLUMN public.verification_video_comments.audio_url IS 'URL do áudio gravado do comentário de vídeo';