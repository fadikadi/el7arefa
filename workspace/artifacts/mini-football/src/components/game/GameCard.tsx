import { Link } from "wouter";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { GameSummary } from "@workspace/api-client-react";
import { StatusBadge } from "./StatusBadge";

interface GameCardProps {
  game: GameSummary;
  href?: string;
}

export function GameCard({ game, href }: GameCardProps) {
  const formattedDate = format(parseISO(game.date), "EEEE, MMM d");
  const isFull = game.status === "full" || game.approvedCount >= game.slots;
  
  const content = (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md active:scale-[0.98] group cursor-pointer border-border/50 bg-card">
      <CardContent className="p-0">
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg leading-tight text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                {game.title}
              </h3>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{formattedDate}</span>
                <span className="opacity-50">•</span>
                <Clock className="w-4 h-4 shrink-0" />
                <span>{game.startTime} - {game.endTime}</span>
              </div>
            </div>
            <StatusBadge status={game.status} className="shrink-0" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground truncate pr-4">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{game.location}</span>
            </div>
            
            <div className="flex items-center gap-1.5 font-medium shrink-0">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className={isFull ? "text-orange-500" : "text-primary"}>
                {game.approvedCount}/{game.slots}
              </span>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-muted">
          <div 
            className={`h-full transition-all ${isFull ? 'bg-orange-500' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (game.approvedCount / game.slots) * 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
