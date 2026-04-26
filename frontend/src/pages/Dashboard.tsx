import { motion } from "framer-motion";
import { BookOpen, UserPlus, Camera, Users, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const mainActions = [
  {
    title: "Add Module",
    desc: "Create a module with year and groups",
    icon: BookOpen,
    href: "/modules/add",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    title: "Register Student",
    desc: "Enroll a student with face recognition",
    icon: UserPlus,
    href: "/students/register",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    title: "Check Attendance",
    desc: "Start live face recognition attendance",
    icon: Camera,
    href: "/attendance",
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

export default function Dashboard() {
  const { data: moduleCount } = useQuery({
    queryKey: ["modules-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("modules")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: studentCount } = useQuery({
    queryKey: ["students-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: attendanceCount } = useQuery({
    queryKey: ["attendance-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const stats = [
    {
      label: "Total Modules",
      value: moduleCount ?? 0,
      icon: BookOpen,
      color: "text-primary",
    },
    {
      label: "Total Students",
      value: studentCount ?? 0,
      icon: Users,
      color: "text-success",
    },
    {
      label: "Attendance Records",
      value: attendanceCount ?? 0,
      icon: CheckCircle,
      color: "text-warning",
    },
  ];

  const { session } = useAuth();
  const rawFullName = session?.user?.user_metadata?.full_name;
  const fullName =
    typeof rawFullName === "string" && rawFullName.trim() !== ""
      ? rawFullName
      : "Teacher";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{fullName}'s Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome back. Choose an action to get started.
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {mainActions.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={action.href}
                className="glass rounded-xl p-8 flex flex-col items-center text-center gap-4 hover:border-primary/30 transition-all group"
              >
                <div
                  className={`w-16 h-16 rounded-2xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  <action.icon className={`w-8 h-8 ${action.color}`} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{action.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {action.desc}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="glass rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
