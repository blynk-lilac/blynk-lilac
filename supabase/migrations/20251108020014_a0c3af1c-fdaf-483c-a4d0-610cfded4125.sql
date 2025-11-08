-- Criar bucket para stories
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket stories
CREATE POLICY "Stories são visíveis para todos"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

CREATE POLICY "Usuários podem fazer upload de stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem deletar seus stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem atualizar seus stories"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);