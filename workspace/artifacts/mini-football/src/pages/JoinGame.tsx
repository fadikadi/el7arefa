import { useRoute, Link, useLocation } from "wouter";
import { useGetGame, useJoinGame, getGetGameQueryKey, lookupPlayer } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, CheckCircle2, Lock, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { addLocalRegistration, getLocalPlayer, setLocalPlayer, LocalPlayer } from "@/lib/storage";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

type Step = "phone" | "confirm" | "success";

export default function JoinGame() {
  const [, params] = useRoute("/games/:gameId/join");
  const gameId = params?.gameId || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Check if we already know who this player is
  const savedPlayer = getLocalPlayer();

  const [step, setStep] = useState<Step>(savedPlayer ? "confirm" : "phone");
  const [player, setPlayer] = useState<LocalPlayer | null>(savedPlayer);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [attendance, setAttendance] = useState<"confirmed" | "tentative">("confirmed");

  const { data: gameData, isLoading, error } = useGetGame(gameId, {
    query: { enabled: !!gameId }
  });
  const joinMutation = useJoinGame();

  const handlePhoneLookup = async () => {
    const normalised = phoneInput.trim().replace(/\s+/g, "");
    if (!normalised) {
      setPhoneError("Please enter your WhatsApp number.");
      return;
    }
    setPhoneError("");
    setLookingUp(true);
    try {
      const found = await lookupPlayer({ phone: normalised });
      const p: LocalPlayer = { id: found.id, name: found.name, phone: found.phone };
      setLocalPlayer(p);
      setPlayer(p);
      setStep("confirm");
    } catch {
      setPhoneError("This number isn't on the player roster. Ask the admin to add you.");
    } finally {
      setLookingUp(false);
    }
  };

  const handleJoin = () => {
    if (!player) return;
    joinMutation.mutate(
      {
        gameId,
        data: {
          name: player.name,
          playerPhone: player.phone,
          attendance,
        },
      },
      {
        onSuccess: (res) => {
          addLocalRegistration(gameId, res.token);
          queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
          setStep("success");
        },
        onError: (err: { response?: { data?: { message?: string; registrationToken?: string } } }) => {
          const msg = err?.response?.data?.message ?? "";
          const existingToken = err?.response?.data?.registrationToken;
          if (existingToken) {
            // Already registered — save token and redirect
            addLocalRegistration(gameId, existingToken);
            setLocation(`/games/${gameId}`);
          } else {
            setPhoneError(msg || "Something went wrong. Please try again.");
            setStep("phone");
          }
        },
      }
    );
  };

  // ── Loading state ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-md space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-md text-center">
          <h2 className="text-2xl font-bold">Game not found</h2>
          <Button variant="link" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to games
          </Button>
        </main>
      </div>
    );
  }

  const { game } = gameData;
  const isFull = game.status === "full" || game.approvedCount >= game.slots;

  if (isFull) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-md text-center">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold text-orange-500 mb-2">Game Full</h2>
              <p className="text-muted-foreground mb-6">Sorry, this game is already full.</p>
              <Button onClick={() => setLocation(`/games/${gameId}`)} variant="outline" className="w-full">
                View Game Details
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-md text-center">
          <Card className="border-primary bg-primary/5">
            <CardContent className="pt-8 pb-8 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">You're in!</h2>
              <p className="text-muted-foreground mb-2">
                Confirmed for <strong>{game.title}</strong>.
              </p>
              <p className="text-muted-foreground mb-8">See you on the pitch, {player?.name}!</p>
              <div className="space-y-3 w-full">
                <Button onClick={() => setLocation(`/games/${gameId}`)} className="w-full h-12 font-bold">
                  View Game Details
                </Button>
                <Button onClick={() => setLocation("/")} variant="outline" className="w-full h-12">
                  Browse More Games
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-md space-y-6">
        <Link href={`/games/${gameId}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Game
        </Link>

        {/* ── Step 1: Phone lookup ─────────────────────────────────── */}
        {step === "phone" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Join Game</CardTitle>
              <CardDescription className="text-base">{game.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-base font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Your WhatsApp Number
                </label>
                <p className="text-sm text-muted-foreground">
                  Enter the number the admin registered you with. Your name will be confirmed automatically.
                </p>
                <Input
                  type="tel"
                  placeholder="07712345678"
                  className="h-12 text-lg"
                  value={phoneInput}
                  onChange={(e) => { setPhoneInput(e.target.value); setPhoneError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
                />
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
              </div>

              <Button
                className="w-full h-12 font-bold text-base"
                onClick={handlePhoneLookup}
                disabled={lookingUp || !phoneInput.trim()}
              >
                {lookingUp ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up...</>
                ) : (
                  "Find My Account"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Confirm with locked name ─────────────────────── */}
        {step === "confirm" && player && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Confirm Your Spot</CardTitle>
              <CardDescription className="text-base">{game.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border bg-muted/40 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{player.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {player.phone}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() => { setPlayer(null); setStep("phone"); setPhoneInput(""); }}
                >
                  Not you?
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-base font-semibold">How sure are you?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendance("confirmed")}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                      attendance === "confirmed"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="font-bold text-base">I'll be there</span>
                    <span className="text-xs text-muted-foreground">Count me in</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendance("tentative")}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                      attendance === "tentative"
                        ? "border-amber-500 bg-amber-50"
                        : "border-border bg-card hover:border-amber-300"
                    }`}
                  >
                    <span className="font-bold text-base">Maybe</span>
                    <span className="text-xs text-muted-foreground">Not 100% sure yet</span>
                  </button>
                </div>
              </div>

              {joinMutation.isError && (
                <p className="text-sm text-destructive">
                  {(joinMutation.error as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Something went wrong. Please try again."}
                </p>
              )}

              <Button
                className="w-full h-14 text-lg font-bold shadow-lg"
                onClick={handleJoin}
                disabled={joinMutation.isPending}
              >
                {joinMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Joining...</>
                ) : (
                  "Confirm My Spot"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
