import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, Eye, Fingerprint, AlertTriangle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

const detectionFeatures = [
  {
    icon: Eye,
    title: "Liveness Detection",
    desc: "Blink detection and micro-movement analysis to verify live faces.",
    status: "active",
  },
  {
    icon: Fingerprint,
    title: "Depth Analysis",
    desc: "3D depth mapping to distinguish real faces from flat images.",
    status: "active",
  },
  {
    icon: ShieldAlert,
    title: "Anti-Mask Detection",
    desc: "Deep learning models detect prosthetic masks and face coverings.",
    status: "active",
  },
];

const alertLogs = [
  { time: "14:22:51", type: "Photo Attack", severity: "high", detail: "Printed photo held to camera — rejected." },
  { time: "13:45:12", type: "Video Replay", severity: "high", detail: "Phone screen video replay detected — blocked." },
  { time: "11:30:08", type: "Mask Detected", severity: "medium", detail: "Silicone mask attempt flagged — alerted admin." },
  { time: "09:15:44", type: "Low Confidence", severity: "low", detail: "Recognition score 62% — manual review required." },
  { time: "08:55:22", type: "Photo Attack", severity: "high", detail: "Tablet screen photo detected — rejected." },
];

export default function Security() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Security & Anti-Spoofing</h1>
          <p className="text-muted-foreground text-sm">Real-time threat detection and liveness verification</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-xl p-8 flex flex-col items-center text-center glow-sm"
          >
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-bold text-success">Live Face Detected ✅</h2>
            <p className="text-muted-foreground text-sm mt-2">
              All liveness checks passed. No spoofing indicators found.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6 w-full">
              <div className="text-center">
                <p className="text-lg font-bold text-success">✓</p>
                <p className="text-xs text-muted-foreground">Blink</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-success">✓</p>
                <p className="text-xs text-muted-foreground">Depth</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-success">✓</p>
                <p className="text-xs text-muted-foreground">Texture</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-8 flex flex-col items-center text-center border-destructive/20"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive">Spoof Attempt Detected ❌</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Example: Photo attack detected. Liveness check failed.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-6 w-full">
              <div className="text-center">
                <p className="text-lg font-bold text-destructive">✗</p>
                <p className="text-xs text-muted-foreground">Blink</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-destructive">✗</p>
                <p className="text-xs text-muted-foreground">Depth</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-warning">!</p>
                <p className="text-xs text-muted-foreground">Texture</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {detectionFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{f.title}</h3>
                  <span className="text-xs text-success">Active</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Alert Logs
          </h3>
          <div className="space-y-2">
            {alertLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-4 text-sm p-3 rounded-lg bg-muted/30">
                <span className="font-mono text-muted-foreground text-xs w-16">{log.time}</span>
                <span className={`text-xs px-2 py-1 rounded-full w-28 text-center ${
                  log.severity === "high" ? "bg-destructive/10 text-destructive" :
                  log.severity === "medium" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {log.type}
                </span>
                <span className="flex-1 text-muted-foreground">{log.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
