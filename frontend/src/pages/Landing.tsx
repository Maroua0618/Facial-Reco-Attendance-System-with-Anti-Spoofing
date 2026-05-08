import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const { signOut, session } = useAuth();

  useEffect(() => {
    if (session) {
      signOut();
    }
  }, [session, signOut]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <div id="features">
        <FeaturesSection />
      </div>
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 FaceGuard. AI-Powered Student Recognition System.
        </div>
      </footer>
    </div>
  );
}
