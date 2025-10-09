-- Criar tabela de stories
CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video')),
  text_content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories são visíveis para amigos e seguidores"
ON public.stories
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (user_id_1 = auth.uid() AND user_id_2 = stories.user_id)
       OR (user_id_2 = auth.uid() AND user_id_1 = stories.user_id)
  ) OR
  EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = auth.uid() AND following_id = stories.user_id
  )
);

CREATE POLICY "Usuários podem criar stories"
ON public.stories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus stories"
ON public.stories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Tabela para visualizações de stories
CREATE TABLE public.story_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visualizações são visíveis para o dono do story"
ON public.story_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_id AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem registrar visualizações"
ON public.story_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Tabela para vídeos de verificação
CREATE TABLE public.verification_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  video_url text NOT NULL,
  caption text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  share_code text UNIQUE NOT NULL DEFAULT substring(gen_random_uuid()::text, 1, 12)
);

ALTER TABLE public.verification_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vídeos são visíveis para autenticados"
ON public.verification_videos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem criar vídeos"
ON public.verification_videos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus vídeos"
ON public.verification_videos
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Tabela para likes em vídeos de verificação
CREATE TABLE public.verification_video_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.verification_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(video_id, user_id)
);

ALTER TABLE public.verification_video_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes são visíveis para autenticados"
ON public.verification_video_likes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem curtir vídeos"
ON public.verification_video_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem descurtir vídeos"
ON public.verification_video_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Tabela para comentários em vídeos de verificação
CREATE TABLE public.verification_video_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid NOT NULL REFERENCES public.verification_videos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.verification_video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentários são visíveis para autenticados"
ON public.verification_video_comments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem comentar"
ON public.verification_video_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus comentários"
ON public.verification_video_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Habilitar realtime para as novas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_video_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_video_comments;