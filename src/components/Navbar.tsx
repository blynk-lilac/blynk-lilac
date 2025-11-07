import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Plus, Video, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import blynkLogo from "@/assets/blynk-logo.jpg";
import SideMenu from "./SideMenu";

export default function Navbar() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/feed", label: "Feed", icon: Home },
    { path: "/friends", label: "Amigos", icon: Users },
    { path: "/create", label: "Criar", icon: Plus },
    { path: "/videos", label: "Vídeos", icon: Video },
    { path: "/messages", label: "Mensagens", icon: MessageSquare },
  ];

  return (
    <>
      {/* Header com logo, pesquisa e menu - Estilo Facebook */}
      <div className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SideMenu />
              
              <Link to="/feed" className="flex items-center flex-shrink-0">
                <img 
                  src={blynkLogo} 
                  alt="Blynk" 
                  className="h-10 w-auto object-contain"
                  style={{ mixBlendMode: 'multiply' }}
                />
              </Link>
            </div>
            
            {/* Search Bar - Facebook Style */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-muted/50 border-0 focus-visible:ring-1 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Footer fixo na parte inferior */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm pb-safe">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-around">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 min-w-[60px]">
                <item.icon 
                  className={`h-6 w-6 ${isActive(item.path) ? "text-foreground" : "text-muted-foreground"}`}
                  strokeWidth={isActive(item.path) ? 2.5 : 1.5}
                />
                <span className={`text-[10px] ${isActive(item.path) ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}