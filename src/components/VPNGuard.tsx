import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Lock } from "lucide-react";

const ALLOWED_COUNTRIES = ["US", "IN", "CA", "FR"];

export default function VPNGuard({ children }: { children: React.ReactNode }) {
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");

  useEffect(() => {
    checkVPN();
  }, []);

  const checkVPN = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/");
      const data = await response.json();
      const userCountry = data.country_code;
      setCountry(data.country_name);

      if (ALLOWED_COUNTRIES.includes(userCountry)) {
        setIsAllowed(false);
      } else {
        setIsAllowed(false);
      }
    } catch (error) {
      console.error("Erro ao verificar VPN:", error);
      setIsAllowed(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 bg-card border-border text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Verificando localização...</p>
        </Card>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 bg-card border-border text-center max-w-md shadow-[var(--shadow-elegant)]">
          <Lock className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Acesso Restrito
          </h1>
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              O Blynk não está disponível para Angola
            </AlertDescription>
          </Alert>
          <p className="text-muted-foreground">
            Por favor, conecte-se a uma VPN privada e recarregue a página.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
