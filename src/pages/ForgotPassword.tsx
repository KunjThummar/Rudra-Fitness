import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    // TODO: Integrate Supabase password reset
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      toast({ title: "Reset link sent to your email!" });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
          <Dumbbell className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
        <p className="text-sm text-muted-foreground mt-1">We'll send you a reset link</p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit gap-1 -ml-2"
            onClick={() => navigate("/login")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Check your email for a password reset link. If you don't see it, check your spam folder.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
