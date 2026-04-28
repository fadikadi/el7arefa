import { useRoute, Link, useLocation } from "wouter";
import {
  useGetGame,
  useLookupRegistration,
  getLookupRegistrationQueryKey,
  getGetGameQueryKey,
  useUpdateMyAttendance,
  useWithdrawRegistration,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/game/StatusBadge";
import { AttendanceBadge } from "@/components/game/AttendanceBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Users, ArrowLeft, Shield, User, LogOut, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocalRegistrationForGame, removeLocalRegistration } from "@/lib/storage";
import { ManOfTheMatchCard } from "@/components/game/ManOfTheMatchCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function GameDetail() {
  const [, params] = useRoute("/games/:gameId");
  const gameId = params?.gameId || "";
  const [, setLocation] = useLocation();

  const { data: gameData, isLoading, error } = useGetGame(gameId, {
    query: { enabled: !!gameId }
  });

  const localReg = getLocalRegistrationForGame(gameId);
  const queryClient = useQueryClient();
  const { data: myStatus } = useLookupRegistration(
    { token: localReg?.token || "" },
    { query: { enabled: !!localReg?.token } }
  );
  const updateAttendance = useUpdateMyAttendance();
  const withdrawMutation = useWithdrawRegistration();
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const refreshAfterChange = () => {
    if (localReg?.token) {
      void queryClient.invalidateQueries({
        queryKey: getLookupRegistrationQueryKey({ token: localReg.token }),
      });
    }
    void queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
  };

  const onToggleAttendance = () => {
    if (!localReg?.token || !myStatus) return;
    const next =
      myStatus.registration.attendance === "confirmed"
        ? "tentative"
        : "confirmed";
    updateAttendance.mutate(
      { data: { token: localReg.token, attendance: next } },
      { onSuccess: refreshAfterChange },
    );
  };

  const onWithdraw = () => {
    if (!localReg?.token) return;
    withdrawMutation.mutate(
      { data: { token: localReg.token } },
      {
        onSuccess: () => {
          removeLocalRegistration(gameId);
          refreshAfterChange();
          setWithdrawOpen(false);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl text-center">
          <h2 className="text-2xl font-bold">Game not found</h2>
          <Button variant="link" onClick={() => setLocation("/")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to games
          </Button>
        </main>
      </div>
    );
  }

  const { game, approvedPlayers, teams } = gameData;
  const isFull = game.status === "full" || game.approvedCount >= game.slots;
  const hasActiveReg =
    !!myStatus && myStatus.registration.status !== "withdrawn";
  const canJoin = game.status === "open" && !hasActiveReg;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-24">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-10 max-w-3xl space-y-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Upcoming Games
        </Link>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              {game.title}
            </h1>
            <StatusBadge status={game.status} className="text-sm px-3 py-1 mt-1 shrink-0" />
          </div>

          {/* Info Card */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="flex-1 p-6 flex flex-col justify-center">
                <div className="flex items-center gap-3 text-lg font-medium mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-normal">Date & Time</div>
                    <div>{format(parseISO(game.date), "EEEE, MMMM d")}</div>
                    <div className="text-primary">{game.startTime} - {game.endTime}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="font-medium">{game.location}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="font-medium">
                    <span className={isFull ? "text-orange-500" : "text-primary"}>
                      {game.approvedCount}
                    </span>
                    <span className="text-muted-foreground"> / {game.slots} players</span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {game.notes && (
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground border border-border/50">
              <p className="font-medium text-foreground mb-1">Notes</p>
              {game.notes}
            </div>
          )}

          {/* My Status */}
          {hasActiveReg && myStatus && (
            <Card className={`border-2 ${myStatus.registration.status === 'approved' ? 'border-primary bg-primary/5' : myStatus.registration.status === 'rejected' ? 'border-destructive bg-destructive/5' : 'border-orange-500 bg-orange-500/5'}`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                  <div>
                    <h3 className="font-bold text-lg mb-1 flex items-center gap-2 flex-wrap">
                      Your Status
                      <StatusBadge status={myStatus.registration.status} />
                      <AttendanceBadge attendance={myStatus.registration.attendance} />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {myStatus.registration.status === 'approved' ? "You're in! See you on the pitch." : myStatus.registration.status === 'pending' ? "Waiting for admin approval." : "You're on the waitlist."}
                    </p>
                  </div>
                  {myStatus.registration.status === 'approved' && myStatus.registration.teamId && teams && (
                    <div className="bg-background rounded-lg border px-4 py-2 text-center shadow-sm">
                      <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Your Team</div>
                      <div className="font-bold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        {teams.teams.find(t => t.id === myStatus.registration.teamId)?.name || 'Assigned'}
                      </div>
                    </div>
                  )}
                </div>

                {game.status !== 'cancelled' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onToggleAttendance}
                      disabled={updateAttendance.isPending}
                      className="flex-1"
                    >
                      {updateAttendance.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {myStatus.registration.attendance === 'confirmed'
                        ? "Mark as Maybe"
                        : "I'll definitely be there"}
                    </Button>
                    <AlertDialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Withdraw
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Withdraw from this game?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your spot will be released so someone else can join. You can re-join later if there's still room.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Stay in</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              onWithdraw();
                            }}
                            disabled={withdrawMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {withdrawMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Yes, withdraw
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Man of the Match (only renders for finished games) */}
          <ManOfTheMatchCard
            gameId={game.id}
            myToken={localReg?.token || null}
            myRegistrationId={myStatus?.registration?.id || null}
            myStatus={myStatus?.registration?.status || null}
          />

          {/* Roster */}
          <div className="space-y-4">
            <h3 className="font-bold text-xl flex items-center gap-2">
              Approved Players <span className="bg-muted text-muted-foreground text-sm py-0.5 px-2 rounded-full">{approvedPlayers.length}</span>
            </h3>
            
            {approvedPlayers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                No players approved yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {approvedPlayers.map(player => (
                  <div key={player.id} className="flex items-center gap-3 bg-card border rounded-lg p-3 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="font-medium truncate">{player.name}</span>
                    {player.attendance === "tentative" && (
                      <AttendanceBadge attendance="tentative" className="shrink-0" />
                    )}
                    {teams && teams.teams.some(t => t.players.some(p => p.id === player.id)) && (
                      <span className="ml-auto text-xs px-2 py-1 rounded-full bg-muted font-medium shrink-0">
                        {teams.teams.find(t => t.players.some(p => p.id === player.id))?.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Sticky CTA Footer */}
      {!hasActiveReg && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-10 md:hidden">
          <Button 
            className="w-full h-12 text-lg font-bold shadow-lg" 
            disabled={!canJoin}
            onClick={() => setLocation(`/games/${game.id}/join`)}
          >
            {canJoin ? "Join Game" : isFull ? "Game Full" : "Cannot Join"}
          </Button>
        </div>
      )}
      {!hasActiveReg && (
        <div className="hidden md:block fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-10">
          <div className="container mx-auto max-w-3xl flex justify-end">
            <Button 
              className="w-48 h-12 text-lg font-bold shadow-lg" 
              disabled={!canJoin}
              onClick={() => setLocation(`/games/${game.id}/join`)}
            >
              {canJoin ? "Join Game" : isFull ? "Game Full" : "Cannot Join"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
