-- Permitir que admins específicos vejam e gerenciem verificações
-- Criar função para verificar se o email é de um super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND email IN ('isaacmuaco2@gmail.com', 'isaacmuaco583@gmail.com')
  )
$$;

-- Atualizar políticas de verification_requests para super admins
DROP POLICY IF EXISTS "Admins podem atualizar pedidos" ON verification_requests;
DROP POLICY IF EXISTS "Usuários podem ver seus pedidos" ON verification_requests;

CREATE POLICY "Super admins podem atualizar pedidos"
ON verification_requests
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Usuários e super admins podem ver pedidos"
ON verification_requests
FOR SELECT
USING (auth.uid() = user_id OR is_super_admin());

-- Atualizar políticas de reports para super admins
DROP POLICY IF EXISTS "Admins podem atualizar denúncias" ON reports;
DROP POLICY IF EXISTS "Admins podem ver todas denúncias" ON reports;

CREATE POLICY "Super admins podem atualizar denúncias"
ON reports
FOR UPDATE
USING (is_super_admin());

CREATE POLICY "Super admins podem ver todas denúncias"
ON reports
FOR SELECT
USING (is_super_admin());

-- Criar tabela para controle de dispositivos (prevenir múltiplas contas)
CREATE TABLE IF NOT EXISTS public.device_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_login timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(device_fingerprint)
);

ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus dispositivos"
ON device_registrations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode registrar dispositivos"
ON device_registrations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar dispositivos"
ON device_registrations
FOR UPDATE
USING (true);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_device_fingerprint ON device_registrations(device_fingerprint);

-- Fazer super admins automaticamente verificados
CREATE OR REPLACE FUNCTION public.auto_verify_super_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('isaacmuaco2@gmail.com', 'isaacmuaco583@gmail.com') THEN
    -- Atualizar perfil para verificado com badge azul
    UPDATE profiles
    SET verified = true, badge_type = 'blue'
    WHERE id = NEW.id;
    
    -- Adicionar role de admin
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Criar trigger para verificar super admins automaticamente
DROP TRIGGER IF EXISTS auto_verify_super_admins_trigger ON auth.users;
CREATE TRIGGER auto_verify_super_admins_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auto_verify_super_admins();