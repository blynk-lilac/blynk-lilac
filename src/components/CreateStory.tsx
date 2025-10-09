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
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("media");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Apenas fotos e vídeos são permitidos");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 20MB");
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleCreateStory = async () => {
    if (!mediaFile && !textContent.trim()) {
      toast.error("Adicione uma mídia ou texto");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        const fileExt = mediaFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

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

        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith("image/") ? "image" : "video";
      }

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        text_content: textContent.trim() || null,
      });

      if (error) throw error;

      toast.success("Story criado!");
      onOpenChange(false);
      setMediaFile(null);
      setMediaPreview("");
      setTextContent("");
    } catch (error: any) {
      console.error("Story error:", error);
      toast.error(error.message || "Erro ao criar story");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMediaFile(null);
    setMediaPreview("");
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
            {mediaPreview ? (
              <div className="relative">
                {mediaFile?.type.startsWith("image/") ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full h-80 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full h-80 object-cover rounded-lg"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  onClick={() => {
                    setMediaFile(null);
                    setMediaPreview("");
                  }}
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
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
                    Selecione uma foto ou vídeo (máx. 20MB)
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
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
          disabled={loading || (!mediaFile && !textContent.trim())}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {loading ? "Criando..." : "Publicar Story"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
