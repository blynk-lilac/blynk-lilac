import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Shield, Calendar, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge from "@/components/VerificationBadge";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  verified?: boolean;
  is_public?: boolean;
  badge_type?: string | null;
  banner_url?: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count?: number;
  comments_count?: number;
}

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const { isOnline } = useOnlineStatus(userId || undefined);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [friends, setFriends] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [modalType, setModalType] = useState<"friends" | "followers" | "following">("friends");
  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const profileId = userId || user.id;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileData) {
      setProfile(profileData);
      loadStats(profileData.id);
      loadFriends(profileData.id);
      loadPosts(profileData.id);
      checkBlockedStatus(profileData.id);
      
      if (profileId !== user.id) {
        checkFollowing(user.id, profileId);
        checkFriendStatus(user.id, profileId);
      }
    }
  };

  const loadStats = async (userId: string) => {
    const { count: followersCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    const { count: followingCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowers(followersCount || 0);
    setFollowing(followingCount || 0);
  };

  const loadFriends = async (userId: string) => {
    const { count } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    setFriends(count || 0);
  };

  const loadPosts = async (userId: string) => {
    const { data: postsData, count } = await supabase
      .from("posts")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (postsData) {
      const postsWithCounts = await Promise.all(
        postsData.map(async (post) => {
          const { count: likesCount } = await supabase
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          const { count: commentsCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          return {
            ...post,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
          };
        })
      );

      setPosts(postsWithCounts);
    }
    setPostsCount(count || 0);
  };

  const checkFollowing = async (followerId: string, followingId: string) => {
    const { data } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const checkFriendStatus = async (userId: string, otherUserId: string) => {
    const { data: friendship } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_id_1.eq.${userId},user_id_2.eq.${otherUserId}),and(user_id_1.eq.${otherUserId},user_id_2.eq.${userId})`)
      .maybeSingle();

    setIsFriend(!!friendship);

    if (!friendship) {
      const { data: request } = await supabase
        .from("friend_requests")
        .select("*")
        .eq("sender_id", userId)
        .eq("receiver_id", otherUserId)
        .eq("status", "pending")
        .maybeSingle();

      setHasSentRequest(!!request);
    }
  };

  const checkBlockedStatus = async (userId: string) => {
    const { data } = await supabase
      .from("blocked_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setIsBlocked(!!data);
  };

  const handleFollow = async () => {
    if (!profile || !currentUserId) return;

    try {
      if (isFollowing) {
        await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profile.id);
        
        toast.success("Deixou de seguir");
        setIsFollowing(false);
        setFollowers(followers - 1);
      } else {
        await supabase
          .from("followers")
          .insert({
            follower_id: currentUserId,
            following_id: profile.id,
          });
        
        toast.success("Seguindo");
        setIsFollowing(true);
        setFollowers(followers + 1);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddFriend = async () => {
    if (!profile || !currentUserId) return;

    try {
      await supabase.from("friend_requests").insert({
        sender_id: currentUserId,
        receiver_id: profile.id,
        status: "pending",
      });

      toast.success("Pedido de amizade enviado");
      setHasSentRequest(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const loadFriendsList = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from("friendships")
      .select("user_id_1, user_id_2")
      .or(`user_id_1.eq.${profile.id},user_id_2.eq.${profile.id}`);

    if (data) {
      const friendIds = data.map(f => 
        f.user_id_1 === profile.id ? f.user_id_2 : f.user_id_1
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);

      setUsersList(profiles || []);
    }
  };

  const loadFollowersList = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from("followers")
      .select("follower_id")
      .eq("following_id", profile.id);

    if (data) {
      const followerIds = data.map(f => f.follower_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", followerIds);

      setUsersList(profiles || []);
    }
  };

  const loadFollowingList = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", profile.id);

    if (data) {
      const followingIds = data.map(f => f.following_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", followingIds);

      setUsersList(profiles || []);
    }
  };

  const handleOpenModal = async (type: "friends" | "followers" | "following") => {
    setModalType(type);
    setShowUsersModal(true);
    
    if (type === "friends") {
      await loadFriendsList();
    } else if (type === "followers") {
      await loadFollowersList();
    } else {
      await loadFollowingList();
    }
  };

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto max-w-xl px-4 py-8">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-16">
        <Navbar />

        <div className="container mx-auto max-w-2xl">
          {/* Banner Cover - Facebook Style */}
          <div className="relative h-64 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 overflow-hidden">
            {profile.banner_url ? (
              <img 
                src={profile.banner_url} 
                alt="Banner" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05))] bg-[length:60px_60px]" />
            )}
          </div>

          {/* Profile Info */}
          <div className="px-4 bg-background">
            {/* Avatar - Overlapping banner */}
            <div className="relative -mt-20 mb-4 flex justify-between items-start">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-background">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-3xl bg-muted">
                    {profile.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Online/Offline indicator */}
                <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-background ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                {isBlocked && (
                  <div className="absolute -bottom-2 -right-2 bg-destructive p-2 rounded-full ring-4 ring-background">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                {!userId || userId === currentUserId ? (
                  <Button 
                    onClick={() => navigate("/edit-profile")}
                    variant="outline"
                    size="default"
                    className="rounded-full font-semibold"
                  >
                    Editar perfil
                  </Button>
                ) : (
                  <>
                    {profile.is_public && (
                      <Button 
                        onClick={handleFollow}
                        variant={isFollowing ? "outline" : "default"}
                        size="default"
                        className="rounded-full font-semibold"
                      >
                        {isFollowing ? "Seguindo" : "Seguir"}
                      </Button>
                    )}
                    {!isFriend && !hasSentRequest && (
                      <Button 
                        onClick={handleAddFriend}
                        variant="outline"
                        size="default"
                        className="rounded-full font-semibold"
                      >
                        Adicionar
                      </Button>
                    )}
                    {hasSentRequest && (
                      <Badge variant="secondary" className="py-2 px-4 rounded-full">Pedido Enviado</Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Name and Username */}
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <h1 className="text-xl font-bold text-foreground">
                  {profile.full_name || profile.username}
                </h1>
                {profile.verified && (
                  <VerificationBadge badgeType={profile.badge_type} className="w-5 h-5" />
                )}
              </div>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>

            {isBlocked && (
              <Badge variant="destructive" className="mb-3">
                <Shield className="w-3 h-3 mr-1" />
                Conta Bloqueada
              </Badge>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-foreground mb-3 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Join Date */}
            <div className="flex items-center gap-4 text-muted-foreground text-sm mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Entrou em {new Date(profile.id).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Following/Followers Stats */}
            <div className="flex gap-5 mb-4">
              <button 
                onClick={() => handleOpenModal("following")}
                className="hover:underline transition-all"
              >
                <span className="font-bold text-foreground">{following}</span>
                <span className="text-muted-foreground ml-1">Seguindo</span>
              </button>
              <button 
                onClick={() => handleOpenModal("followers")}
                className="hover:underline transition-all"
              >
                <span className="font-bold text-foreground">{followers}</span>
                <span className="text-muted-foreground ml-1">Seguidores</span>
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-border">
              <div className="flex">
                <button className="flex-1 py-4 text-center font-semibold text-foreground border-b-2 border-primary">
                  Posts
                </button>
              </div>
            </div>
          </div>

          {/* Posts Section */}
          <div>
            {posts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <p className="text-muted-foreground">Nenhuma publicação ainda</p>
              </div>
            ) : (
              posts.map((post) => (
                <div 
                  key={post.id} 
                  className="border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/comments/${post.id}`)}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-sm bg-muted">
                        {profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-bold text-foreground text-sm">
                          {profile.full_name || profile.username}
                        </span>
                        {profile.verified && (
                          <VerificationBadge badgeType={profile.badge_type} className="w-4 h-4" />
                        )}
                        <span className="text-muted-foreground text-sm">
                          @{profile.username}
                        </span>
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>

                      <p className="text-foreground leading-relaxed whitespace-pre-wrap mb-3">
                        {post.content}
                      </p>

                      <div className="flex items-center gap-8 text-muted-foreground">
                        <button className="flex items-center gap-2 hover:text-red-500 transition-colors group">
                          <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-sm">{post.likes_count || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                          <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-sm">{post.comments_count || 0}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal de usuários */}
        <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {modalType === "friends" && "Amigos"}
                {modalType === "followers" && "Seguidores"}
                {modalType === "following" && "Seguindo"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {usersList.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                usersList.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                    onClick={() => {
                      setShowUsersModal(false);
                      navigate(`/profile/${user.id}`);
                    }}
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-border hover:ring-primary transition-all">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-semibold text-sm">{user.username}</p>
                        {user.verified && (
                          <VerificationBadge badgeType={user.badge_type} className="w-4 h-4" />
                        )}
                      </div>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground">{user.full_name}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUsersModal(false);
                        navigate(`/profile/${user.id}`);
                      }}
                    >
                      Ver perfil
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
