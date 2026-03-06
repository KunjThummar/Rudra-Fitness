import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
        <ShieldX className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  );
}
