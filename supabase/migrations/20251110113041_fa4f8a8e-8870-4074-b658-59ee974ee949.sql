-- Permitir que super admins atualizem qualquer perfil (para verificação)
CREATE POLICY "Super admins podem atualizar qualquer perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND email IN ('isaacmuaco582@gmail.com', 'isaacmilagre9@gmail.com')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND email IN ('isaacmuaco582@gmail.com', 'isaacmilagre9@gmail.com')
  )
);