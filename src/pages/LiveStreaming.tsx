import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, VideoOff, Mic, MicOff, X, Users, SwitchCamera } from "lucide-react";

interface LiveStream {
  id: string;
  title: string;
  user_id: string;
  viewer_count: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
    badge_type: string | null;
  };
}

export default function LiveStreaming() {
  const navigate = useNavigate();
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadStreams();

    const channel = supabase
      .channel("live-streams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_streams" },
        () => {
          loadStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopStreaming();
    };
  }, []);

  const loadStreams = async () => {
    const { data, error } = await supabase
      .from("live_streams")
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
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar streams:", error);
      return;
    }

    setStreams(data || []);
  };

  const startCamera = async (facing: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      toast.error("Erro ao acessar câmera");
      throw error;
    }
  };

  const createStream = async () => {
    if (!streamTitle.trim()) {
      toast.error("Digite um título para o stream");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await startCamera(facingMode);

      const { data, error } = await supabase
        .from("live_streams")
        .insert({
          user_id: user.id,
          title: streamTitle,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentStreamId(data.id);
      setIsStreaming(true);
      setCreateDialogOpen(false);
      toast.success("Stream iniciado!");

    } catch (error: any) {
      console.error("Erro ao criar stream:", error);
      toast.error("Erro ao iniciar stream");
    }
  };

  const stopStreaming = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (currentStreamId) {
      await supabase
        .from("live_streams")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", currentStreamId);
    }

    setIsStreaming(false);
    setCurrentStreamId(null);
    setStreamTitle("");
    toast.success("Stream finalizado");
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const switchCamera = async () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    
    if (isStreaming) {
      try {
        await startCamera(newFacing);
      } catch (error) {
        toast.error("Erro ao trocar câmera");
      }
    }
  };

  const viewStream = (streamId: string) => {
    navigate(`/live-watch/${streamId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Streaming Ao Vivo</h1>
              <p className="text-muted-foreground mt-1">Transmita para todos os seus seguidores</p>
            </div>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isStreaming}
            >
              <Video className="w-5 h-5 mr-2" />
              Iniciar Stream
            </Button>
          </div>

          {/* Active Stream Preview */}
          {isStreaming && (
            <Card className="p-4 mb-6 bg-card">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                      <span className="text-sm font-semibold text-red-600">AO VIVO</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{streamTitle}</span>
                  </div>
                  <Button
                    onClick={stopStreaming}
                    variant="destructive"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Finalizar
                  </Button>
                </div>

                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Stream Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    onClick={toggleCamera}
                    variant={isCameraOn ? "default" : "destructive"}
                    size="lg"
                    className="rounded-full w-14 h-14"
                  >
                    {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    onClick={toggleMic}
                    variant={isMicOn ? "default" : "destructive"}
                    size="lg"
                    className="rounded-full w-14 h-14"
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </Button>

                  <Button
                    onClick={switchCamera}
                    variant="secondary"
                    size="lg"
                    className="rounded-full w-14 h-14"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Active Streams Grid */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Streams Ativos</h2>
            
            {streams.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum stream ativo no momento</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {streams.map((stream) => (
                  <Card
                    key={stream.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => viewStream(stream.id)}
                  >
                    <div className="relative aspect-video bg-gradient-to-br from-red-500 to-pink-600">
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        AO VIVO
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 text-white px-2 py-1 rounded-full text-xs">
                        <Users className="w-3 h-3" />
                        {stream.viewer_count}
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={stream.profiles.avatar_url} />
                          <AvatarFallback>
                            {stream.profiles.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
                            {stream.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {stream.profiles.full_name || stream.profiles.username}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Stream Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Iniciar Transmissão</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Título do Stream</label>
                <Input
                  placeholder="Ex: Jogando ao vivo, Conversando com vocês..."
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Câmera</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={facingMode === "user" ? "default" : "outline"}
                    onClick={() => setFacingMode("user")}
                    className="flex-1"
                  >
                    Frontal
                  </Button>
                  <Button
                    type="button"
                    variant={facingMode === "environment" ? "default" : "outline"}
                    onClick={() => setFacingMode("environment")}
                    className="flex-1"
                  >
                    Traseira
                  </Button>
                </div>
              </div>

              <Button
                onClick={createStream}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Começar Transmissão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
