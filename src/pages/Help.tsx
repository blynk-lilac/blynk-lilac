import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Help() {
  const navigate = useNavigate();
  const whatsappNumber = "+244947541761";
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\+/g, '')}`;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <Navbar />

        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Card className="p-8 bg-card border-border">
            <h1 className="text-3xl font-bold text-foreground mb-6">
              Central de Ajuda
            </h1>

            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Perguntas Frequentes
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Como posso verificar minha conta?
                    </h3>
                    <p className="text-muted-foreground">
                      Acesse o menu de configurações e solicite a verificação. 
                      Nossa equipe irá analisar seu pedido e responder em breve.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Como denunciar conteúdo inadequado?
                    </h3>
                    <p className="text-muted-foreground">
                      Clique nos três pontos (...) em qualquer publicação e selecione "Denunciar". 
                      Escolha o motivo e envie. Nossa equipe irá revisar.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Por que não consigo criar outra conta?
                    </h3>
                    <p className="text-muted-foreground">
                      Por questões de segurança, cada dispositivo pode ter apenas uma conta registrada. 
                      Se precisar de ajuda, entre em contato conosco.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Como alterar minha senha?
                    </h3>
                    <p className="text-muted-foreground">
                      Vá para Configurações {'>'} Segurança e escolha "Alterar Senha". 
                      Insira sua nova senha e confirme.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Como tornar meu perfil privado?
                    </h3>
                    <p className="text-muted-foreground">
                      Acesse Configurações {'>'} Privacidade e ative "Perfil Privado". 
                      Apenas seguidores aprovados poderão ver suas publicações.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Como excluir minha conta?
                    </h3>
                    <p className="text-muted-foreground">
                      Entre em contato conosco pelo WhatsApp para solicitar a exclusão da conta. 
                      Este processo é irreversível.
                    </p>
                  </div>
                </div>
              </section>

              <section className="pt-6 border-t border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Precisa de mais ajuda?
                </h2>
                <p className="text-muted-foreground mb-4">
                  Nossa equipe de suporte está disponível para ajudá-lo com qualquer dúvida ou problema.
                </p>
                
                <Button
                  onClick={() => window.open(whatsappUrl, '_blank')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  Falar no WhatsApp
                </Button>
                
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {whatsappNumber}
                </p>
              </section>

              <section className="pt-6 border-t border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Recursos Úteis
                </h2>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/terms')}
                  >
                    Termos e Políticas
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/profile')}
                  >
                    Meu Perfil
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate('/edit-profile')}
                  >
                    Configurações
                  </Button>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
