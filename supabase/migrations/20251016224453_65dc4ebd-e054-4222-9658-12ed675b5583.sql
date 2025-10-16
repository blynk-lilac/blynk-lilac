-- Adicionar foreign key entre stories e profiles
ALTER TABLE stories
ADD CONSTRAINT stories_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Adicionar foreign key entre verification_videos e profiles
ALTER TABLE verification_videos
ADD CONSTRAINT verification_videos_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;