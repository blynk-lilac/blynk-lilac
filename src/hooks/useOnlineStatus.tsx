import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface OnlineUser {
  user_id: string;
  online_at: string;
}

export function useOnlineStatus(userId?: string) {
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("online-users");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: OnlineUser) => {
            users.add(presence.user_id);
          });
        });
        
        setOnlineUsers(users);
        if (userId) {
          setIsOnline(users.has(userId));
        }
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        newPresences.forEach((presence: OnlineUser) => {
          setOnlineUsers(prev => new Set(prev).add(presence.user_id));
          if (userId && presence.user_id === userId) {
            setIsOnline(true);
          }
        });
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: OnlineUser) => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(presence.user_id);
            return newSet;
          });
          if (userId && presence.user_id === userId) {
            setIsOnline(false);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isOnline, onlineUsers };
}
