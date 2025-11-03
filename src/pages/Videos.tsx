import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageSquare, Share2, Upload, MoreVertical } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Play current video, pause others
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentVideoIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  }, [currentVideoIndex]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const videoHeight = window.innerHeight - 140;
      const newIndex = Math.round(scrollTop / videoHeight);
      
      if (newIndex !== currentVideoIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVideoIndex(newIndex);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [currentVideoIndex, videos.length]);

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
          verified,
          badge_type
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

  const toggleCaption = (videoId: string) => {
    setExpandedCaptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <Navbar />

        <div className="fixed top-14 right-4 z-50 md:block hidden">
          <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>

        <div 
          ref={containerRef}
          className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {videos.map((video, index) => {
            const isExpanded = expandedCaptions.has(video.id);
            const captionPreview = video.caption?.slice(0, 80);
            const needsExpand = video.caption && video.caption.length > 80;

            return (
              <div 
                key={video.id} 
                className="relative h-screen w-full bg-black snap-start snap-always flex items-center justify-center"
              >
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  src={video.video_url}
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                  onClick={(e) => {
                    const vid = e.currentTarget;
                    if (vid.paused) {
                      vid.play();
                    } else {
                      vid.pause();
                    }
                  }}
                />

                <div className="absolute bottom-24 left-4 right-20 text-white z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Link to={`/profile/${video.user_id}`}>
                      <Avatar className="h-12 w-12 ring-2 ring-white cursor-pointer">
                        <AvatarImage src={video.profiles.avatar_url} />
                        <AvatarFallback>
                          {video.profiles.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <Link to={`/profile/${video.user_id}`} className="hover:underline">
                      <span className="font-bold text-base">{video.profiles.username}</span>
                    </Link>
                    {video.profiles.verified && (
                      <VerificationBadge badgeType={video.profiles.badge_type} className="w-5 h-5" />
                    )}
                  </div>
                  
                  {video.caption && (
                    <div className="text-sm leading-relaxed">
                      <p className="break-words">
                        {isExpanded ? video.caption : captionPreview}
                        {needsExpand && (
                          <button
                            onClick={() => toggleCaption(video.id)}
                            className="ml-2 text-gray-300 font-semibold hover:text-white"
                          >
                            {isExpanded ? 'ver menos' : '... ver mais'}
                          </button>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-32 right-4 flex flex-col items-center gap-6 z-10">
                  <div className="flex flex-col items-center animate-fade-in">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-full bg-transparent hover:bg-white/10 transition-all"
                      onClick={() => handleLike(video.id)}
                    >
                      <Heart
                        className={`h-8 w-8 transition-all ${
                          video.verification_video_likes?.some(l => l.user_id === currentUserId)
                            ? "fill-red-500 text-red-500 scale-110"
                            : "text-white"
                        }`}
                      />
                    </Button>
                    <span className="text-white text-sm font-semibold mt-1">
                      {video.verification_video_likes?.length || 0}
                    </span>
                  </div>

                  <div className="flex flex-col items-center animate-fade-in">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-full bg-transparent hover:bg-white/10 transition-all"
                      onClick={() => navigate(`/comments-video/${video.id}`)}
                    >
                      <MessageSquare className="h-8 w-8 text-white" />
                    </Button>
                    <span className="text-white text-sm font-semibold mt-1">
                      {video.verification_video_comments?.length || 0}
                    </span>
                  </div>

                  <div className="flex flex-col items-center animate-fade-in">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-14 w-14 rounded-full bg-transparent hover:bg-white/10 transition-all"
                      onClick={() => handleShare(video)}
                    >
                      <Share2 className="h-8 w-8 text-white" />
                    </Button>
                  </div>

                  {video.user_id === currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-14 w-14 rounded-full bg-transparent hover:bg-white/10 transition-all"
                        >
                          <MoreVertical className="h-8 w-8 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await supabase
                                .from("verification_videos")
                                .delete()
                                .eq("id", video.id);
                              toast.success("Vídeo eliminado");
                              loadVideos();
                            } catch {
                              toast.error("Erro ao eliminar");
                            }
                          }}
                          className="text-destructive"
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Upload Button */}
        <div className="fixed bottom-20 right-4 z-50 md:hidden">
          <Button 
            onClick={() => setUploadOpen(true)} 
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
          >
            <Upload className="h-6 w-6" />
          </Button>
        </div>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="sm:max-w-md">
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
                className="min-h-24"
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

        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}