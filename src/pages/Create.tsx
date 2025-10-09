import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Video, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Create() {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalFiles = mediaFiles.length + files.length;
    
    if (totalFiles > 10) {
      toast.error("Máximo de 10 mídias por post");
      return;
    }

    const images = files.filter(f => f.type.startsWith('image/'));
    const videos = files.filter(f => f.type.startsWith('video/'));
    const currentImages = mediaFiles.filter(f => f.type.startsWith('image/')).length;
    const currentVideos = mediaFiles.filter(f => f.type.startsWith('video/')).length;

    if (currentImages + images.length > 5) {
      toast.error("Máximo de 5 fotos por post");
      return;
    }

    if (currentVideos + videos.length > 5) {
      toast.error("Máximo de 5 vídeos por post");
      return;
    }

    const newFiles = [...mediaFiles, ...files];
    setMediaFiles(newFiles);

    const previews = files.map(file => URL.createObjectURL(file));
    setMediaPreviews([...mediaPreviews, ...previews]);
  };

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Digite algo ou adicione uma mídia");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const mediaUrls: string[] = [];

      for (const file of mediaFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
      }

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      });

      if (error) throw error;

      toast.success("Post criado!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-16">
        <Navbar />

        <div className="container mx-auto max-w-2xl px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">Criar Publicação</h1>

          <Card className="p-6 bg-card border border-border rounded-xl">
            <Textarea
              placeholder="No que você está pensando?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] bg-transparent border-0 text-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />

            {mediaPreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    {mediaFiles[index]?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 bg-black/60 hover:bg-black/80 rounded-full"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="hidden"
                id="media-upload"
                multiple
              />
              <label htmlFor="media-upload" className="flex-1">
                <Button variant="outline" size="lg" className="w-full cursor-pointer" asChild>
                  <span className="flex items-center justify-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    <Video className="h-5 w-5" />
                    <span>Adicionar Foto/Vídeo</span>
                  </span>
                </Button>
              </label>
            </div>

            <Button
              onClick={handleCreatePost}
              disabled={loading || (!content.trim() && mediaFiles.length === 0)}
              size="lg"
              className="w-full mt-4 bg-primary hover:bg-primary/90 font-semibold"
            >
              {loading ? "Publicando..." : "Publicar"}
            </Button>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
