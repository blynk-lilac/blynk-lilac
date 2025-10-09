import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
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
          avatar_url
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
      <div className="flex gap-3 overflow-x-auto pb-4 px-4 -mx-4 scrollbar-hide">
        {/* Próprio story ou criar novo */}
        <div
          onClick={onCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
        >
          <div className="relative">
            <Avatar className="h-16 w-16 ring-2 ring-border">
              <AvatarImage src={stories.find(s => s.user_id === currentUserId)?.profiles.avatar_url} />
              <AvatarFallback className="bg-muted">Você</AvatarFallback>
            </Avatar>
            {!hasOwnStory && (
              <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                <Plus className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <span className="text-xs text-foreground max-w-[64px] truncate">
            {hasOwnStory ? "Seu story" : "Criar"}
          </span>
        </div>

        {/* Stories de outros usuários */}
        {Object.entries(groupedStories)
          .filter(([userId]) => userId !== currentUserId)
          .map(([userId, userStories]) => {
            const firstStory = userStories[0];
            return (
              <div
                key={userId}
                onClick={() => handleViewStory(firstStory)}
                className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer"
              >
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary via-secondary to-accent">
                  <div className="bg-background rounded-full p-0.5">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={firstStory.profiles.avatar_url} />
                      <AvatarFallback className="bg-muted">
                        {firstStory.profiles.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="text-xs text-foreground max-w-[64px] truncate">
                  {firstStory.profiles.username}
                </span>
              </div>
            );
          })}
      </div>

      {/* Story Viewer */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-md h-[600px] p-0 bg-black">
          {selectedStory && (
            <div className="relative h-full">
              <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
                <Avatar className="h-8 w-8 ring-2 ring-white">
                  <AvatarImage src={selectedStory.profiles.avatar_url} />
                  <AvatarFallback>
                    {selectedStory.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-semibold">
                  {selectedStory.profiles.username}
                </span>
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
