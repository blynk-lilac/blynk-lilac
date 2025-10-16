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

  return (
    <AuthLayout>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 bg-card border-border">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Blynk</h1>
            <p className="text-muted-foreground">
              {isLogin ? "Entre na sua conta" : "Crie sua conta"}
            </p>
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
                className="bg-input border-border text-foreground"
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
                className="bg-input border-border text-foreground"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
            </button>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}