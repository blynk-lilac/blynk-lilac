import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Heart, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export default function CommentsVideo() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    loadCurrentUser();
    loadComments();

    const channel = supabase
      .channel("video-comments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_video_comments",
        },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("verification_video_comments")
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("video_id", videoId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar comentários");
      return;
    }

    setComments(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("verification_video_comments").insert({
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      loadComments();
    } catch (error: any) {
      toast.error("Erro ao adicionar comentário");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("verification_video_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("Comentário deletado");
      loadComments();
    } catch (error: any) {
      toast.error("Erro ao deletar comentário");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <Navbar />

        <div className="container mx-auto max-w-2xl px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <h1 className="text-2xl font-bold mb-4">Comentários</h1>

          <Card className="p-4 bg-card border border-border rounded-xl mb-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicione um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 min-h-[60px] bg-transparent border-0 resize-none focus-visible:ring-0"
              />
              <Button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            {comments.map((comment) => (
              <Card key={comment.id} className="p-4 bg-card border border-border rounded-xl">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.profiles?.avatar_url} />
                    <AvatarFallback>
                      {comment.profiles?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">
                        {comment.profiles?.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{comment.content}</p>

                    {comment.user_id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="mt-2 h-auto p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Deletar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
