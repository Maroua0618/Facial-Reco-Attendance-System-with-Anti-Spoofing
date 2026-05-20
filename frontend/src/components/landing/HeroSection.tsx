import { motion } from "framer-motion";
import { Shield, Scan, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-face-recognition.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 grid-pattern opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            AI-Powered Secure{" "}
            <span className="text-gradient">Student Recognition</span> System
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
            Automate attendance with deep learning face recognition. Prevent
            spoofing attacks with liveness detection. Real-time, secure, and
            intelligent.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="glow-sm text-base px-8">
              <Link to="/login?tab=signup">
                Get Started <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8"
            >
              <Link to="/login">Login</Link>
            </Button>
          </div>

          <div className="flex items-center gap-8 pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" />
              <span>99.2% Accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span>Anti-Spoof Protected</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          <div className="relative rounded-2xl overflow-hidden glass glow-md">
            <img
              src={heroImage}
              alt="AI Face Recognition Technology"
              className="w-full h-auto rounded-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Recognition Status
                  </p>
                  <p className="text-primary font-semibold font-mono">
                    LIVE — Verified ✓
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-success font-bold font-mono text-lg">
                    98.7%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
