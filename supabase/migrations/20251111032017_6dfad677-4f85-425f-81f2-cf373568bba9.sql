-- Remover políticas antigas problemáticas (especificando todos os roles)
DO $$ 
BEGIN
  -- Remover política de profiles que permite acesso público
  DROP POLICY IF EXISTS "Perfis são visíveis para todos" ON public.profiles;
  DROP POLICY IF EXISTS "Perfis públicos visíveis para autenticados" ON public.profiles;
  
  -- Remover políticas problemáticas de device_registrations
  DROP POLICY IF EXISTS "Sistema pode atualizar dispositivos" ON public.device_registrations;
  DROP POLICY IF EXISTS "Sistema pode registrar dispositivos" ON public.device_registrations;
  DROP POLICY IF EXISTS "Usuários podem registrar seus próprios dispositivos" ON public.device_registrations;
  DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dispositivos" ON public.device_registrations;
  
  -- Remover política de blocked_accounts que permite acesso público
  DROP POLICY IF EXISTS "Contas bloqueadas visíveis para todos" ON public.blocked_accounts;
  DROP POLICY IF EXISTS "Contas bloqueadas visíveis apenas para admins" ON public.blocked_accounts;
END $$;

-- SEGURANÇA CRÍTICA: Restringir acesso a profiles apenas para autenticados
CREATE POLICY "Perfis visíveis apenas para autenticados"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Prevenir inserções/atualizações maliciosas em device_registrations
CREATE POLICY "Usuários registram apenas seus dispositivos"
ON public.device_registrations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam apenas seus dispositivos"
ON public.device_registrations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Contas bloqueadas visíveis apenas para super admins
CREATE POLICY "Bloqueios visíveis só para admins"
ON public.blocked_accounts
FOR SELECT
TO authenticated
USING (is_super_admin());

-- Corrigir política de group_messages para prevenir manipulação do read_by
DROP POLICY IF EXISTS "Membros podem atualizar suas mensagens" ON public.group_messages;

-- Política simplificada - membros podem atualizar apenas mensagens que enviaram
CREATE POLICY "Membros podem atualizar suas próprias mensagens"
ON public.group_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);