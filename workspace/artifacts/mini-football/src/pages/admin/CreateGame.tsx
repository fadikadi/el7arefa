import { useCreateGame, getListGamesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const gameSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Valid time required (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Valid time required (HH:MM)"),
  location: z.string().min(1, "Location is required"),
  slots: z.coerce.number().min(2).max(50),
  notes: z.string().optional().or(z.literal("")),
});

type GameFormValues = z.infer<typeof gameSchema>;

export default function CreateGame() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createMutation = useCreateGame();

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      title: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "18:00",
      endTime: "19:00",
      location: "",
      slots: 10,
      notes: "",
    }
  });

  const onSubmit = (data: GameFormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: (game) => {
        queryClient.invalidateQueries({ queryKey: getListGamesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: "Game created successfully" });
        setLocation(`/admin/games/${game.id}`);
      },
      onError: (error) => {
        toast({
          title: "Failed to create game",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto w-full pb-24 md:pb-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Game</h1>
            <p className="text-muted-foreground text-sm">Schedule a new match and open registrations</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-card border rounded-xl p-4 md:p-6 space-y-6">
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
              <Button type="button" variant="outline" onClick={() => setLocation("/admin")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="min-w-[120px]">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Game
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
