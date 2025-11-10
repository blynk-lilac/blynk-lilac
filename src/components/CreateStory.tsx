import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Image as ImageIcon, Type, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CreateStoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateStory({ open, onOpenChange }: CreateStoryProps) {
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const previews: string[] = [];

    files.forEach(file => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error("Apenas fotos e vídeos são permitidos");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 20MB");
        return;
      }

      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    });

    setMediaFiles([...mediaFiles, ...validFiles]);
    setMediaPreviews([...mediaPreviews, ...previews]);
  };

  const handleCreateStory = async () => {
    if (mediaFiles.length === 0 && !textContent.trim()) {
      toast.error("Adicione uma mídia ou texto");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload de múltiplos arquivos
      if (mediaFiles.length > 0) {
        for (const mediaFile of mediaFiles) {
          const fileExt = mediaFile.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("stories")
            .upload(fileName, mediaFile, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("stories")
            .getPublicUrl(fileName);

          const mediaType = mediaFile.type.startsWith("image/") ? "image" : "video";

          const { error } = await supabase.from("stories").insert({
            user_id: user.id,
            media_url: publicUrl,
            media_type: mediaType,
            text_content: textContent.trim() || null,
          });

          if (error) throw error;
        }
      } else {
        // Story apenas com texto
        const { error } = await supabase.from("stories").insert({
          user_id: user.id,
          media_url: null,
          media_type: null,
          text_content: textContent.trim(),
        });

        if (error) throw error;
      }

      toast.success("Story criado!");
      onOpenChange(false);
      setMediaFiles([]);
      setMediaPreviews([]);
      setTextContent("");
    } catch (error: any) {
      console.error("Story error:", error);
      toast.error(error.message || "Erro ao criar story");
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
    setMediaPreviews(mediaPreviews.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setMediaFiles([]);
    setMediaPreviews([]);
    setTextContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Story</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="media" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Mídia
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="space-y-4">
            {mediaPreviews.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    {mediaFiles[index]?.type.startsWith("image/") ? (
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ) : (
                      <video
                        src={preview}
                        controls
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                      onClick={() => removeMedia(index)}
                    >
                      <X className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Foto/Vídeo
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selecione fotos ou vídeos (máx. 20MB cada)
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <Textarea
              placeholder="Digite seu texto..."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="min-h-[200px]"
            />
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleCreateStory}
          disabled={loading || (mediaFiles.length === 0 && !textContent.trim())}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {loading ? "Criando..." : "Publicar Story"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
