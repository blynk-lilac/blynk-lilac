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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          {showForgotPassword ? (
            <Card className="p-8 border">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-4">Blynk</div>
                <h2 className="text-xl font-semibold mb-2">Recuperar Senha</h2>
                <p className="text-sm text-muted-foreground">
                  Digite seu email para receber o link de recuperação
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="seu@email.com"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Enviando..." : "Enviar Link"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Voltar
                </button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 border">
              <div className="text-center mb-8">
                <div className="text-4xl font-bold mb-4">Blynk</div>
                <h2 className="text-xl font-semibold mb-2">
                  {isLogin ? "Entrar" : "Cadastrar"}
                </h2>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="••••••••"
                  />
                </div>

                {isLogin && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}