import { useRoute, Link, useLocation } from "wouter";
import { 
  useGetGame, 
  useListRegistrations, 
  useUpdateRegistrationStatus,
  useSplitTeams,
  useMoveTeamPlayer,
  useListGameNotifications,
  useSendGameNotification,
  useUpdateGame,
  useListInvites,
  useCreateInvite,
  useDeleteInvite,
  getGetGameQueryKey,
  getListRegistrationsQueryKey,
  getListGameNotificationsQueryKey,
  getGetTeamsQueryKey,
  getListInvitesQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Shield, MessageSquare, Check, X, Bell, Settings, Loader2, Share2, Zap, Link2, Copy, Trash2, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { StatusBadge } from "@/components/game/StatusBadge";
import { AttendanceBadge } from "@/components/game/AttendanceBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function AdminGameDetail() {
  const [, params] = useRoute("/admin/games/:gameId");
  const gameId = params?.gameId || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: gameData, isLoading: gameLoading } = useGetGame(gameId, { query: { enabled: !!gameId } });
  const { data: registrations, isLoading: regsLoading } = useListRegistrations(gameId, { query: { enabled: !!gameId } });
  const { data: notifications } = useListGameNotifications(gameId, { query: { enabled: !!gameId } });

  const updateStatusMutation = useUpdateRegistrationStatus();
  const splitTeamsMutation = useSplitTeams();
  const notifyMutation = useSendGameNotification();
  const updateGameMutation = useUpdateGame();

  const [notificationMsg, setNotificationMsg] = useState("");
  const [notificationAudience, setNotificationAudience] = useState<"all"|"approved"|"pending">("approved");
  const [newInviteName, setNewInviteName] = useState("");
  const [newInvitePhone, setNewInvitePhone] = useState("");

  const { data: invites, isLoading: invitesLoading } = useListInvites(gameId, { query: { enabled: !!gameId } });
  const createInviteMutation = useCreateInvite();
  const deleteInviteMutation = useDeleteInvite();

  if (gameLoading) {
    return (
      <AdminLayout>
        <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  if (!gameData) return null;

  const { game, teams } = gameData;

  const handleUpdateStatus = (regId: string, status: "approved" | "rejected" | "pending") => {
    updateStatusMutation.mutate({ gameId, registrationId: regId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRegistrationsQueryKey(gameId) });
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
      },
      onError: (error) => {
        toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleSplitTeams = (count: 2 | 3) => {
    splitTeamsMutation.mutate({ gameId, data: { teamCount: count } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
        queryClient.invalidateQueries({ queryKey: getGetTeamsQueryKey(gameId) });
        toast({ title: "Teams split successfully" });
      },
      onError: (error) => {
        toast({ title: "Failed to split teams", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleSendNotification = () => {
    if (!notificationMsg.trim()) return;
    notifyMutation.mutate({ gameId, data: { message: notificationMsg, audience: notificationAudience } }, {
      onSuccess: () => {
        setNotificationMsg("");
        queryClient.invalidateQueries({ queryKey: getListGameNotificationsQueryKey(gameId) });
        toast({ title: "Notification sent" });
      },
      onError: (error) => {
        toast({ title: "Failed to send notification", description: error.message, variant: "destructive" });
      }
    });
  };

  const handleCreateInvite = () => {
    if (!newInviteName.trim()) return;
    createInviteMutation.mutate({ gameId, data: { name: newInviteName.trim(), phone: newInvitePhone.trim() || undefined } }, {
      onSuccess: () => {
        setNewInviteName("");
        setNewInvitePhone("");
        queryClient.invalidateQueries({ queryKey: getListInvitesQueryKey(gameId) });
        toast({ title: "Invite link created" });
      },
      onError: () => {
        toast({ title: "Failed to create invite", variant: "destructive" });
      }
    });
  };

  const handleDeleteInvite = (inviteId: string) => {
    deleteInviteMutation.mutate({ inviteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvitesQueryKey(gameId) });
        toast({ title: "Invite deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete invite", variant: "destructive" });
      }
    });
  };

  const getInviteUrl = (token: string) => {
    const base = window.location.origin + (import.meta.env.BASE_URL?.replace(/\/$/, "") || "");
    return `${base}/invite/${token}`;
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(getInviteUrl(token));
    toast({ title: "Link copied to clipboard" });
  };

  const buildWhatsAppMessage = (msg: string) => {
    if (!game) return msg;
    const dateStr = format(parseISO(game.date), "EEE, MMM d");
    const header = `*${game.title}* — ${dateStr} at ${game.startTime}\n${game.location}\n\n`;
    return header + msg;
  };

  const openWhatsAppShare = (msg: string, phone?: string | null) => {
    const text = encodeURIComponent(buildWhatsAppMessage(msg));
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareWhatsApp = () => {
    if (!notificationMsg.trim()) return;
    openWhatsAppShare(notificationMsg);
  };

  const pendingRegs = registrations?.filter(r => r.status === 'pending') || [];
  const approvedRegs = registrations?.filter(r => r.status === 'approved') || [];
  const rejectedRegs = registrations?.filter(r => r.status === 'rejected') || [];

  const handleToggleAutoApprove = (enabled: boolean) => {
    updateGameMutation.mutate(
      { gameId: game.id, data: { autoApprove: enabled } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
          toast({
            title: enabled ? "Auto-join enabled" : "Auto-join disabled",
            description: enabled
              ? "Players will be approved automatically when they join."
              : "New players will need manual approval.",
          });
        },
        onError: () => {
          toast({ title: "Failed to update setting", variant: "destructive" });
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={game.status} />
                <span className="text-sm font-medium text-muted-foreground">{format(parseISO(game.date), "EEEE, MMM d")}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{game.title}</h1>
            </div>
          </div>
          <Button variant="outline" onClick={() => setLocation(`/admin/games/${game.id}/edit`)}>
            <Settings className="w-4 h-4 mr-2" /> Edit Game
          </Button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Approved</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{game.approvedCount}</p>
                <p className="text-sm text-muted-foreground">/ {game.slots}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-500 bg-orange-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-orange-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-orange-500">{game.pendingCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Auto-join toggle */}
        <Card className={game.autoApprove ? "border-primary bg-primary/5" : ""}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${game.autoApprove ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm leading-tight">Auto-join</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                  {game.autoApprove
                    ? "Players are approved instantly when they join"
                    : "New players wait for your manual approval"}
                </p>
              </div>
            </div>
            <Switch
              checked={game.autoApprove}
              onCheckedChange={handleToggleAutoApprove}
              disabled={updateGameMutation.isPending || game.status === "cancelled"}
              aria-label="Toggle auto-join"
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="roster" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="notifications">Notify</TabsTrigger>
          </TabsList>
          
          <TabsContent value="roster" className="space-y-6 mt-6">
            {pendingRegs.length > 0 && (
              <Card className="border-orange-500">
                <CardHeader className="pb-3 border-b bg-orange-500/5">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                    <Users className="w-5 h-5" />
                    Needs Approval
                    <Badge variant="secondary" className="bg-orange-500 text-white ml-auto">{pendingRegs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {pendingRegs.map(reg => (
                    <div key={reg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{reg.name}</p>
                          <AttendanceBadge attendance={reg.attendance} />
                        </div>
                        <div className="text-sm text-muted-foreground flex gap-3">
                          {reg.phone && <span>{reg.phone}</span>}
                          {reg.email && <span>{reg.email}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Requested {format(parseISO(reg.createdAt), "MMM d, h:mm a")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleUpdateStatus(reg.id, "rejected")}
                        >
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => handleUpdateStatus(reg.id, "approved")}
                        >
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    Approved ({approvedRegs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {approvedRegs.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">No players approved yet.</div>
                  ) : (
                    approvedRegs.map(reg => (
                      <div key={reg.id} className="p-3 flex items-center justify-between group">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{reg.name}</p>
                          {reg.attendance === "tentative" && (
                            <AttendanceBadge attendance="tentative" />
                          )}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100"
                          onClick={() => handleUpdateStatus(reg.id, "rejected")}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 border-b bg-muted/30">
                  <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
                    <X className="w-5 h-5" />
                    Waitlisted / Rejected ({rejectedRegs.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {rejectedRegs.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">No rejected players.</div>
                  ) : (
                    rejectedRegs.map(reg => (
                      <div key={reg.id} className="p-3 flex items-center justify-between group">
                        <div>
                          <p className="font-medium text-sm text-muted-foreground">{reg.name}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-xs opacity-0 group-hover:opacity-100"
                          onClick={() => handleUpdateStatus(reg.id, "approved")}
                        >
                          Approve
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invites" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Create Invite Link
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Generate a personal invite link for a specific player. Share it via WhatsApp or any messaging app. The link auto-approves them and locks their name so it cannot be changed.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Player Name *</label>
                    <Input
                      placeholder="John Smith"
                      value={newInviteName}
                      onChange={(e) => setNewInviteName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateInvite()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-muted-foreground">Phone (optional)</label>
                    <Input
                      placeholder="07xxxxxxxxx"
                      value={newInvitePhone}
                      onChange={(e) => setNewInvitePhone(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateInvite}
                  disabled={!newInviteName.trim() || createInviteMutation.isPending}
                >
                  {createInviteMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Link2 className="w-4 h-4 mr-2" /> Create Invite Link</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Link2 className="w-5 h-5" /> Invite Links
                {invites && <Badge variant="secondary">{invites.length}</Badge>}
              </h3>
              {invitesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !invites?.length ? (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl text-sm">
                  No invite links yet. Create one above to get started.
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <Card key={inv.id} className={inv.used ? "opacity-60" : ""}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{inv.name}</p>
                            {inv.phone && <span className="text-xs text-muted-foreground">{inv.phone}</span>}
                            <Badge
                              variant={inv.used ? "secondary" : "default"}
                              className="text-xs ml-auto shrink-0"
                            >
                              {inv.used ? "Used" : "Pending"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                            /invite/{inv.token.slice(0, 12)}…
                          </p>
                          {inv.usedAt && (
                            <p className="text-xs text-muted-foreground">
                              Used {format(parseISO(inv.usedAt), "MMM d, h:mm a")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!inv.used && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => copyInviteLink(inv.token)}
                                title="Copy link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2 text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => {
                                  const msg = `Hi ${inv.name}, you've been invited to join ${game.title}! Tap to confirm your spot: ${getInviteUrl(inv.token)}`;
                                  openWhatsAppShare(msg, inv.phone);
                                }}
                                title="Send via WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteInvite(inv.id)}
                            title="Delete invite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border">
              <div>
                <h3 className="font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Team Generator</h3>
                <p className="text-sm text-muted-foreground">Automatically split approved players into balanced teams.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSplitTeams(2)} disabled={splitTeamsMutation.isPending || approvedRegs.length < 2}>
                  Split into 2
                </Button>
                <Button variant="outline" onClick={() => handleSplitTeams(3)} disabled={splitTeamsMutation.isPending || approvedRegs.length < 3}>
                  Split into 3
                </Button>
              </div>
            </div>

            {teams ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.teams.map((team, idx) => (
                  <Card key={team.id} className={`border-t-4 shadow-sm`} style={{ borderTopColor: team.color }}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex justify-between items-center">
                        {team.name}
                        <Badge variant="secondary">{team.players.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y">
                      {team.players.map(player => {
                        const reg = approvedRegs.find(r => r.name === player.name); // rough match for id since team.players is PublicPlayer
                        return (
                        <div key={player.id} className="p-3 text-sm font-medium flex justify-between items-center group">
                          <span>{player.name}</span>
                          {reg && (
                            <Select
                              value={team.id}
                              onValueChange={(newTeamId) => {
                                if (newTeamId !== team.id) {
                                  useMoveTeamPlayer().mutate({
                                    gameId,
                                    data: { registrationId: reg.id, teamId: newTeamId }
                                  }, {
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
                                    }
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.teams.map(t => (
                                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )})}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                No teams generated yet. Click a split button above to create teams from approved players.
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" /> Send Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">To:</label>
                  <Select value={notificationAudience} onValueChange={(v: any) => setNotificationAudience(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved Players Only</SelectItem>
                      <SelectItem value="all">All Registered Players</SelectItem>
                      <SelectItem value="pending">Pending Players Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message:</label>
                  <Textarea 
                    placeholder="Type your message here..." 
                    value={notificationMsg}
                    onChange={(e) => setNotificationMsg(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleSendNotification}
                    disabled={!notificationMsg.trim() || notifyMutation.isPending}
                  >
                    {notifyMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
                    Send In-App
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
                    onClick={handleShareWhatsApp}
                    disabled={!notificationMsg.trim()}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share via WhatsApp
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  In-app saves the message to player accounts. WhatsApp opens your phone's WhatsApp so you can pick a contact or group to send to.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-bold text-lg">Message History</h3>
              {!notifications?.length ? (
                <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl text-sm">
                  No messages sent yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(note => (
                    <Card key={note.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-xs">Sent to: {note.audience}</Badge>
                          <span className="text-xs text-muted-foreground">{format(parseISO(note.createdAt), "MMM d, h:mm a")}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{note.message}</p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <p className="text-xs text-muted-foreground">Delivered to {note.recipientCount} players</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-700 hover:bg-green-50 hover:text-green-800"
                            onClick={() => openWhatsAppShare(note.message)}
                          >
                            <Share2 className="w-3.5 h-3.5 mr-1" />
                            WhatsApp
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
