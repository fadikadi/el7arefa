import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InstallAppHint } from "@/components/InstallAppHint";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import GameDetail from "@/pages/GameDetail";
import JoinGame from "@/pages/JoinGame";
import MyRegistration from "@/pages/MyRegistration";
import InvitePage from "@/pages/InvitePage";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import CreateGame from "@/pages/admin/CreateGame";
import EditGame from "@/pages/admin/EditGame";
import AdminGameDetail from "@/pages/admin/AdminGameDetail";
import AdminPlayers from "@/pages/admin/AdminPlayers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      {/* Player Routes */}
      <Route path="/" component={Home} />
      <Route path="/games/:gameId" component={GameDetail} />
      <Route path="/games/:gameId/join" component={JoinGame} />
      <Route path="/my-registration" component={MyRegistration} />
      <Route path="/invite/:token" component={InvitePage} />

      {/* Admin Routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/games/new" component={CreateGame} />
      <Route path="/admin/games/:gameId/edit" component={EditGame} />
      <Route path="/admin/games/:gameId" component={AdminGameDetail} />
      <Route path="/admin/players" component={AdminPlayers} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
          <Router />
          <InstallAppHint />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
