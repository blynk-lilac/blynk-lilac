import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, MoreHorizontal, Globe, Users, Radio } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import StoriesBar from "@/components/StoriesBar";
import CreateStory from "@/components/CreateStory";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import PostMenu from "@/components/PostMenu";
import { Separator } from "@/components/ui/separator";

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  viewer_count: number;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
    badge_type: string | null;
  };
}

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
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
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
    loadLiveStreams();

    const postsChannel = supabase
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

    const streamsChannel = supabase
      .channel("streams-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_streams",
        },
        () => {
          loadLiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(streamsChannel);
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

  const loadLiveStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url,
          verified,
          badge_type
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Erro ao carregar streams:", error);
      return;
    }

    setLiveStreams(data || []);
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

      toast.success("Publicação compartilhada!");
      loadPosts();
    } catch (error: any) {
      toast.error("Erro ao compartilhar");
    }
  };

  const renderMediaGrid = (mediaUrls: string[]) => {
    const count = mediaUrls.length;

    if (count === 1) {
      const isVideo = mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.webm') || mediaUrls[0].includes('.mov');
      return (
        <div className="w-full bg-black/5">
          {isVideo ? (
            <video src={mediaUrls[0]} controls className="w-full max-h-[600px] object-contain" />
          ) : (
            <img src={mediaUrls[0]} alt="Post" className="w-full max-h-[600px] object-cover" />
          )}
        </div>
      );
    }

    if (count === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 bg-black/5">
          {mediaUrls.map((url, idx) => {
            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
            return isVideo ? (
              <video key={idx} src={url} controls className="w-full h-[300px] object-cover" />
            ) : (
              <img key={idx} src={url} alt="Post" className="w-full h-[300px] object-cover" />
            );
          })}
        </div>
      );
    }

    if (count === 3) {
      // Layout: 1 grande à esquerda, 2 pequenas à direita
      return (
        <div className="grid grid-cols-2 gap-0.5 bg-black/5 h-[400px]">
          <div className="row-span-2">
            {mediaUrls[0].includes('.mp4') || mediaUrls[0].includes('.webm') || mediaUrls[0].includes('.mov') ? (
              <video src={mediaUrls[0]} controls className="w-full h-full object-cover" />
            ) : (
              <img src={mediaUrls[0]} alt="Post" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="space-y-0.5">
            {mediaUrls.slice(1).map((url, idx) => {
              const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
              return isVideo ? (
                <video key={idx} src={url} controls className="w-full h-[199px] object-cover" />
              ) : (
                <img key={idx} src={url} alt="Post" className="w-full h-[199px] object-cover" />
              );
            })}
          </div>
        </div>
      );
    }

    if (count === 4) {
      return (
        <div className="grid grid-cols-2 gap-0.5 bg-black/5">
          {mediaUrls.map((url, idx) => {
            const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
            return isVideo ? (
              <video key={idx} src={url} controls className="w-full h-[250px] object-cover" />
            ) : (
              <img key={idx} src={url} alt="Post" className="w-full h-[250px] object-cover" />
            );
          })}
        </div>
      );
    }

    if (count >= 5) {
      // Layout: 2 em cima, 3 embaixo (ou +3 embaixo com indicador)
      return (
        <div className="bg-black/5">
          <div className="grid grid-cols-2 gap-0.5 mb-0.5">
            {mediaUrls.slice(0, 2).map((url, idx) => {
              const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
              return isVideo ? (
                <video key={idx} src={url} controls className="w-full h-[200px] object-cover" />
              ) : (
                <img key={idx} src={url} alt="Post" className="w-full h-[200px] object-cover" />
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {mediaUrls.slice(2, 5).map((url, idx) => {
              const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
              const isLast = idx === 2 && count > 5;
              return (
                <div key={idx} className="relative">
                  {isVideo ? (
                    <video src={url} controls className="w-full h-[150px] object-cover" />
                  ) : (
                    <img src={url} alt="Post" className="w-full h-[150px] object-cover" />
                  )}
                  {isLast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{count - 5}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <ProtectedRoute>
      <div 
        className="min-h-screen bg-background pb-20"
        onDoubleClick={handleDoubleClick}
      >
        <Navbar />

        <div className="container mx-auto max-w-2xl px-0 sm:px-4 py-4">
          {/* Stories Bar */}
          <div className="px-4 sm:px-0">
            <StoriesBar onCreateStory={() => setCreateStoryOpen(true)} />
          </div>

          {/* Live Streams Section */}
          {liveStreams.length > 0 && (
            <div className="px-4 sm:px-0 mt-4">
              <Card className="bg-card border-0 sm:border sm:border-border rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-sm">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Radio className="w-5 h-5 text-red-600" />
                      <h2 className="font-semibold text-foreground">Ao Vivo Agora</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/live")}
                      className="text-primary hover:text-primary"
                    >
                      Ver todos
                    </Button>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {liveStreams.map((stream) => (
                      <div
                        key={stream.id}
                        onClick={() => navigate(`/live-watch/${stream.id}`)}
                        className="flex-shrink-0 w-40 cursor-pointer group"
                      >
                        <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 mb-2">
                          <Avatar className="w-full h-full">
                            <AvatarImage src={stream.profiles.avatar_url} className="object-cover" />
                            <AvatarFallback className="text-4xl text-white">
                              {stream.profiles.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-xs text-white font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            AO VIVO
                          </div>

                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-white text-xs">
                              <Users className="w-3 h-3" />
                              <span>{stream.viewer_count}</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-1">
                          <p className="text-sm font-medium line-clamp-1 text-foreground group-hover:text-primary">
                            {stream.profiles.full_name || stream.profiles.username}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {stream.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Feed - Estilo Facebook Moderno */}
          <div className="space-y-4 mt-4">
            {posts.map((post) => (
              <Card key={post.id} className="bg-card border-0 sm:border sm:border-border rounded-none sm:rounded-xl overflow-hidden shadow-none sm:shadow-sm hover:sm:shadow-md transition-all">
                {/* Header do Post */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Link to={`/profile/${post.profiles?.id}`} className="flex-shrink-0">
                        <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
                            {post.profiles?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link 
                            to={`/profile/${post.profiles?.id}`} 
                            className="hover:underline font-semibold text-[15px] truncate"
                          >
                            {post.profiles?.full_name || post.profiles?.username}
                          </Link>
                          {post.profiles?.verified && (
                            <VerificationBadge badgeType={post.profiles?.badge_type} className="w-4 h-4 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          <span>•</span>
                          <Globe className="h-3 w-3" />
                        </div>
                      </div>
                    </div>

                    <PostMenu 
                      postId={post.id}
                      isOwner={post.user_id === currentUserId}
                      onDelete={loadPosts}
                    />
                  </div>

                  {/* Conteúdo do Post */}
                  {post.content && (
                    <p className="text-[15px] text-foreground break-words whitespace-pre-wrap leading-5">
                      {post.content}
                    </p>
                  )}
                </div>

                {/* Mídia - Grid Layout Estilo Facebook */}
                {post.media_urls && post.media_urls.length > 0 && renderMediaGrid(post.media_urls)}
                
                {post.image_url && !post.media_urls && (
                  <div className="w-full bg-black/5">
                    <img 
                      src={post.image_url} 
                      alt="Post" 
                      className="w-full max-h-[600px] object-cover"
                    />
                  </div>
                )}

                {post.video_url && !post.media_urls && (
                  <div className="w-full bg-black/5">
                    <video 
                      src={post.video_url} 
                      controls 
                      className="w-full max-h-[600px] object-contain"
                    />
                  </div>
                )}

                {/* Estatísticas e Ações */}
                <div className="px-4 pb-2">
                  {/* Contadores */}
                  <div className="flex items-center justify-between py-2 text-[13px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {post.post_likes && post.post_likes.length > 0 && (
                        <>
                          <div className="flex items-center">
                            <div className="w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center">
                              <Heart className="h-2.5 w-2.5 fill-white text-white" />
                            </div>
                          </div>
                          <span className="hover:underline cursor-pointer">
                            {post.post_likes.length}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {post.comments && post.comments.length > 0 && (
                        <button
                          onClick={() => navigate(`/comments/${post.id}`)}
                          className="hover:underline"
                        >
                          {post.comments.length} {post.comments.length === 1 ? 'comentário' : 'comentários'}
                        </button>
                      )}
                    </div>
                  </div>

                  <Separator className="mb-1" />

                  {/* Botões de Ação */}
                  <div className="flex items-center justify-around -mx-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 gap-2 hover:bg-muted/70 rounded-lg h-9 font-semibold"
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart 
                        className={`h-[18px] w-[18px] transition-all ${
                          post.post_likes?.some(like => like.user_id === currentUserId)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span className={`text-[15px] ${
                        post.post_likes?.some(like => like.user_id === currentUserId)
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}>
                        Gosto
                      </span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 gap-2 hover:bg-muted/70 rounded-lg h-9 font-semibold"
                      onClick={() => navigate(`/comments/${post.id}`)}
                    >
                      <MessageSquare className="h-[18px] w-[18px] text-muted-foreground" />
                      <span className="text-[15px] text-muted-foreground">Comentar</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 gap-2 hover:bg-muted/70 rounded-lg h-9 font-semibold"
                      onClick={() => handleRepost(post.id)}
                    >
                      <Share2 className="h-[18px] w-[18px] text-muted-foreground" />
                      <span className="text-[15px] text-muted-foreground">Partilhar</span>
                    </Button>
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