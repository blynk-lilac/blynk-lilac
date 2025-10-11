import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, User, Plus, Video, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import blynkLogo from "@/assets/blynk-logo.jpg";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const navItems = [
    { path: "/feed", label: "Feed", icon: Home },
    { path: "/friends", label: "Amigos", icon: Users },
    { path: "/create", label: "Criar", icon: Plus },
    { path: "/videos", label: "Vídeos", icon: Video },
    { path: "/messages", label: "Mensagens", icon: MessageSquare },
  ];

  return (
    <>
      {/* Header com logo e menu */}
      <div className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="flex h-14 items-center justify-between">
            <Link to="/feed" className="flex items-center">
              <img 
                src={blynkLogo} 
                alt="Blynk" 
                className="h-10 w-auto object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
            </Link>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="space-y-4 mt-8">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/profile");
                    }}
                  >
                    <User className="mr-2 h-5 w-5" />
                    Meu Perfil
                  </Button>
                  
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/admin");
                      }}
                    >
                      <Shield className="mr-2 h-5 w-5" />
                      Painel Admin
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      navigate("/");
                    }}
                  >
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
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