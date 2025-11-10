-- Remover a política problemática
DROP POLICY IF EXISTS "Super admins podem atualizar qualquer perfil" ON public.profiles;

-- Criar nova política usando a função is_super_admin
CREATE POLICY "Super admins podem atualizar qualquer perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_super_admin() OR auth.uid() = id)
WITH CHECK (is_super_admin() OR auth.uid() = id);