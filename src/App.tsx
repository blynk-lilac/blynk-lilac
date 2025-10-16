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
import Comments from "./pages/Comments";
import CommentsVideo from "./pages/CommentsVideo";
import EditProfile from "./pages/EditProfile";
import AdminPanel from "./pages/AdminPanel";
import Terms from "./pages/Terms";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
          <Route path="/friends" element={<Friends />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/chat/:userId" element={<Chat />} />
          <Route path="/comments/:postId" element={<Comments />} />
          <Route path="/comments-video/:videoId" element={<CommentsVideo />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/help" element={<Help />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
