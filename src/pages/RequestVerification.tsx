import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, Crown, Award } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import verificationRocket from "@/assets/verification-rocket.png";

export default function RequestVerification() {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRequest, setHasRequest] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkExistingRequest();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const checkExistingRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    setHasRequest(!!data);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Por favor, descreva o motivo da solicitação");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        reason: reason.trim(),
        status: "pending",
      });

      if (error) throw error;

      toast.success("Solicitação enviada! Aguarde a análise da equipe.");
      setHasRequest(true);
      setReason("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar solicitação");
    } finally {
      setLoading(false);
    }
  };

  if (profile?.verified) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container max-w-2xl mx-auto px-4 py-8">
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="h-20 w-20 text-primary" />
                </div>
                <CardTitle className="text-2xl">Conta Verificada!</CardTitle>
                <CardDescription>
                  Sua conta já possui verificação ativa
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <img 
              src={verificationRocket} 
              alt="Verificação" 
              className="w-64 h-64 mx-auto mb-6 object-contain"
            />
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Obter Verificação
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Destaque-se na plataforma com o selo de verificação oficial
            </p>
          </div>

          {/* Badge Options */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-primary/20 hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-blue-500" />
                  <CardTitle className="text-lg">Badge Azul</CardTitle>
                </div>
                <CardDescription>
                  Verificação padrão para contas autênticas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-amber-500/20 hover:border-amber-500 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-6 w-6 text-amber-500" />
                  <CardTitle className="text-lg">Badge Dourado</CardTitle>
                </div>
                <CardDescription>
                  Verificação premium para criadores e empresas
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-purple-500/20 hover:border-purple-500 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-6 w-6 text-purple-500" />
                  <CardTitle className="text-lg">Badge Roxo</CardTitle>
                </div>
                <CardDescription>
                  Verificação especial para influenciadores
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Request Form */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Solicitar Verificação
              </CardTitle>
              <CardDescription>
                {hasRequest 
                  ? "Você já possui uma solicitação pendente" 
                  : "Preencha os dados abaixo para solicitar sua verificação"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!hasRequest ? (
                <>
                  <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                    <h3 className="font-semibold text-lg">Opções de Pagamento</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Pagamento: 500 Kz</p>
                          <p className="text-sm text-muted-foreground">
                            Verificação garantida em até 48 horas após aprovação do pagamento
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Pedido de Chegados (Gratuito)</p>
                          <p className="text-sm text-muted-foreground">
                            Solicitação gratuita sujeita à análise e aprovação da equipe
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Motivo da Solicitação *
                    </label>
                    <Textarea
                      placeholder="Descreva por que você merece o selo de verificação. Inclua informações sobre sua atividade, influência ou autenticidade..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-32"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {reason.length}/500 caracteres
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading || !reason.trim()}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? "Enviando..." : "Enviar Solicitação"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Ao enviar, você concorda que as informações fornecidas são verdadeiras
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Solicitação Pendente</h3>
                  <p className="text-muted-foreground">
                    Sua solicitação está em análise. Você receberá uma notificação quando for processada.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="max-w-2xl mx-auto mt-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Benefícios da Verificação</h2>
            <div className="grid gap-4">
              {[
                "Selo de autenticidade visível em seu perfil",
                "Maior destaque nas pesquisas e recomendações",
                "Credibilidade aumentada com seu público",
                "Proteção contra perfis falsos usando seu nome",
                "Acesso prioritário a novos recursos"
              ].map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
