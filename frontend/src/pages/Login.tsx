import { useState } from "react";
import { motion } from "framer-motion";
import { Scan, Mail, Lock, Eye, EyeOff, GraduationCap, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type RoleChoice = "teacher" | "lecturer";

function friendlySignupError(msg: string | undefined): string {
  if (!msg) return "Sign-up failed.";
  if (msg.toLowerCase().includes("@ensia.edu.dz")) {
    return "Sign-up is restricted to @ensia.edu.dz email addresses.";
  }
  return msg;
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const { session } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<RoleChoice>("teacher");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setLoginError("Please verify your email address before logging in.");
      } else {
        setLoginError(error.message);
      }
    } else {
      navigate("/dashboard", { replace: true });
    }
    setIsLoggingIn(false);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    setSignupError(null);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          full_name: signupName,
          role: signupRole,
        },
      },
    });
    setIsSigningUp(false);
    if (error) {
      setSignupError(friendlySignupError(error.message));
    } else if (data?.user && data.user.identities && data.user.identities.length === 0) {
      setSignupError("This email address is already in use.");
    } else {
      setShowOtpInput(true);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    setOtpError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: signupEmail,
      token: otp,
      type: "email",
    });
    setIsVerifyingOtp(false);
    if (error) {
      setOtpError(error.message);
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Scan className="w-6 h-6 text-primary" />
            </div>
            <span>FaceGuard</span>
          </Link>
          <p className="text-muted-foreground text-sm">Secure AI-powered authentication</p>
        </div>
        <div className="glass rounded-2xl p-8">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (<div className="text-sm font-medium text-destructive">{loginError}</div>)}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email" type="email" placeholder="you@ensia.edu.dz" className="pl-10"
                      value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full glow-sm" disabled={isLoggingIn}>
                  {isLoggingIn ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {!showOtpInput ? (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {signupError && (<div className="text-sm font-medium text-destructive">{signupError}</div>)}

                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name" placeholder="Zoubir Bousnina"
                      value={signupName} onChange={(e) => setSignupName(e.target.value)} required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-email" type="email" placeholder="you@ensia.edu.dz" className="pl-10"
                        value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">Only @ensia.edu.dz emails can sign up.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <RadioGroup
                      value={signupRole}
                      onValueChange={(v) => setSignupRole(v as RoleChoice)}
                      className="grid grid-cols-2 gap-2"
                    >
                      <label
                        htmlFor="role-teacher"
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                          signupRole === "teacher" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <RadioGroupItem value="teacher" id="role-teacher" />
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-sm">Teacher</span>
                      </label>
                      <label
                        htmlFor="role-lecturer"
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                          signupRole === "lecturer" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <RadioGroupItem value="lecturer" id="role-lecturer" />
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm">Lecturer</span>
                      </label>
                    </RadioGroup>
                    <p className="text-[11px] text-muted-foreground">
                      Lecturers own modules; teachers are assigned to TD/TP groups.
                      First-ever signup is automatically promoted to admin.
                    </p>
                  </div>

                  <Button type="submit" className="w-full glow-sm" disabled={isSigningUp}>
                    {isSigningUp ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium text-foreground">Verify your email</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We've sent a 6-digit verification code to <span className="text-primary">{signupEmail}</span>.
                    </p>
                  </div>
                  {otpError && (<div className="text-sm font-medium text-destructive text-center">{otpError}</div>)}
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-center block">Verification Code</Label>
                    <Input
                      id="otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="XXXXXX"
                      value={otp} onChange={(e) => setOtp(e.target.value)}
                      className="text-center tracking-[0.5em] text-lg font-mono placeholder:tracking-normal"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full glow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isVerifyingOtp || otp.length !== 6}>
                    {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                  </Button>
                  <div className="text-center mt-4 text-sm">
                    <button type="button" onClick={() => setShowOtpInput(false)}
                      className="text-muted-foreground hover:text-primary transition-colors">
                      Back to sign up
                    </button>
                  </div>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}
