import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Post {
  id: string;
  content: string;
  user_id: string;
  image_url?: string;
  video_url?: string;
  media_urls?: string[];
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    verified?: boolean;
  };
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
    loadPosts();

    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url,
          verified
        ),
        post_likes (
          user_id
        ),
        comments (
          id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar posts");
      return;
    }

    setPosts(data || []);
  };

  const handleLike = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find(p => p.id === postId);
      const hasLiked = post?.post_likes?.some(like => like.user_id === user.id);

      if (hasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });
      }

      loadPosts();
    } catch (error: any) {
      toast.error("Erro ao curtir post");
    }
  };

  const handleDoubleClick = () => {
    setCreateStoryOpen(true);
  };

  return (
    <ProtectedRoute>
      <div 
        className="min-h-screen bg-background pb-16"
        onDoubleClick={handleDoubleClick}
      >
        <Navbar />

        <div className="container mx-auto max-w-2xl px-3 py-4">
          {/* Stories Bar */}
          <div className="mb-4">
            <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />
          </div>

          {/* Posts - Estilo Threads */}
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Header do Post */}
                <div className="p-3 flex items-start gap-2">
                  <Link to={`/profile/${post.profiles?.id}`}>
                    <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-border">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs bg-muted">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <Link 
                        to={`/chat/${post.profiles?.id}`} 
                        className="hover:underline"
                      >
                        <span className="text-sm font-semibold text-foreground">
                          {post.profiles?.username}
                        </span>
                      </Link>
                      {post.profiles?.verified && (
                        <svg viewBox="0 0 22 22" className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor">
                          <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.27 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.47 1.39-.2 2.9.8 3.92s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.88L6.41 12.5l1.41-1.41L10.75 14.07l5.42-5.42 1.41 1.41-6.83 6.82z"/>
                        </svg>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {/* Conteúdo do Post */}
                    {post.content && (
                      <p className="text-sm text-foreground mb-2 break-words">{post.content}</p>
                    )}

                    {/* Mídia - Tamanho controlado tipo Threads */}
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        {post.media_urls.map((url, index) => {
                          const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
                          return isVideo ? (
                            <video 
                              key={index}
                              src={url} 
                              controls 
                              className="w-full max-h-[400px] object-cover rounded-lg"
                            />
                          ) : (
                            <img 
                              key={index}
                              src={url} 
                              alt="Post" 
                              className="w-full max-h-[400px] object-cover rounded-lg"
                            />
                          );
                        })}
                      </div>
                    )}

                    {post.image_url && !post.media_urls && (
                      <img 
                        src={post.image_url} 
                        alt="Post" 
                        className="w-full max-h-[400px] object-cover rounded-lg mb-2"
                      />
                    )}

                    {post.video_url && !post.media_urls && (
                      <video 
                        src={post.video_url} 
                        controls 
                        className="w-full max-h-[400px] object-cover rounded-lg mb-2"
                      />
                    )}

                    {/* Ações do Post */}
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart 
                          className={`h-5 w-5 transition-all ${
                            post.post_likes?.some(like => like.user_id === currentUserId)
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => navigate(`/comments/${post.id}`)}
                      >
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    </div>

                    {/* Info de curtidas e comentários */}
                    <div className="mt-2 space-y-0.5">
                      {post.post_likes && post.post_likes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {post.post_likes.length} {post.post_likes.length === 1 ? 'curtida' : 'curtidas'}
                        </p>
                      )}

                      {post.comments && post.comments.length > 0 && (
                        <button
                          onClick={() => navigate(`/comments/${post.id}`)}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {post.comments.length === 1 ? '1 comentário' : `${post.comments.length} comentários`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Create Story Dialog */}
        <CreateStory open={createStoryOpen} onOpenChange={setCreateStoryOpen} />
      </div>
    </ProtectedRoute>
  );
}