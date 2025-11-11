-- Corrigir políticas RLS para permitir criação de grupos com membros

-- Remover política antiga problemática
DROP POLICY IF EXISTS "Criadores podem adicionar membros" ON group_members;

-- Permitir que usuários adicionem a si mesmos em grupos
CREATE POLICY "Usuários podem se juntar a grupos"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permitir que admins do grupo adicionem outros membros
CREATE POLICY "Admins podem adicionar membros"
ON group_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_members.group_id
    AND user_id = auth.uid()
    AND is_admin = true
  )
);