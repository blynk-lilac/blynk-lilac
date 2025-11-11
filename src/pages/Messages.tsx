import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, Users } from "lucide-react";
import VerificationBadge from "@/components/VerificationBadge";
import VoiceRecorder from "@/components/VoiceRecorder";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  audio_url?: string;
}

interface Group {
  id: string;
  name: string;
  avatar_url?: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const { onlineUsers } = useOnlineStatus();

  useEffect(() => {
    loadCurrentUser();
    loadFriends();
    loadGroups();
  }, []);

  const loadGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: groupMembers } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (!groupMembers) return;

    const groupIds = groupMembers.map(gm => gm.group_id);

    const { data: groupData } = await supabase
      .from("group_chats")
      .select("id, name, avatar_url")
      .in("id", groupIds);

    setGroups(groupData || []);
  };

  useEffect(() => {
    if (selectedFriend) {
      loadMessages(selectedFriend.id);

      // Canal para mensagens em tempo real
      const messagesChannel = supabase
        .channel(`messages-${selectedFriend.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === selectedFriend.id || newMsg.receiver_id === selectedFriend.id) {
              setMessages(prev => [...prev, newMsg]);
              scrollToBottom();
            }
          }
        )
        .subscribe();

      // Canal para typing indicator usando presence
      typingChannelRef.current = supabase
        .channel(`typing-${currentUserId}-${selectedFriend.id}`)
        .on('presence', { event: 'sync' }, () => {
          const state = typingChannelRef.current?.presenceState();
          const typing = new Set<string>();
          Object.keys(state || {}).forEach(key => {
            const presence = state[key][0];
            if (presence.user_id !== currentUserId && presence.typing) {
              typing.add(presence.user_id);
            }
          });
          setTypingUsers(typing);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(messagesChannel);
        if (typingChannelRef.current) {
          supabase.removeChannel(typingChannelRef.current);
        }
      };
    }
  }, [selectedFriend, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

    if (!friendships) return;

    const friendIds = friendships.map(f =>
      f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, verified, badge_type")
      .in("id", friendIds);

    setFriends(profiles || []);
  };

  const loadMessages = async (friendId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });

    setMessages(data || []);

    // Marcar como lidas
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", friendId);
  };

  const handleTyping = () => {
    if (typingChannelRef.current) {
      typingChannelRef.current.track({
        user_id: currentUserId,
        typing: true
      });

      setTimeout(() => {
        typingChannelRef.current?.track({
          user_id: currentUserId,
          typing: false
        });
      }, 2000);
    }
  };

  const sendMessage = async (audioUrl?: string) => {
    if (!newMessage.trim() && !audioUrl) return;
    if (!selectedFriend) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      receiver_id: selectedFriend.id,
      content: audioUrl ? "🎤 Mensagem de voz" : newMessage,
      audio_url: audioUrl,
    });

    if (error) {
      toast.error("Erro ao enviar mensagem");
      return;
    }

    setNewMessage("");
    
    if (typingChannelRef.current) {
      typingChannelRef.current.track({
        user_id: currentUserId,
        typing: false
      });
    }
  };

  return (
    <ProtectedRoute>
      {!selectedFriend ? (
        <div className="min-h-screen bg-background pb-20">
          <Navbar />
          
          <div className="container mx-auto max-w-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Mensagens</h1>
            </div>

            <Tabs defaultValue="friends" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="friends">Amigos</TabsTrigger>
                <TabsTrigger value="groups">Grupos</TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-2">
                {friends.map((friend) => {
                  const isOnline = onlineUsers.has(friend.id);
                  return (
                    <Card
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend)}
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>
                              {friend.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background ${
                              isOnline ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-sm truncate">
                              {friend.username}
                            </p>
                            {friend.verified && (
                              <VerificationBadge
                                badgeType={friend.badge_type}
                                className="w-4 h-4"
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {friend.full_name}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="groups" className="space-y-2">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    onClick={() => navigate(`/group/${group.id}`)}
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={group.avatar_url} />
                        <AvatarFallback>
                          <Users className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {group.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Grupo
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-background z-50 flex flex-col">
          {/* Header do chat fullscreen */}
          <div className="p-4 border-b flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFriend(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedFriend.avatar_url} />
                <AvatarFallback>
                  {selectedFriend.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${onlineUsers.has(selectedFriend.id) ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <p className="font-semibold">{selectedFriend.username}</p>
                {selectedFriend.verified && (
                  <VerificationBadge badgeType={selectedFriend.badge_type} className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedFriend.full_name}
                </p>
                {typingUsers.has(selectedFriend.id) ? (
                  <p className="text-xs text-primary">está escrevendo...</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {onlineUsers.has(selectedFriend.id) ? 'Online' : 'Offline'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message) => {
                const isMe = message.sender_id === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    {!isMe && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={selectedFriend.avatar_url} />
                        <AvatarFallback>
                          {selectedFriend.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.audio_url ? (
                        <audio 
                          controls 
                          className="max-w-full"
                          src={message.audio_url}
                        >
                          Seu navegador não suporta áudio.
                        </audio>
                      ) : (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                      <p className={`text-xs mt-1 ${
                        isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input de mensagem */}
          <div className="p-4 border-t max-w-4xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <VoiceRecorder onAudioRecorded={(audioUrl) => sendMessage(audioUrl)} />
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Mensagem..."
                className="flex-1 rounded-full border-border"
              />
              <Button type="submit" size="icon" className="rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
