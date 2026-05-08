import { motion } from "framer-motion";
import { Scan, ShieldAlert, Clock, Users, Eye, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Scan,
    title: "Face Recognition",
    description:
      "Deep learning-powered face detection and identification with 99%+ accuracy across lighting conditions.",
  },
  {
    icon: ShieldAlert,
    title: "Anti-Spoof Detection",
    description:
      "Advanced liveness detection prevents photo, video, and mask-based spoofing attempts.",
  },
  {
    icon: Clock,
    title: "Real-Time Attendance",
    description:
      "Automated attendance marking the instant a student is recognized. No manual effort needed.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Admins and teachers each get tailored dashboards with appropriate permissions.",
  },
  {
    icon: Eye,
    title: "Liveness Detection",
    description:
      "Blink detection, depth analysis, and movement checks ensure only live faces are accepted.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Comprehensive attendance trends, recognition accuracy metrics, and exportable reports.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Powered by <span className="text-gradient">Deep Learning</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A comprehensive suite of AI-driven tools for secure, automated
            student identification and attendance management.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-6 hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-sm transition-shadow">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
