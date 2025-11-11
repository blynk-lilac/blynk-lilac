import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VoiceRecorder from "@/components/VoiceRecorder";
import VerificationBadge from "@/components/VerificationBadge";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GroupMessage {
  id: string;
  content: string;
  audio_url?: string;
  sender_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
}

interface GroupMember {
  id: string;
  username: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

interface Friend {
  id: string;
  username: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

export default function GroupChat() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadGroup();
    loadMessages();
    loadMembers();
    loadFriends();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

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

  const loadGroup = async () => {
    const { data } = await supabase
      .from("group_chats")
      .select("name")
      .eq("id", groupId)
      .single();

    if (data) setGroupName(data.name);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from("group_messages")
      .select(`
        *,
        profiles!group_messages_sender_id_fkey (username, avatar_url, verified, badge_type)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from("group_members")
      .select(`
        profiles!group_members_user_id_fkey (id, username, avatar_url, verified, badge_type)
      `)
      .eq("group_id", groupId);

    if (data) {
      setMembers(data.map(m => m.profiles).filter(Boolean));
    }
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
      .select("id, username, avatar_url, verified, badge_type")
      .in("id", friendIds);

    setFriends(profiles || []);
  };

  const sendMessage = async (audioUrl?: string) => {
    if (!newMessage.trim() && !audioUrl) return;

    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: currentUserId,
      content: audioUrl ? "🎤 Mensagem de voz" : newMessage,
      audio_url: audioUrl,
    });

    if (error) {
      toast.error("Erro ao enviar mensagem");
      return;
    }

    setNewMessage("");
  };

  const addMember = async (userId: string) => {
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
    });

    if (error) {
      toast.error("Erro ao adicionar membro");
      return;
    }

    toast.success("Membro adicionado!");
    setAddMemberOpen(false);
    loadMembers();
  };

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{groupName}</h1>
              <p className="text-xs text-muted-foreground">
                {members.length} membros
              </p>
            </div>
          </div>
          <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <UserPlus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membros</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {friends
                    .filter(f => !members.some(m => m.id === f.id))
                    .map((friend) => (
                      <Card
                        key={friend.id}
                        className="p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => addMember(friend.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>
                              {friend.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm">
                              {friend.username}
                            </span>
                            {friend.verified && (
                              <VerificationBadge
                                badgeType={friend.badge_type}
                                className="w-4 h-4"
                              />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
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
                      <AvatarImage src={message.profiles.avatar_url} />
                      <AvatarFallback>
                        {message.profiles.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="max-w-[70%]">
                    {!isMe && (
                      <div className="flex items-center gap-1 mb-1 ml-2">
                        <span className="text-xs font-semibold">
                          {message.profiles.username}
                        </span>
                        {message.profiles.verified && (
                          <VerificationBadge
                            badgeType={message.profiles.badge_type}
                            className="w-3 h-3"
                          />
                        )}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {message.audio_url ? (
                        <audio controls className="max-w-full" src={message.audio_url} />
                      ) : (
                        <p className="text-sm break-words">{message.content}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
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
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mensagem..."
              className="flex-1 rounded-full"
            />
            <Button type="submit" size="icon" className="rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
