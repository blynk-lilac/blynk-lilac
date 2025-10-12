import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Lock, 
  Mail, 
  User, 
  Shield, 
  CheckCircle2,
  ArrowLeft,
  Link as LinkIcon,
  Copy
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  verified?: boolean;
  is_public?: boolean;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    bio: "",
    email: "",
    is_public: false,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [isBlockedAccount, setIsBlockedAccount] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Verificar se é admin
    const { data: adminData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!adminData);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || "",
        username: profileData.username || "",
        bio: profileData.bio || "",
        email: user.email || "",
        is_public: profileData.is_public || false,
      });
      setAvatarPreview(profileData.avatar_url || "");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!avatarFile) return avatarPreview;

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleUpdateProfile = async () => {
    // Validar nome completo - apenas letras e espaços
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (formData.full_name && !nameRegex.test(formData.full_name)) {
      toast.error("O nome só pode conter letras e espaços");
      return;
    }

    // Validar username - apenas letras e números
    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (formData.username && !usernameRegex.test(formData.username)) {
      toast.error("O nome de usuário só pode conter letras e números");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let avatarUrl = avatarPreview;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          avatar_url: avatarUrl,
          is_public: formData.is_public,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      navigate("/profile");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success("Senha alterada com sucesso!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: formData.email,
      });

      if (error) throw error;

      toast.success("Email atualizado! Verifique seu novo email.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar pedido de verificação
      const { error: requestError } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          status: "pending",
        });

      if (requestError) throw requestError;

      toast.success("Pedido de verificação enviado!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async () => {
    if (!targetUserId) {
      toast.error("Digite o ID do usuário");
      return;
    }

    setLoading(true);
    try {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("verified")
        .eq("id", targetUserId)
        .single();

      if (!targetProfile) {
        toast.error("Usuário não encontrado");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ verified: !targetProfile.verified })
        .eq("id", targetUserId);

      if (error) throw error;

      toast.success(
        targetProfile.verified
          ? "Verificação removida"
          : "Verificação ativada"
      );
      setTargetUserId("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlockAccount = async () => {
    if (!targetUserId) {
      toast.error("Digite o ID do usuário");
      return;
    }

    setLoading(true);
    try {
      const { data: existingBlock } = await supabase
        .from("blocked_accounts")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingBlock) {
        // Desbloquear
        const { error } = await supabase
          .from("blocked_accounts")
          .delete()
          .eq("user_id", targetUserId);

        if (error) throw error;
        toast.success("Conta desbloqueada");
      } else {
        // Bloquear
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("blocked_accounts")
          .insert({
            user_id: targetUserId,
            blocked_by: user?.id,
            reason: "Bloqueado por admin",
          });

        if (error) throw error;
        toast.success("Conta bloqueada");
      }
      setTargetUserId("");
      setIsBlockedAccount(!existingBlock);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto max-w-2xl px-4 py-8">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Card className="p-8 bg-card border-border shadow-[var(--shadow-elegant)]">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Editar Perfil
            </h1>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="security">Segurança</TabsTrigger>
                <TabsTrigger value="privacy">Privacidade</TabsTrigger>
                <TabsTrigger value="verification">Verificação</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 ring-4 ring-primary/30">
                      <AvatarImage src={avatarPreview} />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                        {profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                    >
                      <Camera className="h-8 w-8 text-white" />
                    </label>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
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

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      className="bg-input border-border text-foreground"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Alterar Senha
                  </h3>

                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="w-full"
                  >
                    Alterar Senha
                  </Button>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Alterar Email
                  </h3>

                  <div>
                    <Label htmlFor="email">Novo Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="bg-input border-border text-foreground"
                    />
                  </div>

                  <Button
                    onClick={handleChangeEmail}
                    disabled={loading}
                    className="w-full"
                  >
                    Alterar Email
                  </Button>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Autenticação de Dois Fatores
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Funcionalidade em desenvolvimento
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Configurações de Privacidade
                  </h3>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">Perfil Público</p>
                      <p className="text-sm text-muted-foreground">
                        Permitir que outros usuários te sigam
                      </p>
                    </div>
                    <Switch
                      checked={formData.is_public}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_public: checked })
                      }
                    />
                  </div>

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  >
                    Salvar Configurações
                  </Button>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Link do Perfil
                  </h3>

                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        Link do seu perfil:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/profile/${profile.id}`}
                          readOnly
                          className="bg-input border-border text-foreground"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/profile/${profile.id}`
                            );
                            toast.success("Link copiado!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        UUID do seu perfil:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={profile.id}
                          readOnly
                          className="bg-input border-border text-foreground font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(profile.id);
                            toast.success("UUID copiado!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="verification" className="space-y-6">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full">
                      <CheckCircle2 className="h-24 w-24 text-blue-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Selo de Verificação</h3>
                    {profile.verified ? (
                      <p className="text-muted-foreground">
                        Sua conta já está verificada!
                      </p>
                    ) : (
                      <>
                        <p className="text-muted-foreground">
                          Obtenha o selo de verificação azul ao lado do seu nome
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Solicite a verificação da sua conta
                        </p>
                      </>
                    )}
                  </div>

                  {!profile.verified && (
                    <>
                      <Card className="p-6 bg-muted/50">
                        <h4 className="font-semibold mb-4">Critérios de Verificação:</h4>
                        <ul className="text-sm text-muted-foreground space-y-2 text-left">
                          <li>✓ Conta ativa e autêntica</li>
                          <li>✓ Informações de perfil completas</li>
                          <li>✓ Comportamento genuíno na plataforma</li>
                          <li>✓ Sem violações das diretrizes</li>
                        </ul>
                      </Card>
                      <Button
                        onClick={handleRequestVerification}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                      >
                        Solicitar Verificação
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>

              {isAdmin && (
                <TabsContent value="admin" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Painel de Administração
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="targetUserId">ID do Usuário</Label>
                        <Input
                          id="targetUserId"
                          value={targetUserId}
                          onChange={(e) => setTargetUserId(e.target.value)}
                          placeholder="UUID do usuário"
                          className="bg-input border-border text-foreground"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={handleToggleVerification}
                          disabled={loading || !targetUserId}
                          variant="outline"
                          className="w-full"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ativar/Desativar Verificação
                        </Button>

                        <Button
                          onClick={handleToggleBlockAccount}
                          disabled={loading || !targetUserId}
                          variant="destructive"
                          className="w-full"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Bloquear/Desbloquear Conta
                        </Button>
                      </div>
                    </div>

                    <Card className="p-4 bg-muted/50 mt-6">
                      <p className="text-sm text-muted-foreground">
                        <strong>Nota:</strong> Essas ações são permanentes e afetam a conta do usuário imediatamente.
                      </p>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
