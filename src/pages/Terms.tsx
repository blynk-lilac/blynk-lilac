import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Terms() {
  const navigate = useNavigate();

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
              Termos e Políticas
            </h1>

            <div className="space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  1. Termos de Uso
                </h2>
                <p className="mb-2">
                  Ao utilizar o Blynk, você concorda com os seguintes termos:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Você deve ter pelo menos 13 anos de idade para usar este serviço</li>
                  <li>Você é responsável por manter a confidencialidade da sua conta</li>
                  <li>Você não pode usar o serviço para fins ilegais ou não autorizados</li>
                  <li>Você não pode violar nenhuma lei em sua jurisdição</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  2. Conteúdo Proibido
                </h2>
                <p className="mb-2">
                  Os seguintes tipos de conteúdo são estritamente proibidos:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Conteúdo violento, pornográfico ou inapropriado para menores</li>
                  <li>Discurso de ódio, discriminação ou assédio</li>
                  <li>Spam, fraudes ou esquemas de pirâmide</li>
                  <li>Violação de direitos autorais ou propriedade intelectual</li>
                  <li>Informações falsas ou enganosas</li>
                  <li>Conteúdo que promova atividades ilegais</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  3. Privacidade
                </h2>
                <p className="mb-2">
                  Sua privacidade é importante para nós:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Coletamos apenas informações necessárias para o funcionamento do serviço</li>
                  <li>Não vendemos suas informações pessoais a terceiros</li>
                  <li>Você pode solicitar a exclusão dos seus dados a qualquer momento</li>
                  <li>Usamos criptografia para proteger suas informações</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  4. Segurança da Conta
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Cada dispositivo pode ter apenas uma conta registrada</li>
                  <li>Senhas devem ter no mínimo 8 caracteres com letras e números</li>
                  <li>Você é responsável por todas as atividades em sua conta</li>
                  <li>Notifique-nos imediatamente sobre qualquer uso não autorizado</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  5. Verificação de Conta
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Contas verificadas recebem um selo de autenticidade</li>
                  <li>A verificação é concedida a critério da administração</li>
                  <li>Contas verificadas devem manter padrões elevados de conduta</li>
                  <li>A verificação pode ser revogada a qualquer momento</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  6. Denúncias e Moderação
                </h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Você pode denunciar conteúdo ou usuários que violem os termos</li>
                  <li>Todas as denúncias são analisadas pela equipe de moderação</li>
                  <li>Contas que violarem repetidamente os termos podem ser suspensas</li>
                  <li>Decisões de moderação são finais</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  7. Alterações nos Termos
                </h2>
                <p>
                  Reservamos o direito de modificar estes termos a qualquer momento. 
                  Alterações significativas serão notificadas aos usuários. 
                  O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
                </p>
              </section>

              <section className="pt-6 border-t border-border">
                <p className="text-sm">
                  <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
                </p>
              </section>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
