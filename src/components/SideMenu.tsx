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
  Shield,
  BadgeCheck,
  ChevronRight
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

    const adminEmails = ["isaacmuaco582@gmail.com", "isaacmilagre9@gmail.com"];
    setIsAdmin(adminEmails.includes(user.email || ""));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado com sucesso");
    navigate("/auth");
  };

  const menuSections = [
    {
      title: "Suas atalhos",
      items: [
        { icon: User, label: "Meu Perfil", path: "/profile", bgColor: "bg-blue-100 dark:bg-blue-900/20" },
        { icon: Users, label: "Amigos", path: "/friends", bgColor: "bg-cyan-100 dark:bg-cyan-900/20" },
        { icon: MessageCircle, label: "Mensagens", path: "/messages", bgColor: "bg-pink-100 dark:bg-pink-900/20" },
        { icon: Video, label: "Vídeos", path: "/videos", bgColor: "bg-purple-100 dark:bg-purple-900/20" },
        { icon: BadgeCheck, label: "Verificação", path: "/verification", bgColor: "bg-green-100 dark:bg-green-900/20" },
      ]
    },
    {
      title: "Comunidade",
      items: [
        { icon: Users2, label: "Grupos", path: "#", bgColor: "bg-blue-100 dark:bg-blue-900/20" },
        { icon: Radio, label: "Vídeos em direto", path: "#", bgColor: "bg-red-100 dark:bg-red-900/20" },
        { icon: Store, label: "Marketplace", path: "#", bgColor: "bg-green-100 dark:bg-green-900/20" },
        { icon: Flag, label: "Páginas", path: "#", bgColor: "bg-orange-100 dark:bg-orange-900/20" },
      ]
    },
    {
      title: "Pessoal",
      items: [
        { icon: Bookmark, label: "Guardados", path: "#", bgColor: "bg-purple-100 dark:bg-purple-900/20" },
        { icon: Clock, label: "Memórias", path: "#", bgColor: "bg-blue-100 dark:bg-blue-900/20" },
        { icon: Gift, label: "Aniversários", path: "#", bgColor: "bg-pink-100 dark:bg-pink-900/20" },
        { icon: Calendar, label: "Eventos", path: "#", bgColor: "bg-red-100 dark:bg-red-900/20" },
      ]
    }
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 bg-background">
        <ScrollArea className="h-full">
          <div className="p-4">
            {/* Header com título */}
            <div className="mb-6 pt-4">
              <h1 className="text-2xl font-bold text-foreground">Menu</h1>
            </div>

            {/* Profile Card - Estilo Facebook */}
            <Link 
              to="/profile" 
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors mb-6 group"
            >
              <Avatar className="h-14 w-14 ring-2 ring-border">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base truncate text-foreground group-hover:text-primary transition-colors">
                  {profile?.full_name || profile?.username}
                </p>
                <p className="text-sm text-muted-foreground">Ver perfil</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>

            <Separator className="my-4" />

            {/* Menu Sections */}
            {menuSections.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                  {section.title}
                </h2>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-full ${item.bgColor} flex items-center justify-center`}>
                        <item.icon className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <Separator className="my-4" />

            {/* Configurações e Sair */}
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
                Configurações e suporte
              </h2>
              
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    Painel Admin
                  </span>
                </Link>
              )}
              
              <Link
                to="/edit-profile"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Definições e privacidade
                </span>
              </Link>
              
              <Link
                to="/help"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Ajuda e suporte
                </span>
              </Link>
              
              <Link
                to="/terms"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Termos e políticas
                </span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-red-600 transition-colors">
                  Terminar sessão
                </span>
              </button>
            </div>

            <div className="py-6 px-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Privacidade · Termos · Publicidade · Opções de anúncios · Cookies · Mais © Blynk 2024
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
