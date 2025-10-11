import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import VerificationBadge from "@/components/VerificationBadge";

interface Video {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  share_code: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified: boolean;
    badge_type?: string | null;
  };
  verification_video_likes: { user_id: string }[];
  verification_video_comments: { id: string }[];
}

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const { shareCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    loadCurrentUser();
    loadVideos();

    const channel = supabase
      .channel("videos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "verification_videos",
        },
        () => loadVideos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shareCode]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadVideos = async () => {
    let query = supabase
      .from("verification_videos")
      .select(`
        *,
        profiles (
          username,
          avatar_url,
          verified
        ),
        verification_video_likes (user_id),
        verification_video_comments (id)
      `)
      .order("created_at", { ascending: false });

    if (shareCode) {
      query = query.eq("share_code", shareCode);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar vídeos");
      return;
    }

    setVideos(data || []);
  };

  const handleLike = async (videoId: string) => {
    try {
      const video = videos.find(v => v.id === videoId);
      const hasLiked = video?.verification_video_likes?.some(like => like.user_id === currentUserId);

      if (hasLiked) {
        await supabase
          .from("verification_video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", currentUserId);
      } else {
        await supabase
          .from("verification_video_likes")
          .insert({ video_id: videoId, user_id: currentUserId });
      }

      loadVideos();
    } catch (error: any) {
      toast.error("Erro ao curtir vídeo");
    }
  };

  const handleShare = async (video: Video) => {
    const shareUrl = `${window.location.origin}/videos/${video.share_code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error("Selecione um vídeo");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, videoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      const { error } = await supabase.from("verification_videos").insert({
        user_id: user.id,
        video_url: publicUrl,
        caption,
      });

      if (error) throw error;

      toast.success("Vídeo publicado!");
      setUploadOpen(false);
      setVideoFile(null);
      setCaption("");
      loadVideos();
    } catch (error: any) {
      toast.error(error.message || "Erro ao publicar vídeo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-16">
        <Navbar />

        <div className="container mx-auto max-w-md px-0 py-4">
          <div className="flex items-center justify-between px-4 mb-4">
            <h1 className="text-2xl font-bold">Vídeos</h1>
            <Button onClick={() => setUploadOpen(true)} size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>

          <div className="space-y-0">
            {videos.map((video) => (
              <div key={video.id} className="relative h-[calc(100vh-140px)] bg-black snap-start">
                <video
                  src={video.video_url}
                  controls
                  loop
                  className="w-full h-full object-contain"
                />

                <div className="absolute bottom-20 left-4 right-20 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-10 w-10 ring-2 ring-white">
                      <AvatarImage src={video.profiles.avatar_url} />
                      <AvatarFallback>
                        {video.profiles.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{video.profiles.username}</span>
                    {video.profiles.verified && (
                      <VerificationBadge badgeType={video.profiles.badge_type} />
                    )}
                  </div>
                  {video.caption && (
                    <p className="text-sm">{video.caption}</p>
                  )}
                </div>

                <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20"
                      onClick={() => handleLike(video.id)}
                    >
                      <Heart
                        className={`h-7 w-7 ${
                          video.verification_video_likes?.some(l => l.user_id === currentUserId)
                            ? "fill-red-500 text-red-500"
                            : "text-white"
                        }`}
                      />
                    </Button>
                    <span className="text-white text-xs mt-1">
                      {video.verification_video_likes?.length || 0}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20"
                      onClick={() => navigate(`/comments-video/${video.id}`)}
                    >
                      <MessageSquare className="h-7 w-7 text-white" />
                    </Button>
                    <span className="text-white text-xs mt-1">
                      {video.verification_video_comments?.length || 0}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-12 w-12 rounded-full bg-white/10 hover:bg-white/20"
                      onClick={() => handleShare(video)}
                    >
                      <Share2 className="h-7 w-7 text-white" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publicar Vídeo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              />
              <Textarea
                placeholder="Adicione uma legenda..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <Button
                onClick={handleUpload}
                disabled={uploading || !videoFile}
                className="w-full"
              >
                {uploading ? "Publicando..." : "Publicar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
