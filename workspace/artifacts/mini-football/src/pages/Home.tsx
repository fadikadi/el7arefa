import { useListGames } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { GameCard } from "@/components/game/GameCard";
import { Trophy, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Home() {
  const { data: games, isLoading, error } = useListGames({ status: "upcoming" });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            Upcoming Matches
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Grab a spot before they fill up.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-destructive/10 rounded-xl border border-destructive/20">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h3 className="font-semibold text-destructive">Failed to load games</h3>
            <p className="text-sm text-destructive/80 mt-1">Please try refreshing the page.</p>
          </div>
        ) : !games || games.length === 0 ? (
          <div className="py-16 px-4 text-center bg-card border rounded-2xl">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No upcoming games</h3>
            <p className="text-muted-foreground">Check back later for new matches.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <GameCard game={game} href={`/games/${game.id}`} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
