import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Users, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";

interface StreamData {
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

export default function LiveWatch() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        joinStream(user.id);
      }
    };

    loadUser();
    loadStream();

    const channel = supabase
      .channel(`stream-${streamId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` },
        (payload) => {
          if (!payload.new.is_active) {
            toast.error("Stream finalizado");
            navigate("/live");
          }
        }
      )
      .subscribe();

    return () => {
      leaveStream();
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  const loadStream = async () => {
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
      .eq("id", streamId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      toast.error("Stream não encontrado");
      navigate("/live");
      return;
    }

    setStream(data);
  };

  const joinStream = async (userId: string) => {
    await supabase
      .from("stream_viewers")
      .insert({
        stream_id: streamId,
        user_id: userId
      });
  };

  const leaveStream = async () => {
    if (currentUserId && streamId) {
      await supabase
        .from("stream_viewers")
        .delete()
        .eq("stream_id", streamId)
        .eq("user_id", currentUserId);
    }
  };

  const toggleLike = () => {
    setHasLiked(!hasLiked);
    toast.success(hasLiked ? "Curtida removida" : "Curtiu o stream!");
  };

  if (!stream) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigate("/live")}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-semibold">AO VIVO</span>
              </div>
              
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Users className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">{stream.viewer_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Container */}
        <div className="relative w-full h-screen flex items-center justify-center bg-black">
          {/* Placeholder - Em produção real, aqui viria o player de vídeo WebRTC */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-600/20 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center mx-auto mb-6">
                <Avatar className="w-28 h-28">
                  <AvatarImage src={stream.profiles.avatar_url} />
                  <AvatarFallback className="text-4xl">
                    {stream.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-lg opacity-80">Stream ao vivo de</p>
              <p className="text-2xl font-bold">{stream.profiles.full_name || stream.profiles.username}</p>
            </div>
          </div>
        </div>

        {/* Bottom Info Card */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <Card className="p-4 bg-black/60 backdrop-blur-sm border-white/10">
            <div className="flex items-start gap-3">
              <Avatar 
                className="w-12 h-12 cursor-pointer ring-2 ring-red-500"
                onClick={() => navigate(`/profile/${stream.profiles.id}`)}
              >
                <AvatarImage src={stream.profiles.avatar_url} />
                <AvatarFallback>
                  {stream.profiles.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">
                    {stream.profiles.full_name || stream.profiles.username}
                  </p>
                  {stream.profiles.verified && (
                    <VerificationBadge badgeType={stream.profiles.badge_type} />
                  )}
                </div>
                <p className="text-sm text-white/80 line-clamp-2">{stream.title}</p>
                <p className="text-xs text-white/60 mt-1">
                  {formatDistanceToNow(new Date(stream.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </p>
              </div>

              <Button
                onClick={toggleLike}
                variant="ghost"
                size="icon"
                className={`${hasLiked ? "text-red-500" : "text-white"} hover:bg-white/20`}
              >
                <Heart className={`w-6 h-6 ${hasLiked ? "fill-red-500" : ""}`} />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
