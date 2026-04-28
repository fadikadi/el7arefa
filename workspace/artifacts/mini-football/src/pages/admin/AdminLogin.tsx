import { useAdminLogin, getGetAdminSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const loginMutation = useAdminLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    }
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionQueryKey() });
        toast({ title: "Logged in successfully" });
        setLocation("/admin");
      },
      onError: (error) => {
        toast({ 
          title: "Login failed", 
          description: error.message || "Invalid credentials",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mb-6 shadow-lg shadow-primary/20 transform rotate-3">
          <Trophy className="w-8 h-8 -rotate-3" />
        </div>
        
        <Card className="w-full shadow-xl border-border/50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
            <CardDescription>Sign in to manage games and players</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-bold" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
