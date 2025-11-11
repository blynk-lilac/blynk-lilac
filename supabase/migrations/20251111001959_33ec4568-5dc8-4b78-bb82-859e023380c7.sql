-- Adicionar colunas de mídia para mensagens de grupo
ALTER TABLE group_messages
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;