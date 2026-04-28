import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Share, Plus, X } from "lucide-react";

const DISMISS_KEY = "mf_install_hint_dismissed_at";
const DISMISS_DAYS = 7;
const OPEN_INSTALL_EVENT = "mf:open-install-instructions";

export function openInstallInstructions() {
  window.dispatchEvent(new CustomEvent(OPEN_INSTALL_EVENT));
}

type Platform = "ios" | "android" | "desktop" | "unknown";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Mobi/i.test(ua)) return "unknown";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(mq || iosStandalone);
}

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallAppHint() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [showBanner, setShowBanner] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setShowBanner(false);
      setDialogOpen(false);
    };
    const onOpenRequest = () => {
      void openInstallFlow();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_INSTALL_EVENT, onOpenRequest);

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!isStandalone() && !isRecentlyDismissed() && (p === "ios" || p === "android")) {
      timer = setTimeout(() => setShowBanner(true), 1500);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_INSTALL_EVENT, onOpenRequest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openInstallFlow = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") setShowBanner(false);
        setDeferredPrompt(null);
        return;
      } catch {
        // fall through
      }
    }
    setDialogOpen(true);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) {
    return (
      <InstallInstructionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={platform}
      />
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md md:hidden">
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-white p-3 shadow-lg">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Install Mini Football</p>
            <p className="text-xs text-muted-foreground leading-tight">
              Add to your home screen for one-tap access.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 h-9 bg-green-600 hover:bg-green-700"
            onClick={() => void openInstallFlow()}
          >
            Install
          </Button>
          <button
            type="button"
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <InstallInstructionsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={platform}
      />
    </>
  );
}

function InstallInstructionsDialog({
  open,
  onOpenChange,
  platform,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: Platform;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Mini Football to your home screen</DialogTitle>
          <DialogDescription>
            Install this app for fast, full-screen access — no app store needed.
          </DialogDescription>
        </DialogHeader>

        {platform === "ios" ? (
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">1</span>
              <div>
                Tap the <span className="inline-flex items-center gap-1 font-medium"><Share className="h-4 w-4" /> Share</span> button at the bottom of Safari.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">2</span>
              <div>
                Scroll down and tap <span className="inline-flex items-center gap-1 font-medium"><Plus className="h-4 w-4" /> Add to Home Screen</span>.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">3</span>
              <div>Tap <span className="font-medium">Add</span> in the top right. The app icon will appear on your home screen.</div>
            </li>
          </ol>
        ) : platform === "android" ? (
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">1</span>
              <div>Tap the <span className="font-medium">menu (three dots)</span> in the top right of Chrome.</div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">2</span>
              <div>Tap <span className="font-medium">Install app</span> or <span className="font-medium">Add to Home screen</span>.</div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-semibold text-white">3</span>
              <div>Confirm <span className="font-medium">Install</span>. The app icon will appear on your home screen.</div>
            </li>
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Open this site on your phone (in Safari for iPhone, or Chrome for Android) to add it to your home screen.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
