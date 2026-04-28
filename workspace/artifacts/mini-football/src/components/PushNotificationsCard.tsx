import { Bell, BellOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationsCard() {
  const { supported, permission, subscribed, busy, error, subscribe, unsubscribe } =
    usePushNotifications();

  if (!supported) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Notifications not supported</p>
            <p className="text-amber-800/80 mt-1">
              Your browser doesn't support push notifications. Try installing the
              app to your home screen, then open it from there.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subscribed) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-green-900">Notifications on</p>
            <p className="text-green-800/80 mt-1">
              You'll get an alert when your registration is approved or a game changes.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-green-900 hover:bg-green-100"
            onClick={() => void unsubscribe()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BellOff className="w-4 h-4 mr-1" />
            )}
            Turn off
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (permission === "denied") {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <BellOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Notifications blocked</p>
            <p className="text-amber-800/80 mt-1">
              You've blocked notifications for this site. To get game updates, enable
              notifications for Mini Football in your browser or phone settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-green-50/40">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
          <Bell className="w-5 h-5" />
        </div>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-foreground">Get game alerts on your phone</p>
          <p className="text-muted-foreground mt-1">
            We'll let you know when your spot is approved, the game is updated, or a
            new message arrives from the organizer.
          </p>
          {error && (
            <p className="text-destructive text-xs mt-2">{error}</p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 bg-green-600 hover:bg-green-700"
          onClick={() => void subscribe()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4 mr-1" />
          )}
          Turn on
        </Button>
      </CardContent>
    </Card>
  );
}
