-- Corrigir sistema de notificações - prevenir criação de notificações falsas
DROP POLICY IF EXISTS "Sistema pode criar notificações" ON public.notifications;

-- Apenas funções do sistema (triggers) podem criar notificações
CREATE POLICY "Apenas sistema pode criar notificações"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (false); -- Bloqueia INSERT direto, apenas triggers podem inserir

-- Permitir que triggers do sistema criem notificações usando SECURITY DEFINER
-- Atualizar as funções de trigger para usar SECURITY DEFINER

-- Posts devem expirar após 24h se tiverem expires_at definido
CREATE OR REPLACE FUNCTION public.delete_expired_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM posts
  WHERE expires_at IS NOT NULL 
  AND expires_at < NOW();
END;
$$;

-- Stories expiram após 24h automaticamente
CREATE OR REPLACE FUNCTION public.delete_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  DELETE FROM stories
  WHERE expires_at < NOW();
END;
$$;