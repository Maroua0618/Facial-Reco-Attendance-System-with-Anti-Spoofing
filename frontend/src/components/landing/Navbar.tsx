import { Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Scan className="w-5 h-5 text-primary" />
          </div>
          <span>FaceGuard</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login?tab=login">Login</Link>
          </Button>
          <Button size="sm" className="glow-sm" asChild>
            <Link to="/login?tab=signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
