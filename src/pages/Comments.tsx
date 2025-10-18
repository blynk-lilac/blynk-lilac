import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, ArrowLeft, Reply, Volume2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AudioRecorder from "@/components/AudioRecorder";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  user_id: string;
  audio_url?: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  comment_likes: { user_id: string }[];
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
}

export default function Comments() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    loadUser();
    loadPost();
    loadComments();

    const channel = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const loadPost = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (
          username,
          full_name,
          avatar_url,
          verified,
          badge_type
        )
      `)
      .eq("id", postId)
      .single();

    if (error) {
      toast.error("Erro ao carregar post");
      return;
    }

    setPost(data);
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (
          username,
          full_name,
          avatar_url,
          verified,
          badge_type
        ),
        comment_likes (
          user_id
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar comentários");
      return;
    }

    setComments(data || []);
  };

  const handleComment = async () => {
    if (!newComment.trim() && !audioUrl) {
      toast.error("Adicione um comentário ou áudio");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: newComment || "",
        audio_url: audioUrl,
        parent_comment_id: replyTo,
      });

      if (error) throw error;

      setNewComment("");
      setAudioUrl(null);
      setReplyTo(null);
      toast.success("Comentário adicionado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao comentar");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const comment = comments.find(c => c.id === commentId);
      const hasLiked = comment?.comment_likes?.some(like => like.user_id === user.id);

      if (hasLiked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
      }

      loadComments();
    } catch (error: any) {
      toast.error("Erro ao curtir comentário");
    }
  };

  const getCommentReplies = (commentId: string) => {
    return comments.filter(c => c.parent_comment_id === commentId);
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? "ml-12 mt-4" : ""}`}>
      <Card className="p-4 bg-card border-border">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.profiles?.avatar_url} />
            <AvatarFallback>
              {comment.profiles?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {comment.profiles?.full_name}
              </span>
              {comment.profiles?.verified && (
                <VerificationBadge badgeType={comment.profiles?.badge_type} className="w-4 h-4" />
              )}
              <span className="text-xs text-muted-foreground">
                @{comment.profiles?.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>

            <p className="mt-1 text-sm text-foreground">{comment.content}</p>

            {comment.audio_url && (
              <div className="mt-2 flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                <Volume2 className="h-4 w-4 text-primary" />
                <audio controls className="flex-1 h-8">
                  <source src={comment.audio_url} type="audio/webm" />
                  Seu navegador não suporta áudio.
                </audio>
              </div>
            )}

            <div className="flex gap-4 mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 h-7"
                onClick={() => handleLikeComment(comment.id)}
              >
                <Heart 
                  className={`h-3 w-3 ${
                    comment.comment_likes?.some(like => like.user_id === currentUserId)
                      ? "fill-red-500 text-red-500"
                      : ""
                  }`}
                />
                <span className="text-xs">
                  {comment.comment_likes?.length || 0}
                </span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 h-7"
                onClick={() => setReplyTo(comment.id)}
              >
                <Reply className="h-3 w-3" />
                <span className="text-xs">Responder</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      {getCommentReplies(comment.id).map(reply => renderComment(reply, true))}
    </div>
  );

  if (!post) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="sticky top-[72px] z-10 bg-background border-b border-border">
          <div className="container mx-auto max-w-2xl px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/feed")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl px-4 py-6">
          <Card className="p-6 bg-card border-border mb-6">
            <div className="flex items-start gap-3">
              <Avatar>
                <AvatarImage src={post.profiles?.avatar_url} />
                <AvatarFallback>
                  {post.profiles?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {post.profiles?.full_name}
                  </span>
                  {post.profiles?.verified && (
                    <VerificationBadge badgeType={post.profiles?.badge_type} className="w-4 h-4" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    @{post.profiles?.username}
                  </span>
                </div>
                <p className="mt-2 text-foreground">{post.content}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card border-border mb-6">
            {replyTo && (
              <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
                <Reply className="h-3 w-3" />
                Respondendo a comentário
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setReplyTo(null)}
                >
                  Cancelar
                </Button>
              </div>
            )}
            {audioUrl && (
              <div className="mb-3 flex items-center gap-2 bg-muted/50 p-2 rounded-lg">
                <Volume2 className="h-4 w-4 text-primary" />
                <audio controls className="flex-1 h-8">
                  <source src={audioUrl} type="audio/webm" />
                </audio>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAudioUrl(null)}
                >
                  Remover
                </Button>
              </div>
            )}
            <Textarea
              placeholder="Adicione um comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-20 bg-input border-border text-foreground resize-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <AudioRecorder onAudioRecorded={setAudioUrl} />
              <Button
                onClick={handleComment}
                disabled={loading || (!newComment.trim() && !audioUrl)}
                className="flex-1 bg-primary text-primary-foreground"
              >
                Comentar
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            {comments
              .filter(c => !c.parent_comment_id)
              .map(comment => renderComment(comment))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
