-- Remover política problemática com recursão infinita
DROP POLICY IF EXISTS "Admins podem adicionar membros" ON public.group_members;

-- Criar função security definer para verificar se usuário é admin do grupo ou criador
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chats
    WHERE id = _group_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id 
    AND user_id = _user_id 
    AND is_admin = true
  );
$$;

-- Criar nova política sem recursão para inserir membros
CREATE POLICY "Admins e criadores podem adicionar membros"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_group_admin(auth.uid(), group_id)
);