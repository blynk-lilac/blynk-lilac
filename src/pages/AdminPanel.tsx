import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Shield, Flag, Eye, TrendingUp, Loader2 } from "lucide-react";
import badgeGold from "@/assets/badge-gold.webp";
import badgePurple from "@/assets/badge-purple.png";
import badgeSilver from "@/assets/badge-silver.webp";
import { Link } from "react-router-dom";
import VerificationBadge from "@/components/VerificationBadge";

interface VerificationRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  reason: string;
  badge_type: string | null;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface BadgeOption {
  type: 'blue' | 'gold' | 'purple' | 'silver';
  name: string;
  icon: string | null;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_content_id: string;
  content_type: string;
  reason: string;
  status: string;
  created_at: string;
}

const badgeOptions: BadgeOption[] = [
  { type: 'blue', name: 'Verificado Azul', icon: null },
  { type: 'gold', name: 'Verificado Ouro', icon: badgeGold },
  { type: 'purple', name: 'Verificado Roxo', icon: badgePurple },
  { type: 'silver', name: 'Verificado Prata', icon: badgeSilver },
];

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url?: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
    badge_type: string | null;
  };
  likes: { count: number }[];
}

export default function AdminPanel() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBadges, setSelectedBadges] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchPostId, setSearchPostId] = useState("");
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Verificar se é um dos admins autorizados
      const adminEmails = ["isaacmuaco582@gmail.com", "isaacmilagre9@gmail.com"];
      const isUserAdmin = adminEmails.includes(user.email || "");
      
      if (!isUserAdmin) {
        setIsAdmin(false);
        toast.error("Você não tem permissão para acessar esta página");
      } else {
        setIsAdmin(true);
        loadRequests();
        loadReports();
        loadRecentPosts();
      }
    } catch (error) {
      console.error("Erro ao verificar admin:", error);
      setIsAdmin(false);
      toast.error("Erro ao verificar permissões");
    } finally {
      setLoading(false);
    }
  };

  const loadRecentPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (username, full_name, avatar_url, verified, badge_type),
          likes:post_likes(count)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar posts:", error);
      toast.error("Erro ao carregar posts");
    }
  };

  const handleBoostPost = async (postId: string) => {
    setBoosting(true);
    try {
      // Buscar todos os usuários
      const { data: users, error: usersError } = await supabase
        .from("profiles")
        .select("id");

      if (usersError) throw usersError;

      if (!users || users.length === 0) {
        toast.error("Nenhum usuário encontrado");
        return;
      }

      // Buscar likes existentes para não duplicar
      const { data: existingLikes } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", postId);

      const existingUserIds = new Set(existingLikes?.map(l => l.user_id) || []);

      // Filtrar apenas usuários que ainda não deram like
      const newLikes = users
        .filter(u => !existingUserIds.has(u.id))
        .map(u => ({
          post_id: postId,
          user_id: u.id,
        }));

      if (newLikes.length === 0) {
        toast.success("Todos os usuários já curtiram este post!");
        return;
      }

      // Inserir todos os likes de uma vez
      const { error: likesError } = await supabase
        .from("post_likes")
        .insert(newLikes);

      if (likesError) throw likesError;

      toast.success(`Boost aplicado! ${newLikes.length} novos likes adicionados!`);
      loadRecentPosts();
    } catch (error: any) {
      console.error("Erro ao dar boost:", error);
      toast.error(`Erro ao dar boost: ${error.message}`);
    } finally {
      setBoosting(false);
    }
  };

  const searchPostById = async () => {
    if (!searchPostId.trim()) {
      toast.error("Digite um ID de publicação");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (username, full_name, avatar_url, verified, badge_type),
          likes:post_likes(count)
        `)
        .eq("id", searchPostId)
        .single();

      if (error || !data) {
        toast.error("Publicação não encontrada");
        return;
      }

      setPosts([data, ...posts.filter(p => p.id !== data.id)]);
      setSearchPostId("");
      toast.success("Publicação encontrada!");
    } catch (error: any) {
      console.error("Erro ao buscar post:", error);
      toast.error("Erro ao buscar publicação");
    }
  };

  const loadRequests = async () => {
    try {
      const { data: requests, error } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar pedidos:", error);
        toast.error("Erro ao carregar pedidos: " + error.message);
        return;
      }

      // Buscar profiles separadamente
      if (requests && requests.length > 0) {
        const userIds = requests.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", userIds);

        if (profilesError) {
          console.error("Erro ao carregar profiles:", profilesError);
          toast.error("Erro ao carregar perfis");
          return;
        }

        // Combinar requests com profiles
        const requestsWithProfiles = requests.map(request => ({
          ...request,
          profiles: profiles?.find(p => p.id === request.user_id) || {
            username: "Usuário",
            full_name: "Usuário",
            avatar_url: ""
          }
        }));

        setRequests(requestsWithProfiles);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    }
  };

  const loadReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar denúncias");
      return;
    }

    setReports(data || []);
  };

  const handleApprove = async (requestId: string, userId: string) => {
    const badgeType = selectedBadges[requestId];
    
    if (!badgeType) {
      toast.error("Selecione um tipo de selo primeiro");
      return;
    }

    try {
      // Primeiro, atualizar o pedido de verificação
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          badge_type: badgeType
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Depois, atualizar o perfil do usuário diretamente
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          verified: true,
          badge_type: badgeType
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      toast.success("Pedido aprovado! O selo foi ativado.");
      loadRequests();
    } catch (error: any) {
      console.error("Erro ao aprovar:", error);
      toast.error("Erro ao aprovar pedido: " + error.message);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("verification_requests")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Pedido rejeitado");
      loadRequests();
    } catch (error: any) {
      toast.error("Erro ao rejeitar pedido");
    }
  };

  const renderBadge = (badgeType: string) => {
    const badge = badgeOptions.find(b => b.type === badgeType);
    if (!badge) return null;

    if (badge.icon) {
      return <img src={badge.icon} alt={badge.name} className="w-6 h-6" />;
    }

    return (
      <svg viewBox="0 0 22 22" className="w-6 h-6 text-blue-500" fill="currentColor">
        <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.27 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.47 1.39-.2 2.9.8 3.92s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.88L6.41 12.5l1.41-1.41L10.75 14.07l5.42-5.42 1.41 1.41-6.83 6.82z"/>
      </svg>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto max-w-4xl px-4 py-8 text-center">
            <p>Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto max-w-4xl px-4 py-8 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Painel Admin</h1>
          </div>

          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="requests" className="flex-1">
                Pedidos de Verificação
                {requests.length > 0 && (
                  <Badge className="ml-2 bg-accent">{requests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex-1">
                Denúncias
                {reports.length > 0 && (
                  <Badge className="ml-2 bg-destructive">{reports.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="boost" className="flex-1">
                <TrendingUp className="h-4 w-4 mr-2" />
                Boost de Posts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="space-y-4">
              {requests.length === 0 ? (
                <Card className="p-8 bg-card border-border text-center">
                  <p className="text-muted-foreground">Nenhum pedido de verificação pendente</p>
                </Card>
              ) : (
                requests.map((request) => (
                  <Card key={request.id} className="p-6 bg-card border-border shadow-[var(--shadow-elegant)]">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                          <AvatarImage src={request.profiles.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl">
                            {request.profiles.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{request.profiles.full_name}</h3>
                          <p className="text-sm text-muted-foreground">@{request.profiles.username}</p>
                          {request.reason && (
                            <p className="mt-2 text-sm bg-muted p-3 rounded-lg">{request.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Solicitado em: {new Date(request.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-semibold">Escolha o tipo de selo:</p>
                        <div className="grid grid-cols-2 gap-3">
                          {badgeOptions.map((badge) => (
                            <Button
                              key={badge.type}
                              variant={selectedBadges[request.id] === badge.type ? "default" : "outline"}
                              className="h-auto py-3 flex items-center gap-3 justify-start"
                              onClick={() => setSelectedBadges({ ...selectedBadges, [request.id]: badge.type })}
                            >
                              {renderBadge(badge.type)}
                              <span>{badge.name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          onClick={() => handleApprove(request.id, request.user_id)}
                          className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                          disabled={!selectedBadges[request.id]}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              {reports.length === 0 ? (
                <Card className="p-8 bg-card border-border text-center">
                  <p className="text-muted-foreground">Nenhuma denúncia pendente</p>
                </Card>
              ) : (
                reports.map((report) => (
                  <Card key={report.id} className="p-6 bg-card border-border">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <Flag className="h-6 w-6 text-destructive" />
                        <div className="flex-1">
                          <p className="font-semibold">Tipo: {report.content_type}</p>
                          <p className="text-sm text-muted-foreground">Motivo: {report.reason}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Denunciado em: {new Date(report.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t">
                        <Link to={`/comments/${report.reported_content_id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Conteúdo
                          </Button>
                        </Link>
                        <Button
                          onClick={async () => {
                            try {
                              await supabase
                                .from("reports")
                                .update({ status: "reviewed" })
                                .eq("id", report.id);
                              toast.success("Denúncia marcada como revisada");
                              loadReports();
                            } catch {
                              toast.error("Erro ao atualizar");
                            }
                          }}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Marcar como Revisada
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="boost" className="space-y-6">
              <Card className="p-6 bg-card border-border">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Boost de Publicações
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Adicione likes de todos os usuários do site em uma publicação específica
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="ID da publicação para buscar"
                      value={searchPostId}
                      onChange={(e) => setSearchPostId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchPostById()}
                    />
                    <Button onClick={searchPostById} variant="outline">
                      Buscar
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="space-y-4">
                {posts.length === 0 ? (
                  <Card className="p-8 bg-card border-border text-center">
                    <p className="text-muted-foreground">Nenhuma publicação encontrada</p>
                  </Card>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="p-6 bg-card border-border">
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={post.profiles.avatar_url} />
                            <AvatarFallback>
                              {post.profiles.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{post.profiles.full_name || post.profiles.username}</p>
                              {post.profiles.verified && (
                                <VerificationBadge badgeType={post.profiles.badge_type} />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">@{post.profiles.username}</p>
                          </div>
                        </div>

                        <p className="text-sm line-clamp-3">{post.content}</p>

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post"
                            className="w-full max-h-64 object-cover rounded-lg"
                          />
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{post.likes[0]?.count || 0} curtidas</span>
                          <span className="text-xs">ID: {post.id}</span>
                        </div>

                        <Button
                          onClick={() => handleBoostPost(post.id)}
                          disabled={boosting}
                          className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                        >
                          {boosting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Aplicando Boost...
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Dar Boost (Adicionar Todos os Likes)
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
