import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Repeat2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import PostMenu from "@/components/PostMenu";

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
    badge_type?: string | null;
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
          verified,
          badge_type
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

  const handleRepost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: post.content,
          media_urls: post.media_urls,
          image_url: post.image_url,
          video_url: post.video_url,
        });

      if (error) throw error;

      toast.success("Publicação recompartilhada!");
      loadPosts();
    } catch (error: any) {
      toast.error("Erro ao recompartilhar");
    }
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
          <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />

          {/* Posts - Estilo Facebook */}
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-card hover:shadow-hover transition-shadow">
                {/* Header do Post */}
                <div className="p-4 flex items-start gap-3">
                  <Link to={`/profile/${post.profiles?.id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-border hover:ring-primary transition-all">
                      <AvatarImage src={post.profiles?.avatar_url} />
                      <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link 
                        to={`/profile/${post.profiles?.id}`} 
                        className="hover:underline"
                      >
                        <span className="text-sm font-semibold text-foreground">
                          {post.profiles?.username}
                        </span>
                      </Link>
                      {post.profiles?.verified && (
                        <VerificationBadge badgeType={post.profiles?.badge_type} className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <PostMenu 
                    postId={post.id}
                    isOwner={post.user_id === currentUserId}
                    onDelete={loadPosts}
                  />
                </div>

                {/* Conteúdo do Post */}
                {post.content && (
                  <p className="px-4 pb-3 text-sm text-foreground break-words whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Mídia */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="w-full bg-muted/30">
                    {post.media_urls.map((url, index) => {
                      const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
                      return isVideo ? (
                        <video 
                          key={index}
                          src={url} 
                          controls 
                          className="w-full max-h-[500px] object-contain bg-black"
                        />
                      ) : (
                        <img 
                          key={index}
                          src={url} 
                          alt="Post" 
                          className="w-full max-h-[500px] object-cover"
                        />
                      );
                    })}
                  </div>
                )}

                {post.image_url && !post.media_urls && (
                  <div className="w-full bg-muted/30">
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full max-h-[500px] object-cover"
                    />
                  </div>
                )}

                {post.video_url && !post.media_urls && (
                  <div className="w-full bg-muted/30">
                    <video 
                      src={post.video_url} 
                      controls 
                      className="w-full max-h-[500px] object-contain bg-black"
                    />
                  </div>
                )}

                {/* Estatísticas */}
                <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
                  <span>
                    {post.post_likes && post.post_likes.length > 0 && (
                      <span className="hover:underline cursor-pointer">
                        {post.post_likes.length} {post.post_likes.length === 1 ? 'curtida' : 'curtidas'}
                      </span>
                    )}
                  </span>
                  <span>
                    {post.comments && post.comments.length > 0 && (
                      <button
                        onClick={() => navigate(`/comments/${post.id}`)}
                        className="hover:underline"
                      >
                        {post.comments.length === 1 ? '1 comentário' : `${post.comments.length} comentários`}
                      </button>
                    )}
                  </span>
                </div>

                {/* Ações do Post */}
                <div className="px-4 pb-3 pt-2 flex items-center gap-1 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 gap-2 hover:bg-muted/50 rounded-lg"
                    onClick={() => handleLike(post.id)}
                  >
                    <Heart 
                      className={`h-5 w-5 transition-all ${
                        post.post_likes?.some(like => like.user_id === currentUserId)
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <span className="text-sm font-medium text-muted-foreground">Curtir</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 gap-2 hover:bg-muted/50 rounded-lg"
                    onClick={() => navigate(`/comments/${post.id}`)}
                  >
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Comentar</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 gap-2 hover:bg-muted/50 rounded-lg"
                    onClick={() => handleRepost(post.id)}
                  >
                    <Repeat2 className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Compartilhar</span>
                  </Button>
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