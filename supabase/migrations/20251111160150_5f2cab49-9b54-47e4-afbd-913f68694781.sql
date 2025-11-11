-- Criar políticas de storage para voz no bucket existente post-images
-- Permitir upload de áudios
CREATE POLICY "Usuários podem fazer upload de áudios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images' 
  AND (storage.foldername(name))[1] = 'voice-messages'
);

-- Permitir acesso público aos áudios
CREATE POLICY "Áudios são publicamente acessíveis"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = 'voice-messages'
);