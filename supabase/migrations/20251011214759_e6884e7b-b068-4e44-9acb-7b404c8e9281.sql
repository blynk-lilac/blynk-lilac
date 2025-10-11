-- Criar enum para tipos de role
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles de usuário
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem role
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver suas roles"
ON user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem inserir roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem atualizar roles"
ON user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem deletar roles"
ON user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Criar enum para tipos de selo de verificação
CREATE TYPE badge_type AS ENUM ('blue', 'gold', 'purple', 'silver');

-- Criar tabela para tipos de selo
CREATE TABLE IF NOT EXISTS verification_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  badge_type badge_type NOT NULL UNIQUE,
  icon_url text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE verification_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para verification_badges
CREATE POLICY "Badges são visíveis para todos"
ON verification_badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas admins podem gerenciar badges"
ON verification_badges FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Adicionar coluna de badge_type na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS badge_type badge_type;

-- Atualizar tabela verification_requests para incluir badge escolhido
ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS badge_type badge_type;

-- Atualizar políticas da tabela verification_requests para admins
DROP POLICY IF EXISTS "Admins podem atualizar pedidos" ON verification_requests;
CREATE POLICY "Admins podem atualizar pedidos"
ON verification_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Usuários podem ver seus pedidos" ON verification_requests;
CREATE POLICY "Usuários podem ver seus pedidos"
ON verification_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Inserir badges padrão
INSERT INTO verification_badges (name, badge_type, icon_url, description) VALUES
('Verificado Azul', 'blue', '/badges/blue.svg', 'Selo de verificação azul oficial'),
('Verificado Ouro', 'gold', '/badges/gold.webp', 'Selo de verificação dourado premium'),
('Verificado Roxo', 'purple', '/badges/purple.png', 'Selo de verificação roxo especial'),
('Verificado Prata', 'silver', '/badges/silver.webp', 'Selo de verificação prata');

-- Inserir admins (baseado nos emails fornecidos)
-- Nota: Isso só funcionará após os usuários criarem contas
DO $$
DECLARE
  user_id_1 uuid;
  user_id_2 uuid;
BEGIN
  -- Buscar IDs dos usuários pelos emails
  SELECT id INTO user_id_1 FROM auth.users WHERE email = 'isaacmuaco582@gmail.com';
  SELECT id INTO user_id_2 FROM auth.users WHERE email = 'isaacmuaco2@gmail.com';
  
  -- Inserir roles de admin se os usuários existirem
  IF user_id_1 IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) 
    VALUES (user_id_1, 'admin') 
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  IF user_id_2 IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role) 
    VALUES (user_id_2, 'admin') 
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Remover tabela admin_users antiga que está causando recursão
DROP TABLE IF EXISTS admin_users CASCADE;

-- Atualizar função de notificação para usar nova tabela de roles
CREATE OR REPLACE FUNCTION notify_admins_verification_request()
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
  FROM profiles
  WHERE id = NEW.user_id;

  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, title, message, related_id)
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

-- Atualizar função de resultado de verificação para incluir badge
CREATE OR REPLACE FUNCTION notify_user_verification_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (user_id, type, title, message, related_id)
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
      UPDATE profiles
      SET verified = true, badge_type = NEW.badge_type
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;