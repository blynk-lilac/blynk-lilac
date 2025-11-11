-- Criar tabela para streams ao vivo
CREATE TABLE IF NOT EXISTS live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_active boolean DEFAULT true,
  viewer_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Enable RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para streams
CREATE POLICY "Streams ativos visíveis para todos"
ON live_streams FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Usuários podem criar seus streams"
ON live_streams FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus streams"
ON live_streams FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus streams"
ON live_streams FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Criar tabela para viewers do stream
CREATE TABLE IF NOT EXISTS stream_viewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(stream_id, user_id)
);

-- Enable RLS
ALTER TABLE stream_viewers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para viewers
CREATE POLICY "Viewers visíveis para usuários autenticados"
ON stream_viewers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem se juntar a streams"
ON stream_viewers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem sair de streams"
ON stream_viewers FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Função para atualizar contagem de viewers
CREATE OR REPLACE FUNCTION update_viewer_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE live_streams
    SET viewer_count = viewer_count + 1
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE live_streams
    SET viewer_count = viewer_count - 1
    WHERE id = OLD.stream_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contagem
CREATE TRIGGER update_viewer_count_trigger
AFTER INSERT OR DELETE ON stream_viewers
FOR EACH ROW
EXECUTE FUNCTION update_viewer_count();

-- Habilitar realtime para streams
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE stream_viewers;