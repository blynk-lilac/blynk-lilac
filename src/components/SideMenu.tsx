import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  User, 
  Users, 
  MessageCircle, 
  Video, 
  Heart,
  Calendar,
  Gift,
  Bookmark,
  Clock,
  Store,
  Flag,
  Users2,
  Radio,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Shield
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Profile {
  username: string;
  full_name: string;
  avatar_url: string;
}

export default function SideMenu() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadProfile();
    checkAdmin();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const adminEmails = ["isaacmuaco2@gmail.com", "isaacmuaco582@gmail.com"];
    setIsAdmin(adminEmails.includes(user.email || ""));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado com sucesso");
    navigate("/auth");
  };

  const menuItems = [
    { icon: User, label: "Meu Perfil", path: "/profile" },
    { icon: Users, label: "Amigos", path: "/friends" },
    { icon: MessageCircle, label: "Mensagens", path: "/messages" },
    { icon: Video, label: "Vídeos", path: "/videos" },
  ];

  const secondaryItems = [
    { icon: Users2, label: "Grupos", path: "#" },
    { icon: Radio, label: "Vídeos em direto", path: "#" },
    { icon: Store, label: "Marketplace", path: "#" },
    { icon: Flag, label: "Páginas", path: "#" },
    { icon: Bookmark, label: "Guardados", path: "#" },
    { icon: Clock, label: "Memórias", path: "#" },
    { icon: Gift, label: "Aniversários", path: "#" },
    { icon: Calendar, label: "Eventos", path: "#" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-muted">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <ScrollArea className="h-full">
          <div className="p-4">
            {/* Profile Section */}
            <Link to="/profile" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-foreground">
                  {profile?.full_name || profile?.username}
                </p>
                <p className="text-xs text-muted-foreground">Ver perfil</p>
              </div>
            </Link>

            <Separator className="my-4" />

            {/* Main Menu Items */}
            <div className="space-y-1 mb-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Secondary Menu Items */}
            <div className="space-y-1 mb-4">
              {secondaryItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Settings & Help */}
            <div className="space-y-1">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">Painel Admin</span>
                </Link>
              )}
              <Link
                to="/edit-profile"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Settings className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Configurações</span>
              </Link>
              <Link
                to="/help"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Dúvidas e Ajuda</span>
              </Link>
              <Link
                to="/terms"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Termos e Políticas</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-foreground"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
