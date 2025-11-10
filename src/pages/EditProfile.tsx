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
  banner_url?: string;
  two_factor_enabled?: boolean;
}

export default function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
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
      setBannerPreview(profileData.banner_url || "");
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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
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

  const uploadBanner = async (userId: string) => {
    if (!bannerFile) return bannerPreview;

    const fileExt = bannerFile.name.split(".").pop();
    const fileName = `banners/${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, bannerFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
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

      let bannerUrl = bannerPreview;
      if (bannerFile) {
        bannerUrl = await uploadBanner(user.id);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
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
      <div className="min-h-screen bg-background pb-20">
        <Navbar />

        <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="mb-3 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground px-2">
              Definições e Privacidade
            </h1>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1 bg-muted/50 p-1 rounded-lg mb-3">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">Perfil</TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm">Segurança</TabsTrigger>
                <TabsTrigger value="privacy" className="text-xs sm:text-sm">Privacidade</TabsTrigger>
                {isAdmin && <TabsTrigger value="admin" className="text-xs sm:text-sm col-span-2 sm:col-span-1">Admin</TabsTrigger>}
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <Card className="p-0 overflow-hidden border-border bg-card">
                  {/* Banner */}
                  <div className="relative group">
                    <div className="relative h-32 sm:h-40 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 overflow-hidden">
                      {bannerPreview ? (
                        <img 
                          src={bannerPreview} 
                          alt="Banner" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05))] bg-[length:60px_60px]" />
                      )}
                    </div>
                    <label
                      htmlFor="banner-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                    >
                      <div className="text-center text-white">
                        <Camera className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-1" />
                        <p className="text-xs sm:text-sm font-semibold">Alterar capa</p>
                      </div>
                    </label>
                    <input
                      type="file"
                      id="banner-upload"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                    />
                  </div>

                  {/* Avatar */}
                  <div className="px-4 pb-4">
                    <div className="flex justify-between items-start -mt-16 sm:-mt-20">
                      <div className="relative group">
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-background">
                          <AvatarImage src={avatarPreview} />
                          <AvatarFallback className="text-2xl sm:text-3xl bg-gradient-to-br from-primary to-secondary text-white">
                            {profile.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <label
                          htmlFor="avatar-upload"
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        >
                          <Camera className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
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
                  </div>
                </Card>

                <Card className="p-4 space-y-4 border-border bg-card">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-medium">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className="bg-input border-border text-foreground"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">Nome de Usuário</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="bg-input border-border text-foreground"
                      placeholder="@seunome"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
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
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-3">
                <Card className="p-4 space-y-4 border-border bg-card">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
                    Alterar Senha
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm">Nova Senha</Label>
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
                      placeholder="Digite a nova senha"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirmar Senha</Label>
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
                      placeholder="Confirme a nova senha"
                    />
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="w-full"
                  >
                    Alterar Senha
                  </Button>
                </Card>

                <Card className="p-4 space-y-4 border-border bg-card">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                    Alterar Email
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Novo Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="bg-input border-border text-foreground"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <Button
                    onClick={handleChangeEmail}
                    disabled={loading}
                    className="w-full"
                  >
                    Alterar Email
                  </Button>
                </Card>

                <Card className="p-4 space-y-4 border-border bg-card">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                    Autenticação de Dois Fatores (2FA)
                  </h3>
                  
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="space-y-1 flex-1 pr-2">
                      <p className="font-medium text-sm sm:text-base">Ativar 2FA</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Camada extra de segurança
                      </p>
                    </div>
                    <Switch
                      checked={profile.two_factor_enabled || false}
                      onCheckedChange={async (checked) => {
                        setLoading(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Usuário não autenticado");

                          const { error } = await supabase
                            .from("profiles")
                            .update({ two_factor_enabled: checked })
                            .eq("id", user.id);

                          if (error) throw error;

                          setProfile({ ...profile, two_factor_enabled: checked });
                          toast.success(checked ? "2FA ativado!" : "2FA desativado!");
                        } catch (error: any) {
                          toast.error(error.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                    />
                  </div>
                  
                  {profile.two_factor_enabled && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                        ✓ Sua conta está protegida com autenticação de dois fatores.
                      </p>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-3">
                <Card className="p-4 space-y-4 border-border bg-card">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 sm:h-5 sm:w-5" />
                    Configurações de Privacidade
                  </h3>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="space-y-1 flex-1 pr-2">
                      <p className="font-medium text-sm sm:text-base">Perfil Público</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Permitir que outros te sigam
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
                </Card>

                <Card className="p-4 space-y-4 border-border bg-card">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    Link do Perfil
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        Link do seu perfil:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/profile/${profile.id}`}
                          readOnly
                          className="bg-input border-border text-foreground text-xs sm:text-sm"
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

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
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
                </Card>
              </TabsContent>

              <TabsContent value="admin" className="space-y-3">
                {isAdmin && (
                  <Card className="p-4 space-y-4 border-border bg-card">
                    <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                      Painel de Administração
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetUserId" className="text-sm">ID do Usuário</Label>
                        <Input
                          id="targetUserId"
                          value={targetUserId}
                          onChange={(e) => setTargetUserId(e.target.value)}
                          placeholder="UUID do usuário"
                          className="bg-input border-border text-foreground font-mono text-xs sm:text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          onClick={handleToggleVerification}
                          disabled={loading || !targetUserId}
                          variant="outline"
                          className="w-full text-sm"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Verificação
                        </Button>

                        <Button
                          onClick={handleToggleBlockAccount}
                          disabled={loading || !targetUserId}
                          variant="destructive"
                          className="w-full text-sm"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Bloquear/Desbloquear
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        <strong>Nota:</strong> Essas ações afetam a conta imediatamente.
                      </p>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
