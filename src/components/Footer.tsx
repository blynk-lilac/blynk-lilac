import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-sm mb-3 text-foreground">Sobre</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Termos e Políticas
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3 text-foreground">Comunidade</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/friends" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Amigos
                </Link>
              </li>
              <li>
                <Link to="/messages" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Mensagens
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3 text-foreground">Conteúdo</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/videos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Vídeos
                </Link>
              </li>
              <li>
                <Link to="/create" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Criar Post
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3 text-foreground">Conta</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Meu Perfil
                </Link>
              </li>
              <li>
                <Link to="/edit-profile" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Editar Perfil
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Blynk. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
