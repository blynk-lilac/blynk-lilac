-- Corrigir problema anterior - remover função is_group_admin com CASCADE
DROP FUNCTION IF EXISTS public.is_group_admin(uuid, uuid) CASCADE;

-- Recriar função simplificada
CREATE OR REPLACE FUNCTION public.can_add_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chats
    WHERE id = _group_id AND created_by = _user_id
  );
$$;

-- Recriar política para adicionar membros
CREATE POLICY "Criadores podem adicionar membros"
ON public.group_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_add_group_member(auth.uid(), group_id)
);

-- Corrigir todas as funções sem search_path definido
CREATE OR REPLACE FUNCTION public.update_group_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.full_name IS NOT NULL AND length(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'O nome não pode ter mais de 100 caracteres';
  END IF;
  
  IF NEW.username IS NOT NULL THEN
    IF NEW.username !~ '^[a-zA-Z0-9_-]+$' THEN
      RAISE EXCEPTION 'O nome de usuário só pode conter letras, números, _ e -';
    END IF;
    
    IF length(NEW.username) < 3 OR length(NEW.username) > 30 THEN
      RAISE EXCEPTION 'O nome de usuário deve ter entre 3 e 30 caracteres';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;