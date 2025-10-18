import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import VerificationBadge from "@/components/VerificationBadge";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
}

interface StoriesBarProps {
  onCreateStory: () => void;
}

export default function StoriesBar({ onCreateStory }: StoriesBarProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadStories();

    const channel = supabase
      .channel("stories-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
        },
        () => {
          loadStories();
        }
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

  const loadStories = async () => {
    // @ts-ignore - tipos serão atualizados automaticamente
    const { data, error } = await supabase
      .from("stories")
      .select(`
        *,
        profiles (
          username,
          avatar_url,
          verified,
          badge_type
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading stories:", error);
      return;
    }

    setStories(data || []);
  };

  const handleViewStory = async (story: Story) => {
    setSelectedStory(story);
    setViewerOpen(true);

    // Registrar visualização
    if (story.user_id !== currentUserId) {
      // @ts-ignore - tipos serão atualizados automaticamente
      await supabase.from("story_views").insert({
        story_id: story.id,
        user_id: currentUserId,
      });
    }
  };

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = [];
    }
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const hasOwnStory = currentUserId && groupedStories[currentUserId]?.length > 0;

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Criar novo story */}
          <div
            onClick={onCreateStory}
            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-2 border-dashed border-primary/50">
                <Plus className="h-8 w-8 text-primary" />
              </div>
            </div>
            <span className="text-xs font-medium text-foreground">Criar</span>
          </div>

          {/* Seu story se existir */}
          {hasOwnStory && (
            <div
              onClick={() => handleViewStory(groupedStories[currentUserId][0])}
              className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="p-1 rounded-full bg-gradient-to-tr from-primary via-accent to-secondary">
                <div className="bg-card rounded-full p-1">
                  <Avatar className="h-16 w-16 ring-2 ring-card">
                    <AvatarImage src={groupedStories[currentUserId][0].profiles.avatar_url} />
                    <AvatarFallback className="bg-muted text-foreground">Você</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className="text-xs font-medium text-foreground max-w-[80px] truncate">Seu story</span>
            </div>
          )}

          {/* Stories de outros usuários */}
          {Object.entries(groupedStories)
            .filter(([userId]) => userId !== currentUserId)
            .map(([userId, userStories]) => {
              const firstStory = userStories[0];
              return (
                <div
                  key={userId}
                  onClick={() => handleViewStory(firstStory)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="p-1 rounded-full bg-gradient-to-tr from-primary via-accent to-secondary">
                    <div className="bg-card rounded-full p-1">
                      <Avatar className="h-16 w-16 ring-2 ring-card">
                        <AvatarImage src={firstStory.profiles.avatar_url} />
                        <AvatarFallback className="bg-muted text-foreground">
                          {firstStory.profiles.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                    {firstStory.profiles.username}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Story Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-md h-[90vh] p-0 bg-black border-0">
          {selectedStory && (
            <div className="relative h-full">
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-white">
                  <AvatarImage src={selectedStory.profiles.avatar_url} />
                  <AvatarFallback className="bg-primary text-white">
                    {selectedStory.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-semibold">
                    {selectedStory.profiles.username}
                  </span>
                  {selectedStory.profiles.verified && (
                    <VerificationBadge badgeType={selectedStory.profiles.badge_type} className="w-4 h-4" />
                  )}
                </div>
              </div>

              {selectedStory.media_type === "image" ? (
                <img
                  src={selectedStory.media_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                />
              ) : (
                <video
                  src={selectedStory.media_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
