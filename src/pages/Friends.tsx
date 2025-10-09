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

interface User {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  verified?: boolean;
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

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadFriendRequests();
    loadFriends();

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
    if (user) setCurrentUserId(user.id);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUserId);

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
              {users.map((user) => (
                <Card key={user.id} className="p-4 bg-card border-border shadow-[var(--shadow-elegant)]">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                        {user.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {user.full_name}
                        </span>
                        {user.verified && (
                          <svg viewBox="0 0 22 22" className="w-5 h-5 text-blue-500" fill="currentColor">
                            <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.27 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.47 1.39-.2 2.9.8 3.92s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.88L6.41 12.5l1.41-1.41L10.75 14.07l5.42-5.42 1.41 1.41-6.83 6.82z"/>
                          </svg>
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
              ))}
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
                            <svg viewBox="0 0 22 22" className="w-5 h-5 text-blue-500" fill="currentColor">
                              <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.67-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.27 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.33c-.47 1.39-.2 2.9.8 3.92s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.33-2.19c1.4.46 2.91.2 3.92-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.5 4.88L6.41 12.5l1.41-1.41L10.75 14.07l5.42-5.42 1.41 1.41-6.83 6.82z"/>
                            </svg>
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
