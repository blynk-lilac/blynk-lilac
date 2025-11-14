import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Feed from "./pages/Feed";
import Create from "./pages/Create";
import Videos from "./pages/Videos";
import Profile from "./pages/Profile";
import Friends from "./pages/Friends";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import GroupChat from "./pages/GroupChat";
import Comments from "./pages/Comments";
import CommentsVideo from "./pages/CommentsVideo";
import EditProfile from "./pages/EditProfile";
import AdminPanel from "./pages/AdminPanel";
import ApiKeys from "./pages/ApiKeys";
import Install from "./pages/Install";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import RequestVerification from "./pages/RequestVerification";
import LiveStreaming from "./pages/LiveStreaming";
import LiveWatch from "./pages/LiveWatch";
import Groups from "./pages/Groups";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Desabilitar menu de contexto
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Desabilitar teclas de atalho para copiar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  <meta name="google-site-verification" content="Lh_HC9TKiOdO_k2KmJFTm9NikJt7gDutiDnlCn6xyWc" />
    return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Helmet>
  <meta name="google-site-verification" content="nwTcPtC3qhsHBUgiNZpJx2YIBfVMwuF-bXucrpx0Zgc" />
  <title>Lovable</title>
</Helmet>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/create" element={<Create />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/videos/:shareCode" element={<Videos />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/install" element={<Install />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/chat/:userId" element={<Chat />} />
          <Route path="/group/:groupId" element={<GroupChat />} />
          <Route path="/comments/:postId" element={<Comments />} />
          <Route path="/comments-video/:videoId" element={<CommentsVideo />} />
          <Route path="/verification" element={<RequestVerification />} />
          <Route path="/live" element={<LiveStreaming />} />
          <Route path="/live-watch/:streamId" element={<LiveWatch />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/help" element={<Help />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
