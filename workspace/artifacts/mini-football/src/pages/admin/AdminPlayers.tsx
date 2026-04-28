import { useState } from "react";
import {
  useListPlayers,
  useCreatePlayer,
  useUpdatePlayer,
  useDeletePlayer,
  getListPlayersQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Pencil, Trash2, Check, X, Loader2, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface EditState {
  id: string;
  name: string;
  phone: string;
  notes: string;
}

export default function AdminPlayers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: players, isLoading } = useListPlayers();
  const createMutation = useCreatePlayer();
  const updateMutation = useUpdatePlayer();
  const deleteMutation = useDeletePlayer();

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editState, setEditState] = useState<EditState | null>(null);
  const [search, setSearch] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListPlayersQueryKey() });

  const handleCreate = () => {
    if (!newName.trim() || !newPhone.trim()) return;
    createMutation.mutate(
      { data: { name: newName.trim(), phone: newPhone.trim(), notes: newNotes.trim() || undefined } },
      {
        onSuccess: () => {
          setNewName("");
          setNewPhone("");
          setNewNotes("");
          invalidate();
          toast({ title: "Player added to roster" });
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
          toast({
            title: "Failed to add player",
            description: err?.response?.data?.message ?? "Unknown error",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editState) return;
    updateMutation.mutate(
      { playerId: editState.id, data: { name: editState.name, phone: editState.phone, notes: editState.notes || undefined } },
      {
        onSuccess: () => {
          setEditState(null);
          invalidate();
          toast({ title: "Player updated" });
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
          toast({
            title: "Failed to update player",
            description: err?.response?.data?.message ?? "Unknown error",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove ${name} from the player roster?`)) return;
    deleteMutation.mutate(
      { playerId: id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Player removed" });
        },
      }
    );
  };

  const filtered = (players ?? []).filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-8 max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Player Roster
          </h1>
          <p className="text-muted-foreground mt-1">
            Verified players can join any game by entering their WhatsApp number. Their name is always set by you.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Add Player
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  placeholder="John Smith"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">WhatsApp Number *</label>
                <Input
                  type="tel"
                  placeholder="07712345678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
              <Input
                placeholder="e.g. Regular goalkeeper"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || !newPhone.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" /> Add to Roster</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-xl flex items-center gap-2">
              Roster
              {players && (
                <Badge variant="secondary">{players.length} players</Badge>
              )}
            </h2>
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !filtered.length ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl text-sm">
              {search ? "No players match your search." : "No players yet. Add your first player above."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((player) =>
                editState?.id === player.id ? (
                  <Card key={player.id} className="border-primary">
                    <CardContent className="p-3 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Input
                          value={editState.name}
                          onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                          placeholder="Name"
                        />
                        <Input
                          value={editState.phone}
                          onChange={(e) => setEditState({ ...editState, phone: e.target.value })}
                          placeholder="WhatsApp number"
                        />
                      </div>
                      <Input
                        value={editState.notes}
                        onChange={(e) => setEditState({ ...editState, notes: e.target.value })}
                        placeholder="Notes (optional)"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save</>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditState(null)}>
                          <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card key={player.id} className="group">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{player.name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{player.phone}</span>
                        </div>
                        {player.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{player.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() =>
                            setEditState({
                              id: player.id,
                              name: player.name,
                              phone: player.phone,
                              notes: player.notes ?? "",
                            })
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(player.id, player.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
