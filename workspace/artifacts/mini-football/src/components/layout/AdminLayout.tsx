import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useGetAdminSession, useAdminLogout, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, LogOut, PlusCircle, Trophy, Users } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: session, isLoading } = useGetAdminSession();
  const logout = useAdminLogout();

  useEffect(() => {
    if (!isLoading && !session?.authenticated) {
      setLocation("/admin/login");
    }
  }, [session, isLoading, setLocation]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
        setLocation("/admin/login");
      }
    });
  };

  if (isLoading || !session?.authenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-[100dvh] bg-muted/30 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <Trophy className="w-5 h-5 text-primary" />
          <span>Admin</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card min-h-screen p-4">
        <div className="flex items-center gap-2 font-bold text-xl mb-8 px-2">
          <Trophy className="w-6 h-6 text-primary" />
          <span>MiniFootball</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">Admin</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/admin" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === '/admin' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/admin/players" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === '/admin/players' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}>
            <Users className="w-4 h-4" />
            Player Roster
          </Link>
          <Link href="/admin/games/new" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === '/admin/games/new' ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}>
            <PlusCircle className="w-4 h-4" />
            Create Game
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden mt-auto border-t bg-card flex items-center justify-around p-2 pb-safe sticky bottom-0 z-50">
        <Link href="/admin" className={`flex flex-col items-center p-2 rounded-md flex-1 ${location === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link href="/admin/players" className={`flex flex-col items-center p-2 rounded-md flex-1 ${location === '/admin/players' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Players</span>
        </Link>
        <Link href="/admin/games/new" className={`flex flex-col items-center p-2 rounded-md flex-1 ${location === '/admin/games/new' ? 'text-primary' : 'text-muted-foreground'}`}>
          <PlusCircle className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">New Game</span>
        </Link>
      </nav>
    </div>
  );
}
