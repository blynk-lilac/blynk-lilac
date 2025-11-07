import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import VerificationBadge from "@/components/VerificationBadge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  profiles: User;
}

export default function Friends() {
  const [users, setUsers] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const { onlineUsers } = useOnlineStatus();

  useEffect(() => {
    const init = async () => {
      await loadCurrentUser();
      loadFriendRequests();
      loadFriends();
    };
    init();

    const channel = supabase
      .channel("friend-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        () => {
          loadFriendRequests();
          loadFriends();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => loadFriends()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      loadUsers(user.id);
    }
  };

  const loadUsers = async (userId?: string) => {
    const id = userId || currentUserId;
    if (!id) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", id);

    if (error) {
      toast.error("Erro ao carregar usuários");
      return;
    }

    setUsers(data || []);
  };

  const loadFriendRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Pedidos recebidos
    const { data: received } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    if (received) {
      const requestsWithProfiles = await Promise.all(
        received.map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", req.sender_id)
            .single();
          
          return { ...req, profiles: profile as User };
        })
      );
      setFriendRequests(requestsWithProfiles);
    }

    // Pedidos enviados
    const { data: sent } = await supabase
      .from("friend_requests")
      .select("receiver_id")
      .eq("sender_id", user.id)
      .eq("status", "pending");

    setSentRequests(sent?.map(r => r.receiver_id) || []);
  };

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    const friendIds = data?.map(f => 
      f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
    ) || [];
    
    setFriends(friendIds);
  };

  const sendFriendRequest = async (userId: string) => {
    const { error } = await supabase.from("friend_requests").insert({
      sender_id: currentUserId,
      receiver_id: userId,
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao enviar pedido");
      return;
    }

    toast.success("Pedido enviado!");
    loadFriendRequests();
  };

  const acceptFriendRequest = async (requestId: string, senderId: string) => {
    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Erro ao aceitar pedido");
      return;
    }

    const userIds = [currentUserId, senderId].sort();
    const { error: friendshipError } = await supabase
      .from("friendships")
      .insert({
        user_id_1: userIds[0],
        user_id_2: userIds[1],
      });

    if (friendshipError) {
      toast.error("Erro ao criar amizade");
      return;
    }

    toast.success("Pedido aceito!");
    loadFriendRequests();
    loadFriends();
  };

  const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao rejeitar pedido");
      return;
    }

    toast.success("Pedido rejeitado");
    loadFriendRequests();
  };

  const isFriend = (userId: string) => friends.includes(userId);
  const hasSentRequest = (userId: string) => sentRequests.includes(userId);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="all">Todos Usuários</TabsTrigger>
              <TabsTrigger value="requests">
                Pedidos
                {friendRequests.length > 0 && (
                  <Badge className="ml-2 bg-accent">{friendRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {users.map((user) => {
                const isOnline = onlineUsers.has(user.id);
                return (
                  <Card key={user.id} className="p-4 bg-card border-border shadow-[var(--shadow-elegant)]">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                            {user.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {user.full_name}
                          </span>
                          {user.verified && (
                            <VerificationBadge badgeType={user.badge_type} className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          @{user.username}
                        </span>
                      </div>
                      {isFriend(user.id) ? (
                        <Badge className="bg-secondary">Amigos</Badge>
                      ) : hasSentRequest(user.id) ? (
                        <Badge variant="outline">Pedido Enviado</Badge>
                      ) : (
                        <Button
                          onClick={() => sendFriendRequest(user.id)}
                          className="bg-gradient-to-r from-primary to-secondary"
                        >
                          Adicionar Amigo
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              {friendRequests.length === 0 ? (
                <Card className="p-8 bg-card border-border text-center">
                  <p className="text-muted-foreground">Nenhum pedido de amizade</p>
                </Card>
              ) : (
                friendRequests.map((request) => (
                  <Card key={request.id} className="p-4 bg-card border-border shadow-[var(--shadow-elegant)]">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={request.profiles.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                          {request.profiles.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {request.profiles.full_name}
                          </span>
                          {request.profiles.verified && (
                            <VerificationBadge badgeType={request.profiles.badge_type} className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          @{request.profiles.username}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => acceptFriendRequest(request.id, request.sender_id)}
                          className="bg-gradient-to-r from-primary to-secondary"
                        >
                          Aceitar
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => rejectFriendRequest(request.id)}
                        >
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
