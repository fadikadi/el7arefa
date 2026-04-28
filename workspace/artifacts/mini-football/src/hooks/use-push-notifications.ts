import { useCallback, useEffect, useState } from "react";

const REGISTRATIONS_KEY = "mf_registrations";

type StoredRegistration = { token: string; gameId?: string; name?: string };

function readRegistrations(): StoredRegistration[] {
  try {
    const raw = localStorage.getItem(REGISTRATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is StoredRegistration =>
        r && typeof r === "object" && typeof r.token === "string",
    );
  } catch {
    return [];
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function getApiBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const base = getApiBase();
  try {
    const reg = await navigator.serviceWorker.register(`${base}sw.js`, {
      scope: base,
    });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [permission, setPermission] = useState<PushPermission>(
    supported ? Notification.permission : "unsupported",
  );
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscriptionState = useCallback(async () => {
    if (!supported) return;
    const reg = await ensureServiceWorker();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  }, [supported]);

  useEffect(() => {
    void refreshSubscriptionState();
  }, [refreshSubscriptionState]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setError("Notifications are not supported on this device.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError(
          perm === "denied"
            ? "Notifications are blocked. Enable them in your browser settings."
            : "Permission was not granted.",
        );
        return false;
      }

      const reg = await ensureServiceWorker();
      if (!reg) {
        setError("Could not start the service worker.");
        return false;
      }

      const apiBase = getApiBase();
      const keyRes = await fetch(`${apiBase}api/push/public-key`);
      if (!keyRes.ok) throw new Error("Could not load push key");
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const regs = readRegistrations();
      if (regs.length === 0) {
        setError("Join a game first so we know who to notify.");
        return false;
      }

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const results = await Promise.all(
        regs.map((r) =>
          fetch(`${apiBase}api/push/subscribe`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              registrationToken: r.token,
              subscription: subJson,
            }),
          }).then((res) => res.ok),
        ),
      );

      if (!results.some(Boolean)) {
        setError("We couldn't link this device to your registrations.");
        return false;
      }

      setSubscribed(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable notifications.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await ensureServiceWorker();
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setSubscribed(false);
        return;
      }
      const endpoint = sub.endpoint;
      try {
        await fetch(`${getApiBase()}api/push/unsubscribe`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      } catch {}
      await sub.unsubscribe();
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return {
    supported,
    permission,
    subscribed,
    busy,
    error,
    subscribe,
    unsubscribe,
  };
}
