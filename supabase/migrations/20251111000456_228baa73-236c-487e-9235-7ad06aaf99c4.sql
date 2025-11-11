-- Criar tabela de grupos de chat
CREATE TABLE IF NOT EXISTS public.group_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de membros de grupos
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(group_id, user_id)
);

-- Criar tabela de mensagens de grupo
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_by UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Habilitar RLS
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para group_chats
CREATE POLICY "Usuários podem ver grupos dos quais são membros"
  ON public.group_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_chats.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem criar grupos"
  ON public.group_chats FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins do grupo podem atualizar"
  ON public.group_chats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_chats.id
      AND group_members.user_id = auth.uid()
      AND group_members.is_admin = true
    )
  );

CREATE POLICY "Criador pode deletar grupo"
  ON public.group_chats FOR DELETE
  USING (auth.uid() = created_by);

-- Políticas para group_members
CREATE POLICY "Membros podem ver outros membros do grupo"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem adicionar membros"
  ON public.group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_members.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.is_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.group_chats
      WHERE group_chats.id = group_members.group_id
      AND group_chats.created_by = auth.uid()
    )
  );

CREATE POLICY "Usuários podem sair do grupo"
  ON public.group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para group_messages
CREATE POLICY "Membros podem ver mensagens do grupo"
  ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem enviar mensagens"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Membros podem atualizar suas mensagens"
  ON public.group_messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Adicionar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_chats_updated_at
  BEFORE UPDATE ON public.group_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_group_updated_at();