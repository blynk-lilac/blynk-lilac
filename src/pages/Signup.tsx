import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Signup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && profile.full_name && profile.username) {
          navigate("/feed");
        }
      }
    };

    checkProfile();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string) => {
    if (!avatarFile) return null;

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${userId}/${Math.random()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarFile);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let avatarUrl = null;
      if (step === 1 && avatarFile) {
        avatarUrl = await uploadAvatar(user.id);
      }

      if (step === 1) {
        setStep(2);
      } else if (step === 2) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.fullName,
            username: formData.username,
            avatar_url: avatarUrl || undefined,
          })
          .eq("id", user.id);

        if (error) throw error;

        toast.success("Perfil criado com sucesso!");
        navigate("/feed");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 bg-card border-border">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Complete seu perfil
            </h1>
            <p className="text-muted-foreground">
              Passo {step} de 2
            </p>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                </div>
                <Label
                  htmlFor="avatar-upload"
                  className="mt-4 cursor-pointer text-primary hover:text-primary/80"
                >
                  Escolher foto de perfil
                </Label>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-primary text-primary-foreground"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Próximo"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div>
                <Label htmlFor="username">Nome de Usuário</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="bg-input border-border text-foreground"
                />
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-primary text-primary-foreground"
                disabled={loading || !formData.fullName || !formData.username}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}