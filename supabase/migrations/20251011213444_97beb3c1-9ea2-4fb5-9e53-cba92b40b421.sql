-- Corrige search_path de todas as funções para segurança

-- Atualizar validate_profile_fields
CREATE OR REPLACE FUNCTION public.validate_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Atualizar notify_admins_verification_request
CREATE OR REPLACE FUNCTION public.notify_admins_verification_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  requester_profile RECORD;
BEGIN
  SELECT username, full_name INTO requester_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  FOR admin_record IN 
    SELECT user_id FROM public.admin_users
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      admin_record.user_id,
      'verification_request',
      'Novo Pedido de Verificação',
      COALESCE(requester_profile.full_name, requester_profile.username) || ' solicitou verificação',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Atualizar notify_user_verification_result
CREATE OR REPLACE FUNCTION public.notify_user_verification_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.user_id,
      'verification_result',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Verificação Aprovada!'
        ELSE 'Verificação Rejeitada'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Parabéns! Sua conta foi verificada.'
        ELSE 'Seu pedido de verificação foi rejeitado.'
      END,
      NEW.id
    );

    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET verified = true
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Atualizar handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;