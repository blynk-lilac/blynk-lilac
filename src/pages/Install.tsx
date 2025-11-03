import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          {isInstalled ? (
            <CheckCircle2 className="h-20 w-20 text-green-500" />
          ) : (
            <Smartphone className="h-20 w-20 text-primary" />
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isInstalled ? "App Instalado!" : "Instalar Blynk"}
          </h1>
          <p className="text-muted-foreground">
            {isInstalled
              ? "O Blynk está instalado no seu dispositivo. Aproveite a experiência completa!"
              : "Instale o Blynk no seu dispositivo para acesso rápido e experiência como app nativo."}
          </p>
        </div>

        {isInstalled ? (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Acesso offline<br />
                ✓ Notificações push<br />
                ✓ Instalação na tela inicial<br />
                ✓ Experiência nativa
              </p>
            </div>
            <Button onClick={() => navigate('/feed')} className="w-full">
              Ir para o Feed
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {isInstallable ? (
              <Button onClick={handleInstallClick} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                Instalar Agora
              </Button>
            ) : (
              <div className="bg-muted rounded-lg p-4 text-sm">
                <p className="font-semibold mb-2">Como instalar:</p>
                <div className="text-left space-y-2 text-muted-foreground">
                  <p><strong>iPhone/iPad:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Toque no botão Compartilhar</li>
                    <li>Role até "Adicionar à Tela Inicial"</li>
                    <li>Toque em "Adicionar"</li>
                  </ol>
                  
                  <p className="mt-3"><strong>Android:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Toque no menu (⋮)</li>
                    <li>Selecione "Adicionar à tela inicial"</li>
                    <li>Toque em "Adicionar"</li>
                  </ol>
                </div>
              </div>
            )}

            <Button onClick={() => navigate('/feed')} variant="outline" className="w-full">
              Continuar no navegador
            </Button>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Ao instalar, você concorda com nossos Termos de Serviço e Política de Privacidade
          </p>
        </div>
      </Card>
    </div>
  );
}