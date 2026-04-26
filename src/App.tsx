import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import PlayGame from "./pages/PlayGame";
import PlayTestGame from "./pages/PlayTestGame";
import Test from "./pages/Test";
import BobTurtleAI from "./pages/BobTurtleAI";
import NotFound from "./pages/NotFound";
import { SirWafflingtonChat } from "./components/SirWafflingtonChat";

const queryClient = new QueryClient();

const ConciergeGate = () => {
  const { pathname } = useLocation();
  // Hide Sir Wafflington while a game is being played to avoid covering controls.
  const inGame =
    pathname.startsWith("/play/") || pathname.startsWith("/play-test/");
  if (inGame) return null;
  return <SirWafflingtonChat />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/play/:gameId" element={<PlayGame />} />
          <Route path="/test" element={<Test />} />
          <Route path="/play-test/:gameId" element={<PlayTestGame />} />
          <Route path="/education/bob-turtle-ai" element={<BobTurtleAI />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ConciergeGate />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
