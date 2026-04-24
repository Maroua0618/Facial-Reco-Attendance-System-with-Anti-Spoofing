import { type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  ShieldAlert,
  Users,
  Scan,
  LogOut,
  BookOpen,
  UserPlus,
  History,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const navItems = [
  { title: "Dashboard",        url: "/dashboard",          icon: LayoutDashboard },
  { title: "Add Module",       url: "/modules/add",        icon: BookOpen },
  { title: "Register Student", url: "/students/register",  icon: UserPlus },
  { title: "Attendance",       url: "/attendance",         icon: Camera },
  { title: "History",          url: "/history",            icon: History },
  { title: "Students",         url: "/students",           icon: Users },
];

const securityItems = [
  { title: "Security",      url: "/security",            icon: ShieldAlert },
  { title: "Spoof log",     url: "/security/spoof-log",  icon: ShieldAlert },
  { title: "Activity log",  url: "/admin/activity",      icon: Activity },
];

function AppSidebarContent() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <div className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <Scan className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && <span className="font-bold">FaceGuard</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} activeClassName="bg-primary/10 text-primary">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Security & Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {securityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} activeClassName="bg-primary/10 text-primary">
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" asChild>
          <Link to="/">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </Link>
        </Button>
      </div>
    </Sidebar>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebarContent />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                T
              </div>
              <span className="text-sm hidden md:block">Teacher</span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
