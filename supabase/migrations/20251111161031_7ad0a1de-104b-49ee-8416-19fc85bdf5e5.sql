-- Adicionar política para permitir que admins super criem likes em nome de outros usuários
CREATE POLICY "Super admins podem criar likes para boost"
ON post_likes FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin()
);