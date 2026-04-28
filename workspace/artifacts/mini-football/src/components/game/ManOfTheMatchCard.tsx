import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, User, Loader2, Star } from "lucide-react";

const API_BASE = "/api";

type Tally = { playerId: string; name: string; votes: number };

type MotmResponse = {
  finished: boolean;
  cancelled: boolean;
  canVote: boolean;
  tallies: Tally[];
  totalVotes: number;
  hasVoted: boolean;
  myVote: string | null;
  winner: Tally | null;
};

type Props = {
  gameId: string;
  myToken: string | null;
  myRegistrationId: string | null;
  myStatus: "pending" | "approved" | "rejected" | "withdrawn" | null;
};

export function ManOfTheMatchCard({
  gameId,
  myToken,
  myRegistrationId,
  myStatus,
}: Props) {
  const [data, setData] = useState<MotmResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = new URL(
      `${API_BASE}/games/${gameId}/motm`,
      window.location.origin,
    );
    if (myToken) url.searchParams.set("token", myToken);
    setLoading(true);
    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: MotmResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load votes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, myToken]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading votes...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.cancelled) return null;
  if (!data.finished) return null;

  const submitVote = async () => {
    if (!selected || !myToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/motm-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: myToken, votedRegistrationId: selected }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.message || "Couldn't save your vote");
        return;
      }
      setData(json);
    } catch {
      setError("Couldn't save your vote");
    } finally {
      setSubmitting(false);
    }
  };

  const ballot = data.tallies.filter((t) => t.playerId !== myRegistrationId);
  const isApproved = myStatus === "approved";
  const showBallot = data.canVote && !data.hasVoted;

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900">
          <Trophy className="w-5 h-5 text-amber-600" />
          Man of the Match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.winner && data.totalVotes > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-white border border-amber-200 p-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs uppercase tracking-wider text-amber-700 font-bold">
                Leading
              </div>
              <div className="font-bold text-lg truncate">
                {data.winner.name}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-extrabold text-amber-700">
                {data.winner.votes}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                votes
              </div>
            </div>
          </div>
        )}

        {showBallot && ballot.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              Pick your Man of the Match
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ballot.map((p) => {
                const active = selected === p.playerId;
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => setSelected(p.playerId)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all ${
                      active
                        ? "border-amber-500 bg-amber-100/70 shadow-sm"
                        : "border-border bg-white hover:border-amber-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        active
                          ? "bg-amber-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {active ? (
                        <Star className="w-4 h-4 fill-current" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="font-medium truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="button"
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={!selected || submitting}
              onClick={() => void submitVote()}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trophy className="w-4 h-4 mr-2" />
              )}
              Submit vote
            </Button>
          </div>
        )}

        {data.hasVoted && (
          <p className="text-sm text-amber-800/80 italic">
            Thanks for voting! Your pick is locked in.
          </p>
        )}

        {!data.canVote && !data.hasVoted && isApproved && ballot.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Voting will open after the game ends.
          </p>
        )}

        {!isApproved && data.totalVotes === 0 && (
          <p className="text-sm text-muted-foreground">
            No votes yet. Approved players can pick the standout performer.
          </p>
        )}

        {data.tallies.length > 0 && data.totalVotes > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              All votes ({data.totalVotes})
            </p>
            <div className="space-y-1.5">
              {data.tallies
                .filter((t) => t.votes > 0)
                .map((t) => {
                  const pct =
                    data.totalVotes > 0
                      ? Math.round((t.votes / data.totalVotes) * 100)
                      : 0;
                  return (
                    <div key={t.playerId} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{t.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {t.votes} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
