import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Users, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Group {
  id: string;
  name: string;
  avatar_url?: string;
  member_count?: number;
  unread_count?: number;
}

interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCurrentUser();
    loadGroups();
    loadFriends();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar grupos do usuário
    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!groupMembers) return;

    const groupIds = groupMembers.map(gm => gm.group_id);

    // Buscar dados dos grupos
    const { data: groupData } = await supabase
      .from("group_chats")
      .select("id, name, avatar_url")
      .in("id", groupIds);

    if (!groupData) return;

    // Contar membros de cada grupo
    const groupsWithCounts = await Promise.all(
      groupData.map(async (group) => {
        const { count } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        return {
          ...group,
          member_count: count || 0,
        };
      })
    );

    setGroups(groupsWithCounts);
  };

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Buscar amigos
    const { data: friendships } = await supabase
      .from("friendships")
      .select("user_id_1, user_id_2")
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (!friendships) return;

    const friendIds = friendships.map(f =>
      f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
    );

    // Buscar seguidores
    const { data: followers } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", user.id);

    const followerIds = followers?.map(f => f.follower_id) || [];
    const allUserIds = [...new Set([...friendIds, ...followerIds])];

    if (allUserIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", allUserIds);

    setFriends(profiles || []);
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.size === 0) {
      toast.error("Adicione um nome e membros ao grupo");
      return;
    }

    try {
      // Criar o grupo
      const { data: groupData, error: groupError } = await supabase
        .from("group_chats")
        .insert({
          name: groupName,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Adicionar criador como admin
      const { error: creatorError } = await supabase.from("group_members").insert({
        group_id: groupData.id,
        user_id: currentUserId,
        is_admin: true,
      });

      if (creatorError) throw creatorError;

      // Adicionar membros selecionados
      if (selectedMembers.size > 0) {
        const memberInserts = Array.from(selectedMembers).map(memberId => ({
          group_id: groupData.id,
          user_id: memberId,
          is_admin: false,
        }));

        const { error: membersError } = await supabase.from("group_members").insert(memberInserts);
        if (membersError) throw membersError;
      }

      toast.success("Grupo criado com sucesso!");
      setCreateGroupOpen(false);
      setGroupName("");
      setSelectedMembers(new Set());
      loadGroups();
    } catch (error: any) {
      console.error("Erro ao criar grupo:", error);
      toast.error(error.message || "Erro ao criar grupo");
    }
  };

  const toggleMember = (memberId: string) => {
    const newSet = new Set(selectedMembers);
    if (newSet.has(memberId)) {
      newSet.delete(memberId);
    } else {
      newSet.add(memberId);
    }
    setSelectedMembers(newSet);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto max-w-4xl px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Grupos</h1>
            <Button
              onClick={() => setCreateGroupOpen(true)}
              className="rounded-full w-12 h-12 p-0 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-2">
            <Button variant="ghost" className="text-primary border-b-2 border-primary font-semibold">
              Os teus grupos
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar grupos"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-none h-12 rounded-full"
            />
          </div>

          {/* Create Group Button */}
          <Card 
            className="p-4 mb-4 cursor-pointer hover:bg-muted/50 transition-colors border-border"
            onClick={() => setCreateGroupOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-7 w-7 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Criar um grupo</p>
                <p className="text-sm text-muted-foreground">Criar grupo novo</p>
              </div>
            </div>
          </Card>

          {/* Groups List */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground mb-3">Mais visitados</h2>
            
            {filteredGroups.length === 0 ? (
              <Card className="p-8 text-center bg-card border-border">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">Nenhum grupo encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Crie seu primeiro grupo para começar a conversar com amigos
                </p>
              </Card>
            ) : (
              filteredGroups.map((group) => (
                <Card
                  key={group.id}
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-border"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 ring-2 ring-border">
                      <AvatarImage src={group.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                        {group.name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{group.name}</p>
                        {group.unread_count && group.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground">
                            {group.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Create Group Dialog */}
        <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Criar Grupo</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Nome do Grupo
                </label>
                <Input
                  placeholder="Digite o nome do grupo"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Adicionar Membros
                </label>
                <ScrollArea className="h-64 rounded-lg border border-border bg-background">
                  <div className="p-2 space-y-1">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        onClick={() => toggleMember(friend.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedMembers.has(friend.id)
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {friend.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {friend.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{friend.username}
                          </p>
                        </div>
                        {selectedMembers.has(friend.id) && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Plus className="h-3 w-3 text-white rotate-45" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreateGroupOpen(false)}
                  className="flex-1 border-border"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={createGroup}
                  disabled={!groupName.trim() || selectedMembers.size === 0}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Criar Grupo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
