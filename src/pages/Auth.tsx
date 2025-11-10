import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
            <div className="space-y-6">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">B</span>
                </div>
              </div>

              <div className="text-center mb-6">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2"
                >
                  <span>←</span>
                </button>
                <h2 className="text-xl font-semibold">Recuperar Senha</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Digite seu email para receber o link de recuperação
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-14 rounded-xl bg-muted/50 border-border text-base"
                  placeholder="Email"
                />

                <Button
                  type="submit"
                  className="w-full h-14 rounded-xl text-base font-semibold"
                  disabled={resetLoading}
                  style={{ backgroundColor: '#1877F2' }}
                >
                  {resetLoading ? "Enviando..." : "Enviar Link"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-primary/20">
                  <span className="text-5xl font-bold text-primary">B</span>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex justify-center mb-6">
                <button className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
                  Português (Portugal) <span className="text-xs">▼</span>
                </button>
              </div>

              {/* Login/Signup Form */}
              <form onSubmit={handleAuth} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 rounded-xl bg-muted/50 border-border text-base"
                  placeholder="Número de telemóvel ou e-mail"
                />

                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 rounded-xl bg-muted/50 border-border text-base"
                  placeholder="Palavra-passe"
                />

                <Button
                  type="submit"
                  className="w-full h-14 rounded-xl text-base font-semibold"
                  disabled={loading}
                  style={{ backgroundColor: '#1877F2' }}
                >
                  {loading ? "Processando..." : isLogin ? "Iniciar sessão" : "Cadastrar"}
                </Button>
              </form>

              {/* Forgot Password */}
              {isLogin && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Esqueceste-te da palavra-passe?
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="my-8" />

              {/* Create Account / Login Toggle */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLogin(!isLogin)}
                  className="h-12 px-8 rounded-xl text-base font-semibold border-2"
                  style={{ borderColor: '#1877F2', color: '#1877F2' }}
                >
                  {isLogin ? "Criar conta nova" : "Já tenho conta"}
                </Button>
              </div>

              {/* Footer */}
              <div className="text-center mt-12">
                <span className="text-2xl font-bold text-muted-foreground">Blynk</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}