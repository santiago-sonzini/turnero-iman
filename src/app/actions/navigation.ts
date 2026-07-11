import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  FileText,
  Package,
  ShoppingCart,
  Bell,
  HelpCircle,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  href: string;
  icon: any;
  badge?: string | number;
  children?: NavigationItem[];
}

export const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Productos",
    href: "/dashboard/products",
    icon: Package,
  },
  {
    title: "Clientes",
    href: "/dashboard/clients",
    icon: Users,
  },
  // {
  //   title: "Configuracion",
  //   href: "/dashboard/settings",
  //   icon: Settings,
  // },
  // {
  //   title: "Login",
  //   href: "/",
  //   icon: HelpCircle,
  // },
];

export const userMenuItems = [
  {
    title: "Perfil",
    href: "/dashboard/profile",
  },
  {
    title: "Logout",
    href: "/logout",
  },
];
