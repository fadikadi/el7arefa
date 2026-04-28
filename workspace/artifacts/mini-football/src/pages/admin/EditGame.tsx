import { useRoute, useLocation } from "wouter";
import { useGetGame, useUpdateGame, useCancelGame, getListGamesQueryKey, getGetGameQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const gameSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Valid time required (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Valid time required (HH:MM)"),
  location: z.string().min(1, "Location is required"),
  slots: z.coerce.number().min(2).max(50),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["open", "full", "cancelled", "completed"]).optional(),
});

type GameFormValues = z.infer<typeof gameSchema>;

export default function EditGame() {
  const [, params] = useRoute("/admin/games/:gameId/edit");
  const gameId = params?.gameId || "";
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: gameData, isLoading } = useGetGame(gameId, { query: { enabled: !!gameId } });
  const updateMutation = useUpdateGame();
  const cancelMutation = useCancelGame();

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: "",
      date: "",
      startTime: "",
      endTime: "",
      location: "",
      slots: 10,
      notes: "",
      status: "open",
    }
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (gameData?.game && !initialized.current) {
      const g = gameData.game;
      form.reset({
        title: g.title,
        date: g.date,
        startTime: g.startTime,
        endTime: g.endTime,
        location: g.location,
        slots: g.slots,
        notes: g.notes || "",
        status: g.status,
      });
      initialized.current = true;
    }
  }, [gameData, form]);

  const onSubmit = (data: GameFormValues) => {
    updateMutation.mutate({ gameId, data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
        toast({ title: "Game updated successfully" });
        setLocation(`/admin/games/${gameId}`);
      },
      onError: (error) => {
        toast({
          title: "Failed to update game",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  const handleCancelGame = () => {
    cancelMutation.mutate({ gameId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
        toast({ title: "Game cancelled successfully" });
        setLocation(`/admin/games/${gameId}`);
      },
      onError: (error) => {
        toast({
          title: "Failed to cancel game",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 max-w-3xl mx-auto w-full space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full pb-24 md:pb-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/admin/games/${gameId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Edit Game</h1>
              <p className="text-muted-foreground text-sm">Update match details</p>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" /> Cancel Game
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will cancel the game. All approved and pending players will see the game as cancelled. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelGame} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Cancel Game
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-card border rounded-xl p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Wednesday Night 5-a-side" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="date" {...field} className="pl-10" />
                          <CalendarIcon className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} className="pl-10" />
                          <Clock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="time" {...field} className="pl-10" />
                          <Clock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Central Park Pitch 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Player Slots</FormLabel>
                      <FormControl>
                        <Input type="number" min={2} max={50} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes / Instructions (optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g. Bring a white and a dark shirt. Cleats allowed." 
                        className="resize-none h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pb-8">
              <Button type="button" variant="outline" onClick={() => setLocation(`/admin/games/${gameId}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="min-w-[120px]">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
