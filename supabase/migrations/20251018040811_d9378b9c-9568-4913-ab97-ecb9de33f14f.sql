-- Adicionar coluna audio_url na tabela comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS audio_url text;

-- Comentário sobre a coluna
COMMENT ON COLUMN public.comments.audio_url IS 'URL do áudio gravado do comentário';

-- Criar tabela para armazenar API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used timestamp with time zone,
  CONSTRAINT api_keys_name_check CHECK (length(name) >= 3 AND length(name) <= 100)
);

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key);

-- Habilitar RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários podem ver e gerenciar apenas suas próprias chaves
CREATE POLICY "Usuários podem ver suas próprias chaves"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias chaves"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias chaves"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias chaves"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at se necessário
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
