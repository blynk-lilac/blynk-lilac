import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserCheck, Users, X, Check, Search, ArrowLeft } from "lucide-react";
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
  sender: User;
  receiver: User;
}

export default function Friends() {
  const [users, setUsers] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const { onlineUsers } = useOnlineStatus();

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadFriendRequests();
    loadFriends();

    const requestsChannel = supabase
      .channel("friend_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests" },
        () => {
          loadFriendRequests();
        }
      )
      .subscribe();

    const friendsChannel = supabase
      .channel("friendships_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(friendsChannel);
    };
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, verified, badge_type")
      .neq("id", user.id);

    setUsers(data || []);
  };

  const loadFriendRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: requests } = await supabase
      .from("friend_requests")
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, full_name, avatar_url, verified, badge_type),
        receiver:profiles!friend_requests_receiver_id_fkey(id, username, full_name, avatar_url, verified, badge_type)
      `)
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    setFriendRequests(requests || []);

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

    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map(f =>
        f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
      );
      setFriends(friendIds);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    const { error } = await supabase.from("friend_requests").insert({
      sender_id: currentUserId,
      receiver_id: userId,
      status: "pending",
    });

    if (error) {
      toast.error("Erro ao enviar pedido");
    } else {
      toast.success("Pedido enviado!");
      setSentRequests([...sentRequests, userId]);
    }
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

    const { error: friendshipError } = await supabase
      .from("friendships")
      .insert({
        user_id_1: senderId,
        user_id_2: currentUserId,
      });

    if (friendshipError) {
      toast.error("Erro ao criar amizade");
    } else {
      toast.success("Pedido aceite!");
      loadFriendRequests();
      loadFriends();
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast.error("Erro ao rejeitar pedido");
    } else {
      toast.success("Pedido rejeitado");
      loadFriendRequests();
    }
  };

  const isFriend = (userId: string) => friends.includes(userId);
  const hasSentRequest = (userId: string) => sentRequests.includes(userId);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <Navbar />

        {/* Header */}
        <div className="sticky top-14 z-40 bg-background border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Amigos</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="suggestions" className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="grid w-full grid-cols-2 bg-muted/30">
                <TabsTrigger value="suggestions" className="rounded-full">
                  Sugestões
                </TabsTrigger>
                <TabsTrigger value="friends" className="rounded-full">
                  Os teus amigos
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="suggestions" className="px-4 pb-4 space-y-6 mt-4">
              {/* Pedidos de amizade */}
              {friendRequests.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold">
                      Pedidos de amizade ({friendRequests.length})
                    </h2>
                    <Button variant="link" className="text-primary">
                      Ver tudo
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {friendRequests.map((request) => (
                      <Card key={request.id} className="p-4 border">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={request.sender.avatar_url} />
                              <AvatarFallback className="text-xl">
                                {request.sender.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {onlineUsers.has(request.sender.id) && (
                              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-1 mb-1">
                              <Link
                                to={`/profile/${request.sender.id}`}
                                className="font-semibold hover:underline"
                              >
                                {request.sender.username}
                              </Link>
                              {request.sender.verified && (
                                <VerificationBadge
                                  badgeType={request.sender.badge_type}
                                  className="w-4 h-4"
                                />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {request.sender.full_name}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => acceptFriendRequest(request.id, request.sender.id)}
                                className="flex-1 rounded-lg bg-primary"
                              >
                                Confirmar
                              </Button>
                              <Button
                                onClick={() => rejectFriendRequest(request.id)}
                                variant="outline"
                                className="flex-1 rounded-lg"
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Pessoas que talvez conheças */}
              <div>
                <h2 className="text-lg font-bold mb-3">Pessoas que talvez conheças</h2>
                <div className="space-y-3">
                  {users
                    .filter(user => !isFriend(user.id))
                    .map((user) => {
                      const isOnline = onlineUsers.has(user.id);
                      const requestSent = hasSentRequest(user.id);

                      return (
                        <Card key={user.id} className="p-4 border">
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="h-20 w-20">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="text-xl">
                                  {user.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isOnline && (
                                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-1">
                                <Link
                                  to={`/profile/${user.id}`}
                                  className="font-semibold hover:underline"
                                >
                                  {user.username}
                                </Link>
                                {user.verified && (
                                  <VerificationBadge
                                    badgeType={user.badge_type}
                                    className="w-4 h-4"
                                  />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {user.full_name}
                              </p>
                              <div className="flex gap-2">
                                {requestSent ? (
                                  <Button
                                    disabled
                                    variant="outline"
                                    className="flex-1 rounded-lg"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Pedido enviado
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => sendFriendRequest(user.id)}
                                    className="flex-1 rounded-lg bg-primary"
                                  >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Adicionar a
                                  </Button>
                                )}
                                <Button variant="outline" className="flex-1 rounded-lg">
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="friends" className="px-4 pb-4 mt-4">
              {friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Ainda não tens amigos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users
                    .filter(user => isFriend(user.id))
                    .map((user) => {
                      const isOnline = onlineUsers.has(user.id);
                      return (
                        <Card key={user.id} className="p-4 border">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-16 w-16">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="text-lg">
                                  {user.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isOnline && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1">
                                <Link
                                  to={`/profile/${user.id}`}
                                  className="font-semibold hover:underline"
                                >
                                  {user.username}
                                </Link>
                                {user.verified && (
                                  <VerificationBadge
                                    badgeType={user.badge_type}
                                    className="w-4 h-4"
                                  />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {user.full_name}
                              </p>
                            </div>
                            <Button variant="outline" size="icon" className="rounded-full">
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}
