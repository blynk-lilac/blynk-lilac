import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Camera, 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Settings,
  UserPlus,
  UserCheck,
  Bell,
  BellOff,
  Briefcase,
  Star,
  Users,
  ArrowLeft,
  Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge from "@/components/VerificationBadge";
import PostMenu from "@/components/PostMenu";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  verified?: boolean;
  badge_type?: string | null;
  banner_url?: string;
}

interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string | null;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Video {
  id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

export default function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isFollowingCurrentUser, setIsFollowingCurrentUser] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"followers" | "following" | "friends">("followers");
  const [modalUsers, setModalUsers] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);
    const profileId = userId || user.id;
    setIsOwnProfile(profileId === user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileData) {
      setProfile(profileData);
      loadStats(profileId);
      loadPosts(profileId);
      loadVideos(profileId);
      loadFriends(profileId);
      
      if (profileId !== user.id) {
        checkFollowing(user.id, profileId);
        checkFriendStatus(user.id, profileId);
      }
    }
  };

  const loadStats = async (profileId: string) => {
    const { count: followersCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId);

    const { count: followingCount } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId);

    const { count: friendsCount } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`);

    setFollowersCount(followersCount || 0);
    setFollowingCount(followingCount || 0);
    setFriendsCount(friendsCount || 0);
  };

  const checkFollowing = async (currentUserId: string, profileId: string) => {
    const { data } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", currentUserId)
      .eq("following_id", profileId)
      .maybeSingle();

    setIsFollowing(!!data);

    const { data: followingMe } = await supabase
      .from("followers")
      .select("*")
      .eq("follower_id", profileId)
      .eq("following_id", currentUserId)
      .maybeSingle();

    setIsFollowingCurrentUser(!!followingMe);
  };

  const checkFriendStatus = async (currentUserId: string, profileId: string) => {
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`and(user_id_1.eq.${currentUserId},user_id_2.eq.${profileId}),and(user_id_1.eq.${profileId},user_id_2.eq.${currentUserId})`)
      .maybeSingle();

    setIsFriend(!!data);
  };

  const loadFriends = async (profileId: string) => {
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id_1.eq.${profileId},user_id_2.eq.${profileId}`);

    if (data) {
      const friendIds = data.map(f =>
        f.user_id_1 === profileId ? f.user_id_2 : f.user_id_1
      );
      
      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, verified, badge_type")
          .in("id", friendIds);
        setFriends(profiles || []);
      }
    }
  };

  const loadPosts = async (profileId: string) => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (username, avatar_url, verified, badge_type),
        likes:post_likes(count),
        comments:comments(count)
      `)
      .eq("user_id", profileId)
      .is("expires_at", null)
      .order("created_at", { ascending: false });

    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const postsWithLikes = await Promise.all(
        data.map(async (post) => {
          const { data: userLike } = await supabase
            .from("post_likes")
            .select("*")
            .eq("post_id", post.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...post,
            likes_count: post.likes[0]?.count || 0,
            comments_count: post.comments[0]?.count || 0,
            user_liked: !!userLike,
          };
        })
      );

      setPosts(postsWithLikes);
    }
  };

  const loadVideos = async (profileId: string) => {
    const { data } = await supabase
      .from("verification_videos")
      .select(`
        *,
        likes:verification_video_likes(count),
        comments:verification_video_comments(count)
      `)
      .eq("user_id", profileId)
      .order("created_at", { ascending: false });

    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const videosWithLikes = await Promise.all(
        data.map(async (video) => {
          const { data: userLike } = await supabase
            .from("verification_video_likes")
            .select("*")
            .eq("video_id", video.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...video,
            likes_count: video.likes[0]?.count || 0,
            comments_count: video.comments[0]?.count || 0,
            user_liked: !!userLike,
          };
        })
      );

      setVideos(videosWithLikes);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;

    if (isFollowing) {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowersCount(prev => prev - 1);
    } else {
      await supabase.from("followers").insert({
        follower_id: currentUserId,
        following_id: profile.id,
      });
      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
    }
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.user_liked) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId);

      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, user_liked: false, likes_count: p.likes_count - 1 }
          : p
      ));
    } else {
      await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: currentUserId,
      });

      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, user_liked: true, likes_count: p.likes_count + 1 }
          : p
      ));
    }
  };

  const handleOpenModal = async (type: "followers" | "following" | "friends") => {
    setModalType(type);
    setModalOpen(true);

    if (type === "followers") {
      const { data } = await supabase
        .from("followers")
        .select("profiles!followers_follower_id_fkey(*)")
        .eq("following_id", profile?.id);
      setModalUsers(data?.map(d => d.profiles) || []);
    } else if (type === "following") {
      const { data } = await supabase
        .from("followers")
        .select("profiles!followers_following_id_fkey(*)")
        .eq("follower_id", profile?.id);
      setModalUsers(data?.map(d => d.profiles) || []);
    } else {
      const { data } = await supabase
        .from("friendships")
        .select("*")
        .or(`user_id_1.eq.${profile?.id},user_id_2.eq.${profile?.id}`);

      if (data) {
        const friendIds = data.map(f =>
          f.user_id_1 === profile?.id ? f.user_id_2 : f.user_id_1
        );
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", friendIds);
        setModalUsers(profiles || []);
      }
    }
  };

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <Navbar />

        {/* Header com Back e Search */}
        <div className="sticky top-14 z-40 bg-background border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">{profile.username}</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Banner e Avatar */}
          <div className="relative">
            <div className="h-48 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 overflow-hidden">
              {profile.banner_url ? (
                <img
                  src={profile.banner_url}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10" />
              )}
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-end justify-between -mt-16">
                <Avatar className="h-32 w-32 border-4 border-background ring-2 ring-border">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-secondary text-white">
                    {profile.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {isOwnProfile && (
                  <Button
                    onClick={() => navigate("/edit-profile")}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Editar perfil
                  </Button>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{profile.full_name || profile.username}</h2>
                  {profile.verified && (
                    <VerificationBadge badgeType={profile.badge_type} className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <button
                    onClick={() => handleOpenModal("followers")}
                    className="hover:underline font-semibold"
                  >
                    <span className="text-foreground">{followersCount}</span> seguidores
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleOpenModal("following")}
                    className="hover:underline font-semibold"
                  >
                    <span className="text-foreground">{followingCount}</span> a seguir
                  </button>
                </div>

                {profile.bio && (
                  <p className="mt-3 text-sm">{profile.bio}</p>
                )}

                {!isOwnProfile && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleFollow}
                      className="flex-1 rounded-lg"
                      variant={isFollowing ? "outline" : "default"}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          A seguir
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Subscrever
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-lg">
                      {isFollowing ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs do Facebook */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger
                value="posts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Publicações
              </TabsTrigger>
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Sobre
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Fotos
              </TabsTrigger>
              <TabsTrigger
                value="reels"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Reels
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-0">
              {/* Detalhes section */}
              <Card className="m-4 p-4 border">
                <h3 className="font-bold text-lg mb-3">Detalhes</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Briefcase className="h-5 w-5" />
                    <span>Página • Criador de conteúdos digitais</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-muted-foreground" />
                    <button className="text-primary hover:underline font-semibold">
                      100% recomendam (1339 críticas)
                    </button>
                  </div>
                </div>
              </Card>

              {/* Posts */}
              <div className="px-4 pb-4">
                <h3 className="font-bold text-xl mb-4">Publicações</h3>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id} className="border overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={profile.avatar_url} />
                              <AvatarFallback>
                                {profile.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1">
                                <Link
                                  to={`/profile/${profile.id}`}
                                  className="font-semibold text-sm hover:underline"
                                >
                                  {profile.username}
                                </Link>
                                {profile.verified && (
                                  <VerificationBadge
                                    badgeType={profile.badge_type}
                                    className="w-4 h-4"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span>
                                  {formatDistanceToNow(new Date(post.created_at), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                                <span>•</span>
                                <span>🌍</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </div>

                        <p className="text-sm mb-3 whitespace-pre-wrap">{post.content}</p>

                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post"
                            className="w-full rounded-lg"
                          />
                        )}
                        {post.video_url && (
                          <video
                            src={post.video_url}
                            controls
                            className="w-full rounded-lg"
                          />
                        )}
                        {post.audio_url && (
                          <audio src={post.audio_url} controls className="w-full" />
                        )}
                      </div>

                      <div className="px-4 py-2 border-t flex items-center justify-between text-sm text-muted-foreground">
                        <span>{post.likes_count} gostos</span>
                        <span>{post.comments_count} comentários</span>
                      </div>

                      <div className="border-t px-4 py-2 flex items-center justify-around">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          className={`flex-1 gap-2 ${post.user_liked ? "text-primary" : ""}`}
                        >
                          <Heart
                            className={`h-5 w-5 ${post.user_liked ? "fill-current" : ""}`}
                          />
                          <span className="font-semibold">Gosto</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/comments/${post.id}`)}
                          className="flex-1 gap-2"
                        >
                          <MessageCircle className="h-5 w-5" />
                          <span className="font-semibold">Comentar</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 gap-2">
                          <Share2 className="h-5 w-5" />
                          <span className="font-semibold">Partilhar</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="about" className="mt-0 space-y-4">
              {/* Bio */}
              {profile.bio && (
                <Card className="m-4 p-4 border">
                  <h3 className="font-bold text-lg mb-3">Sobre</h3>
                  <p className="text-sm">{profile.bio}</p>
                </Card>
              )}

              {/* Amigos */}
              <Card className="m-4 p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Amigos</h3>
                  <button
                    onClick={() => handleOpenModal("friends")}
                    className="text-primary hover:underline text-sm font-semibold"
                  >
                    Ver tudo
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {friendsCount} amigos
                </p>
                {friends.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {friends.slice(0, 6).map((friend) => (
                      <Link
                        key={friend.id}
                        to={`/profile/${friend.id}`}
                        className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={friend.avatar_url} />
                          <AvatarFallback className="text-lg">
                            {friend.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-center w-full">
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-sm font-semibold truncate">
                              {friend.full_name || friend.username}
                            </p>
                            {friend.verified && (
                              <VerificationBadge
                                badgeType={friend.badge_type}
                                className="w-3 h-3 flex-shrink-0"
                              />
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum amigo ainda
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="mt-0">
              <div className="grid grid-cols-3 gap-1 p-1">
                {posts
                  .filter(post => post.image_url)
                  .map((post) => (
                    <div key={post.id} className="aspect-square overflow-hidden bg-muted">
                      <img 
                        src={post.image_url} 
                        alt="Foto"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => navigate(`/comments/${post.id}`)}
                      />
                    </div>
                  ))
                }
                {posts.filter(post => post.image_url).length === 0 && (
                  <div className="col-span-3 text-center py-8">
                    <p className="text-muted-foreground">Nenhuma foto ainda</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reels" className="mt-0">
              {videos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 p-1">
                  {videos.map((video) => (
                    <div 
                      key={video.id} 
                      className="aspect-[9/16] overflow-hidden bg-black relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => navigate("/videos")}
                    >
                      <video 
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                      <div className="absolute bottom-2 left-2 right-2">
                        {video.caption && (
                          <p className="text-white text-xs line-clamp-2 drop-shadow-lg">
                            {video.caption}
                          </p>
                        )}
                      </div>
                      <div className="absolute top-2 left-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded">
                          <Heart className="h-3 w-3" />
                          <span>{video.likes_count}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white text-xs bg-black/50 px-2 py-1 rounded">
                          <MessageCircle className="h-3 w-3" />
                          <span>{video.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum vídeo ainda</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal de seguidores/seguindo/amigos */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {modalType === "followers" && "Seguidores"}
              {modalType === "following" && "A seguir"}
              {modalType === "friends" && "Amigos"}
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {modalUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/profile/${user.id}`}
                        className="font-semibold hover:underline"
                        onClick={() => setModalOpen(false)}
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
                    <p className="text-sm text-muted-foreground">{user.full_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
