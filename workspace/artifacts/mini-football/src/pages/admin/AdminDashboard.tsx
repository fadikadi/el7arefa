import { useGetDashboardStats, useListGames } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle2, MapPin, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/game/StatusBadge";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: games, isLoading: gamesLoading } = useListGames({ status: "upcoming" });

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your upcoming games and pending requests.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Games"
            value={stats?.totalGames}
            icon={Calendar}
            loading={statsLoading}
          />
          <StatCard
            title="Upcoming"
            value={stats?.upcomingGames}
            icon={Calendar}
            loading={statsLoading}
          />
          <StatCard
            title="Pending Approvals"
            value={stats?.pendingApprovals}
            icon={Users}
            loading={statsLoading}
            highlight={stats?.pendingApprovals ? stats.pendingApprovals > 0 : false}
          />
          <StatCard
            title="Players Approved"
            value={stats?.approvedPlayersThisWeek}
            icon={CheckCircle2}
            loading={statsLoading}
            subtitle="This week"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Upcoming Games List */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Upcoming Games</h2>
              <Link href="/admin/games/new" className="text-sm text-primary font-medium hover:underline">
                Create New
              </Link>
            </div>

            {gamesLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : !games?.length ? (
              <div className="text-center py-8 bg-card border rounded-xl border-dashed">
                <p className="text-muted-foreground">No upcoming games scheduled.</p>
                <Link href="/admin/games/new" className="text-primary font-medium mt-2 inline-block">Create one now</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {games.map(game => (
                  <Link key={game.id} href={`/admin/games/${game.id}`}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={game.status} />
                            <span className="text-sm font-medium text-muted-foreground">
                              {format(parseISO(game.date), "MMM d")}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{game.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{game.startTime}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{game.location}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium border-t sm:border-t-0 pt-3 sm:pt-0">
                          <div className="flex flex-col items-center">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Approved</span>
                            <span className="text-lg">{game.approvedCount}/{game.slots}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider mb-0.5">Pending</span>
                            <span className={`text-lg ${game.pendingCount > 0 ? 'text-orange-500' : ''}`}>{game.pendingCount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon, loading, highlight = false, subtitle }: any) {
  return (
    <Card className={highlight ? "border-orange-500 bg-orange-500/5" : ""}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <h3 className={`text-sm font-medium ${highlight ? "text-orange-600" : "text-muted-foreground"}`}>{title}</h3>
          <Icon className={`w-4 h-4 ${highlight ? "text-orange-500" : "text-muted-foreground"}`} />
        </div>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold">{value ?? 0}</span>
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
