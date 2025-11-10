-- Adicionar campo audio_url na tabela messages para mensagens de voz
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url TEXT;