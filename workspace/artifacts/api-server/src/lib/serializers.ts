import type {
  GameRow,
  RegistrationRow,
  NotificationRow,
  TeamRow,
  ActivityRow,
} from "@workspace/db";

export interface GameSummaryDTO {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  slots: number;
  approvedCount: number;
  pendingCount: number;
  status: "open" | "full" | "cancelled" | "completed";
  notes: string | null;
  autoApprove: boolean;
}

export function toGameSummary(
  game: GameRow,
  approvedCount: number,
  pendingCount: number,
): GameSummaryDTO {
  let status = game.status as GameSummaryDTO["status"];
  if (status === "open" && approvedCount >= game.slots) {
    status = "full";
  }
  return {
    id: game.id,
    title: game.title,
    date: typeof game.date === "string" ? game.date : String(game.date),
    startTime: game.startTime,
    endTime: game.endTime,
    location: game.location,
    slots: game.slots,
    approvedCount,
    pendingCount,
    status,
    notes: game.notes,
    autoApprove: game.autoApprove,
  };
}

export function toGameWithCreated(
  game: GameRow,
  approvedCount: number,
  pendingCount: number,
) {
  return {
    ...toGameSummary(game, approvedCount, pendingCount),
    createdAt: game.createdAt.toISOString(),
  };
}

export function toRegistrationDTO(
  r: RegistrationRow,
  teamId: string | null = null,
) {
  return {
    id: r.id,
    gameId: r.gameId,
    name: r.name,
    phone: r.phone,
    email: r.email,
    status: r.status as "pending" | "approved" | "rejected" | "withdrawn",
    attendance: (r.attendance ?? "confirmed") as "confirmed" | "tentative",
    createdAt: r.createdAt.toISOString(),
    teamId,
  };
}

export function toNotificationDTO(n: NotificationRow) {
  return {
    id: n.id,
    gameId: n.gameId,
    title: n.title,
    message: n.message,
    audience: n.audience as "all" | "approved" | "pending",
    createdAt: n.createdAt.toISOString(),
    recipientCount: n.recipientCount,
  };
}

export function toTeamDTO(
  t: TeamRow,
  players: { id: string; name: string }[],
) {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    players,
  };
}

export function toActivityDTO(a: ActivityRow) {
  return {
    id: a.id,
    type: a.type as
      | "registration"
      | "approval"
      | "rejection"
      | "game_created"
      | "game_updated"
      | "game_cancelled"
      | "teams_split"
      | "notification_sent",
    message: a.message,
    gameId: a.gameId,
    gameTitle: a.gameTitle,
    createdAt: a.createdAt.toISOString(),
  };
}
