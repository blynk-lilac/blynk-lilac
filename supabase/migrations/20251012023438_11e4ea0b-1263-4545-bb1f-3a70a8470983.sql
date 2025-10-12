-- Adicionar coluna de visibilidade aos posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers', 'friends'));

-- Adicionar coluna de post original (para repostagens)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS original_post_id uuid REFERENCES posts(id) ON DELETE CASCADE;

-- Criar tabela de denúncias
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_content_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('post', 'video', 'comment', 'user')),
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- RLS para reports
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem criar denúncias"
ON reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins podem ver todas denúncias"
ON reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem atualizar denúncias"
ON reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Atualizar políticas de posts para respeitar visibilidade
DROP POLICY IF EXISTS "Posts são visíveis para todos" ON posts;

CREATE POLICY "Posts públicos são visíveis para todos"
ON posts FOR SELECT
TO authenticated
USING (
  visibility = 'public' OR
  user_id = auth.uid() OR
  (visibility = 'followers' AND EXISTS (
    SELECT 1 FROM followers
    WHERE follower_id = auth.uid() AND following_id = posts.user_id
  )) OR
  (visibility = 'friends' AND EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_id_1 = auth.uid() AND user_id_2 = posts.user_id)
    OR (user_id_2 = auth.uid() AND user_id_1 = posts.user_id)
  ))
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_content ON reports(reported_content_id, content_type);