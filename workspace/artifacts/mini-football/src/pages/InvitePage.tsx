import { useRoute, useLocation } from "wouter";
import { useLookupInvite, useJoinGame } from "@workspace/api-client-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { addLocalRegistration } from "@/lib/storage";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format, parseISO } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  attendance: z.enum(["confirmed", "tentative"]),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function InvitePage() {
  const [, params] = useRoute("/invite/:token");
  const inviteToken = params?.token || "";
  const [, setLocation] = useLocation();
  const [success, setSuccess] = useState(false);

  const { data: invite, isLoading, error } = useLookupInvite(
    { token: inviteToken },
    { query: { enabled: !!inviteToken, retry: false } }
  );

  const joinMutation = useJoinGame();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", attendance: "confirmed" },
  });

  const onSubmit = (data: InviteFormValues) => {
    if (!invite) return;
    joinMutation.mutate(
      {
        gameId: invite.gameId,
        data: {
          name: invite.name,
          email: data.email || undefined,
          attendance: data.attendance,
          inviteToken,
        },
      },
      {
        onSuccess: (res) => {
          addLocalRegistration(invite.gameId, res.token);
          setSuccess(true);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-md space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (error || !invite) {
    const isGone = (error as { response?: { status?: number } })?.response?.status === 410;
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 max-w-md text-center">
          <Card>
            <CardContent className="pt-8 pb-8">
              <h2 className="text-2xl font-bold mb-2">
                {isGone ? "Invite Already Used" : "Invalid Invite"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isGone
                  ? "This invite link has already been used to join the game."
                  : "This invite link is not valid or has expired."}
              </p>
              <Button onClick={() => setLocation("/")} variant="outline">
                Browse Games
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (success) {
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
              <p className="text-muted-foreground mb-8">
                You've been approved for {invite.gameTitle}. See you on the pitch!
              </p>
              <div className="space-y-3 w-full">
                <Button
                  onClick={() => setLocation(`/games/${invite.gameId}`)}
                  className="w-full h-12 font-bold"
                >
                  View Game Details
                </Button>
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="w-full h-12"
                >
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
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
              You've been invited to
            </p>
            <p className="font-bold text-lg leading-tight">{invite.gameTitle}</p>
            {invite.gameDate && (
              <p className="text-sm text-muted-foreground mt-1">
                {format(parseISO(invite.gameDate), "EEEE, MMMM d")}
                {invite.gameStartTime ? ` at ${invite.gameStartTime}` : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirm Your Spot</CardTitle>
            <CardDescription>
              This invite is reserved for you — your name is pre-set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    Your Name
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <Lock className="w-3 h-3" /> Fixed by admin
                    </span>
                  </Label>
                  <Input
                    value={invite.name}
                    readOnly
                    className="h-12 text-lg bg-muted cursor-not-allowed"
                  />
                </div>

                {invite.phone && (
                  <div className="space-y-1.5">
                    <Label className="font-medium text-muted-foreground">Phone</Label>
                    <Input
                      value={invite.phone}
                      readOnly
                      className="h-12 bg-muted cursor-not-allowed"
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-muted-foreground">
                        Email (optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-12"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendance"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="font-medium text-muted-foreground">
                        Will you attend?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="confirmed" id="confirmed" />
                            <Label htmlFor="confirmed">Confirmed</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="tentative" id="tentative" />
                            <Label htmlFor="tentative">Tentative</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {joinMutation.isError && (
                  <p className="text-sm text-destructive">
                    {(joinMutation.error as { response?: { data?: { message?: string } } })
                      ?.response?.data?.message ?? "Something went wrong. Please try again."}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 font-bold text-base"
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining...</>
                  ) : (
                    "Confirm My Spot"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
