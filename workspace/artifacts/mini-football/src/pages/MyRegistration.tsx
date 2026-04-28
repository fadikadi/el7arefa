import { useLookupRegistration } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { getLocalRegistrations } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/game/StatusBadge";
import { AttendanceBadge } from "@/components/game/AttendanceBadge";
import { Link } from "wouter";
import { PushNotificationsCard } from "@/components/PushNotificationsCard";

export default function MyRegistration() {
  const registrations = getLocalRegistrations();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
            My Status
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Track your game requests and upcoming matches.
          </p>
        </div>

        {registrations.length === 0 ? (
          <div className="py-16 px-4 text-center bg-card border rounded-2xl">
            <h3 className="text-xl font-bold mb-2">No games yet</h3>
            <p className="text-muted-foreground mb-6">You haven't joined any games on this device.</p>
            <Link href="/">
              <span className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6 py-2">
                Browse Upcoming Games
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <PushNotificationsCard />
            {registrations.map(reg => (
              <RegistrationItem key={reg.gameId} token={reg.token} gameId={reg.gameId} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function RegistrationItem({ token, gameId }: { token: string; gameId: string }) {
  const { data, isLoading, error } = useLookupRegistration(
    { token },
    { query: { enabled: !!token } }
  );

  if (isLoading) {
    return <Card className="h-[120px] animate-pulse bg-muted" />;
  }

  if (error || !data) {
    return null; // Might have been deleted or invalid token
  }

  const { game, registration } = data;
  const formattedDate = format(parseISO(game.date), "MMM d");

  return (
    <Link href={`/games/${game.id}`}>
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.98] group cursor-pointer border-border/50">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Status Strip */}
            <div className={`w-2 shrink-0 ${
              registration.status === 'approved' ? 'bg-primary' : 
              registration.status === 'rejected' ? 'bg-destructive' : 
              'bg-orange-500'
            }`} />
            
            <div className="p-4 sm:p-5 flex-1 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={registration.status} />
                  {registration.status !== "withdrawn" && (
                    <AttendanceBadge attendance={registration.attendance} />
                  )}
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {format(parseISO(registration.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
                <h3 className="font-bold text-lg leading-tight text-card-foreground group-hover:text-primary transition-colors">
                  {game.title}
                </h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 shrink-0" />{formattedDate}, {game.startTime}</span>
                  <span className="flex items-center gap-1.5 truncate"><MapPin className="w-4 h-4 shrink-0" />{game.location}</span>
                </div>
              </div>
              
              <div className="flex items-center text-primary font-medium text-sm self-end sm:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                View Details <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
