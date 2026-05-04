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
import TurtleLM from "./pages/TurtleLM";
import NotFound from "./pages/NotFound";
import { SirWafflingtonChat } from "./components/SirWafflingtonChat";
import { SirWafflingtonProvider } from "./components/SirWafflingtonContext";
import { DefconGate } from "./components/DefconGate";

const queryClient = new QueryClient();

const ConciergeGate = () => {
  const { pathname } = useLocation();
  // Fade Sir Wafflington out on full-screen game / education routes, but
  // keep him mounted so chat history and draft input survive the round-trip.
  const inGame =
    pathname.startsWith("/play/") ||
    pathname.startsWith("/play-test/") ||
    pathname.startsWith("/education/");
  return <SirWafflingtonChat hidden={inGame} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SirWafflingtonProvider>
         <DefconGate>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/play/:gameId" element={<PlayGame />} />
            <Route path="/test" element={<Test />} />
            <Route path="/play-test/:gameId" element={<PlayTestGame />} />
            <Route path="/education/bob-turtle-ai" element={<BobTurtleAI />} />
            <Route path="/education/turtle-lm" element={<TurtleLM />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ConciergeGate />
         </DefconGate>
        </SirWafflingtonProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
