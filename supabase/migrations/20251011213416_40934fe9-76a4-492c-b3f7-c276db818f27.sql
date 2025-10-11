-- Remove a função antiga e triggers dependentes
DROP FUNCTION IF EXISTS public.validate_name_format() CASCADE;

-- Cria nova função de validação mais flexível
CREATE OR REPLACE FUNCTION public.validate_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar full_name - permite letras, números, espaços e caracteres comuns
  IF NEW.full_name IS NOT NULL AND length(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'O nome não pode ter mais de 100 caracteres';
  END IF;
  
  -- Validar username - letras, números, underscore e hífen
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

-- Cria trigger para validação
CREATE TRIGGER validate_profile_fields_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_fields();