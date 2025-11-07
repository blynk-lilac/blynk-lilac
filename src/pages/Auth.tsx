import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/AuthLayout";

// Função para gerar fingerprint do dispositivo
const getDeviceFingerprint = () => {
  const nav = navigator;
  const screen = window.screen;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  let fingerprint = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
  ].join('|');

  // Adicionar hash do canvas
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device', 2, 2);
    fingerprint += '|' + canvas.toDataURL();
  }

  // Criar hash simples
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'device_' + Math.abs(hash).toString(36);
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setDeviceFingerprint(getDeviceFingerprint());
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email inválido");
      return;
    }

    // Validação de senha forte
    if (!isLogin && password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!isLogin) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumber) {
        toast.error("A senha deve conter letras maiúsculas, minúsculas e números");
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Registrar dispositivo
        if (data.user && deviceFingerprint) {
          await supabase
            .from('device_registrations')
            .upsert({
              device_fingerprint: deviceFingerprint,
              user_id: data.user.id,
              last_login: new Date().toISOString()
            }, {
              onConflict: 'device_fingerprint'
            });
        }
        
        toast.success("Login realizado com sucesso!");
      } else {
        // Verificar se o dispositivo já tem uma conta
        const { data: existingDevice } = await supabase
          .from('device_registrations')
          .select('user_id')
          .eq('device_fingerprint', deviceFingerprint)
          .maybeSingle();

        if (existingDevice) {
          toast.error("Este dispositivo já tem uma conta registrada. Entre com sua conta existente.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/signup`,
            data: {
              device_fingerprint: deviceFingerprint
            }
          },
        });

        if (error) throw error;
        
        // Registrar dispositivo
        if (data.user && deviceFingerprint) {
          await supabase
            .from('device_registrations')
            .insert({
              device_fingerprint: deviceFingerprint,
              user_id: data.user.id,
            });
        }
        
        toast.success("Cadastro realizado! Redirecionando...");
        navigate("/signup");
      }
    } catch (error: any) {
      if (error.message.includes("rate limit")) {
        toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        toast.error(error.message || "Erro na autenticação");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      toast.error("Email inválido");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email de recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-glow/10 rounded-full blur-3xl float"></div>
        </div>

        <div className="relative z-10 w-full max-w-md p-4">
          {showForgotPassword ? (
            <Card className="glass-effect shadow-2xl scale-in">
              <div className="p-8">
                <div className="text-center mb-8 fade-in">
                  <div className="inline-block mb-4">
                    <div className="text-6xl font-bold gradient-text">Blynk</div>
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-primary-glow to-accent rounded-full mt-2"></div>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">Recuperar Senha</h2>
                  <p className="text-muted-foreground">
                    Digite seu email para receber o link de recuperação
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-6 slide-up">
                  <div>
                    <Label htmlFor="resetEmail" className="text-foreground font-medium">Email</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="mt-2 bg-input/50 backdrop-blur border-border/50 text-foreground h-12 rounded-xl focus:ring-2 focus:ring-primary transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-primary via-primary-glow to-accent text-primary-foreground hover:opacity-90 transition-all rounded-xl font-semibold shadow-lg hover:shadow-xl pulse-glow"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Enviando..." : "Enviar Link de Recuperação"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    ← Voltar para o login
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="glass-effect shadow-2xl scale-in">
              <div className="p-8">
                <div className="text-center mb-8 fade-in">
                  <div className="inline-block mb-4">
                    <div className="text-6xl font-bold gradient-text float">Blynk</div>
                    <div className="h-1 w-full bg-gradient-to-r from-primary via-primary-glow to-accent rounded-full mt-2"></div>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {isLogin ? "Bem-vindo de volta!" : "Junte-se ao Blynk"}
                  </h2>
                  <p className="text-muted-foreground">
                    {isLogin ? "Entre na sua conta" : "Crie sua conta e conecte-se"}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-6 slide-up">
                  <div>
                    <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-2 bg-input/50 backdrop-blur border-border/50 text-foreground h-12 rounded-xl focus:ring-2 focus:ring-primary transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-foreground font-medium">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-2 bg-input/50 backdrop-blur border-border/50 text-foreground h-12 rounded-xl focus:ring-2 focus:ring-primary transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  {isLogin && (
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:text-primary-glow transition-colors font-medium"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-primary via-primary-glow to-accent text-primary-foreground hover:opacity-90 transition-all rounded-xl font-semibold shadow-lg hover:shadow-xl pulse-glow"
                    disabled={loading}
                  >
                    {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}