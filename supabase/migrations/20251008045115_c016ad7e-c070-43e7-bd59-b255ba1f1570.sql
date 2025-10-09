-- Criar tabela de pedidos de verificação
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de admins
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Habilitar RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas para verification_requests
CREATE POLICY "Usuários podem ver seus pedidos"
  ON public.verification_requests
  FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem criar pedidos"
  ON public.verification_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins podem atualizar pedidos"
  ON public.verification_requests
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ));

-- Políticas para notifications
CREATE POLICY "Usuários podem ver suas notificações"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar notificações"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas notificações"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas notificações"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para admin_users
CREATE POLICY "Admins são visíveis para admins"
  ON public.admin_users
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ));

-- Função para criar notificação quando pedido é criado
CREATE OR REPLACE FUNCTION notify_admins_verification_request()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  requester_profile RECORD;
BEGIN
  -- Buscar informações do solicitante
  SELECT username, full_name INTO requester_profile
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Notificar todos os admins
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_verification_request_created
  AFTER INSERT ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_verification_request();

-- Função para notificar usuário sobre resultado
CREATE OR REPLACE FUNCTION notify_user_verification_result()
RETURNS TRIGGER AS $$
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

    -- Se aprovado, atualizar profile
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET verified = true
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_verification_request_updated
  AFTER UPDATE ON public.verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_verification_result();

-- Inserir admins permanentes
INSERT INTO public.admin_users (user_id, email)
SELECT id, email
FROM auth.users
WHERE email IN ('leonel@gmail.com', 'isaacmuaco582@gmail.com', 'isaacmilagre9@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Marcar profiles dos admins como verificados
UPDATE public.profiles
SET verified = true
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('leonel@gmail.com', 'isaacmuaco582@gmail.com', 'isaacmilagre9@gmail.com')
);