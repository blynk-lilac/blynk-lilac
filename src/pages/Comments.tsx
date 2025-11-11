import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, Share2, Send, ArrowLeft, MoreHorizontal, Smile, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import VoiceRecorder from "@/components/VoiceRecorder";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  audio_url?: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  likes: { count: number }[];
  replies?: Comment[];
  user_liked?: boolean;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  likes: { count: number }[];
  comments: { count: number }[];
}

export default function Comments() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    loadPost();
    loadComments();
    loadCurrentUser();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadPost = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (username, avatar_url, verified, badge_type),
        likes:post_likes(count),
        comments:comments(count)
      `)
      .eq("id", postId)
      .single();

    if (data) setPost(data);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (username, avatar_url, verified, badge_type),
        likes:comment_likes(count)
      `)
      .eq("post_id", postId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: true });

    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const commentsWithLikesAndReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from("comments")
            .select(`
              *,
              profiles (username, avatar_url, verified, badge_type),
              likes:comment_likes(count)
            `)
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          const { data: userLike } = await supabase
            .from("comment_likes")
            .select("*")
            .eq("comment_id", comment.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...comment,
            replies: replies || [],
            user_liked: !!userLike,
          };
        })
      );

      setComments(commentsWithLikesAndReplies);
    }
  };

  const handleComment = async (audioUrl?: string) => {
    if (!newComment.trim() && !audioUrl) return;

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: audioUrl ? "🎤 Comentário de voz" : newComment,
      audio_url: audioUrl,
      parent_comment_id: replyingTo,
    });

    if (error) {
      toast.error("Erro ao comentar");
      return;
    }

    setNewComment("");
    setReplyingTo(null);
    loadComments();
  };

  const handleLikeComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    if (comment.user_liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId);
    } else {
      await supabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: currentUserId,
      });
    }

    loadComments();
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? "ml-12 mt-3" : ""}`}>
      <div className="flex gap-2">
        <Avatar className="h-9 w-9 flex-shrink-0">
          <AvatarImage src={comment.profiles.avatar_url} />
          <AvatarFallback>
            {comment.profiles.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-muted rounded-2xl px-4 py-2 inline-block max-w-full">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-semibold text-sm">
                {comment.profiles.username}
              </span>
              {comment.profiles.verified && (
                <VerificationBadge
                  badgeType={comment.profiles.badge_type}
                  className="w-3.5 h-3.5"
                />
              )}
            </div>
            {comment.audio_url ? (
              <audio
                controls
                className="max-w-full h-8"
                src={comment.audio_url}
              />
            ) : (
              <p className="text-sm break-words">{comment.content}</p>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 ml-3 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: false,
                locale: ptBR,
              })}
            </span>
            <button
              onClick={() => handleLikeComment(comment.id)}
              className={`font-semibold hover:underline ${
                comment.user_liked ? "text-primary" : ""
              }`}
            >
              Gosto
              {(comment.likes[0]?.count || 0) > 0 && ` • ${comment.likes[0]?.count}`}
            </button>
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="font-semibold hover:underline"
            >
              Responder
            </button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!post) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">
              Publicação de {post.profiles.username}
            </h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Post e Comments */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto">
            {/* Post Card */}
            <Card className="m-4 border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles.avatar_url} />
                      <AvatarFallback>
                        {post.profiles.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">
                          {post.profiles.username}
                        </span>
                        {post.profiles.verified && (
                          <VerificationBadge
                            badgeType={post.profiles.badge_type}
                            className="w-4 h-4"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        <span>•</span>
                        <span>🌍</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>

                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full rounded-lg mb-3"
                  />
                )}
                {post.video_url && (
                  <video
                    src={post.video_url}
                    controls
                    className="w-full rounded-lg mb-3"
                  />
                )}
                {post.audio_url && (
                  <audio src={post.audio_url} controls className="w-full mb-3" />
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground py-2">
                  <span>{post.likes[0]?.count || 0} gostos</span>
                  <span>{post.comments[0]?.count || 0} comentários</span>
                </div>

                <div className="border-t pt-2 flex items-center justify-around">
                  <Button variant="ghost" size="sm" className="flex-1 gap-2">
                    <Heart className="h-5 w-5" />
                    <span className="font-semibold text-sm">Gosto</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">Comentar</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-2">
                    <Share2 className="h-5 w-5" />
                    <span className="font-semibold text-sm">Partilhar</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Comments */}
            <div className="px-4 pb-4 space-y-4">
              {comments.map((comment) => renderComment(comment))}
            </div>
          </div>
        </ScrollArea>

        {/* Input de comentário */}
        <div className="border-t p-4 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleComment();
            }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.profiles.avatar_url} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={
                  replyingTo
                    ? "Escrever uma resposta..."
                    : `Comentar como ${post.profiles.username}`
                }
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
              />
              <VoiceRecorder onAudioRecorded={(audioUrl) => handleComment(audioUrl)} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8"
              >
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
