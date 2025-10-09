-- Criar tabela de contas bloqueadas
CREATE TABLE IF NOT EXISTS public.blocked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.blocked_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para blocked_accounts
CREATE POLICY "Contas bloqueadas visíveis para todos"
ON public.blocked_accounts
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem bloquear contas"
ON public.blocked_accounts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Apenas admins podem desbloquear contas"
ON public.blocked_accounts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- Dar verificação permanente para isaacmuaco582@gmail.com
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Buscar o ID do usuário pelo email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'isaacmuaco582@gmail.com';
  
  -- Se encontrou o usuário, dar verificação
  IF target_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET verified = true
    WHERE id = target_user_id;
    
    -- Adicionar como admin se ainda não for
    INSERT INTO public.admin_users (user_id, email)
    VALUES (target_user_id, 'isaacmuaco582@gmail.com')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- Função para validar nomes (apenas letras e espaços)
CREATE OR REPLACE FUNCTION public.validate_name_format()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar full_name - apenas letras, espaços e acentos
  IF NEW.full_name IS NOT NULL AND NEW.full_name !~ '^[a-zA-ZÀ-ÿ\s]+$' THEN
    RAISE EXCEPTION 'O nome só pode conter letras e espaços';
  END IF;
  
  -- Validar username - apenas letras e números
  IF NEW.username IS NOT NULL AND NEW.username !~ '^[a-zA-Z0-9]+$' THEN
    RAISE EXCEPTION 'O nome de usuário só pode conter letras e números';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validação de nomes
DROP TRIGGER IF EXISTS validate_profile_names ON public.profiles;
CREATE TRIGGER validate_profile_names
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_name_format();