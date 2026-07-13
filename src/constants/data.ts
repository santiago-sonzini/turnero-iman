import { type NavItem } from '@/types';

export type User = {
  id: number;
  name: string;
  company: string;
  role: string;
  verified: boolean;
  status: string;
};
export const users: User[] = [
  {
    id: 1,
    name: 'Candice Schiner',
    company: 'Dell',
    role: 'Frontend Developer',
    verified: false,
    status: 'Active'
  },
  {
    id: 2,
    name: 'John Doe',
    company: 'TechCorp',
    role: 'Backend Developer',
    verified: true,
    status: 'Active'
  },
  {
    id: 3,
    name: 'Alice Johnson',
    company: 'WebTech',
    role: 'UI Designer',
    verified: true,
    status: 'Active'
  },
  {
    id: 4,
    name: 'David Smith',
    company: 'Innovate Inc.',
    role: 'Fullstack Developer',
    verified: false,
    status: 'Inactive'
  },
  {
    id: 5,
    name: 'Emma Wilson',
    company: 'TechGuru',
    role: 'Product Manager',
    verified: true,
    status: 'Active'
  },
  {
    id: 6,
    name: 'James Brown',
    company: 'CodeGenius',
    role: 'QA Engineer',
    verified: false,
    status: 'Active'
  },
  {
    id: 7,
    name: 'Laura White',
    company: 'SoftWorks',
    role: 'UX Designer',
    verified: true,
    status: 'Active'
  },
  {
    id: 8,
    name: 'Michael Lee',
    company: 'DevCraft',
    role: 'DevOps Engineer',
    verified: false,
    status: 'Active'
  },
  {
    id: 9,
    name: 'Olivia Green',
    company: 'WebSolutions',
    role: 'Frontend Developer',
    verified: true,
    status: 'Active'
  },
  {
    id: 10,
    name: 'Robert Taylor',
    company: 'DataTech',
    role: 'Data Analyst',
    verified: false,
    status: 'Active'
  }
];

export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string; // Consider using a proper date type if possible
  street: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  longitude?: number; // Optional field
  latitude?: number; // Optional field
  job: string;
  profile_picture?: string | null; // Profile picture can be a string (URL) or null (if no picture)
};

export const navItems: NavItem[] = [
  {
    title: 'Resumen',
    href: '/dashboard/resumen',
    icon: 'dashboard',
    label: 'resumen'
  },
  {
    title: 'Clientes',
    href: '/dashboard',
    icon: 'profile',
    label: 'clientes'
  },
  {
    title: 'Vender',
    href: '/dashboard/invoices/create',
    icon: 'invoiceCreate',
    label: 'vender',
    feature: 'recibos'
  },
  {
    title: 'Promos',
    href: '/dashboard/promos',
    icon: 'megaphone',
    label: 'promos'
  },
  // Resultados deshabilitado por ahora (atribuir recuperos es difícil de
  // medir bien). Para reactivar: descomentar esto y poner HABILITADO=true
  // en src/app/dashboard/resultados/page.tsx.
  // {
  //   title: 'Resultados',
  //   href: '/dashboard/resultados',
  //   icon: 'magnet',
  //   label: 'resultados'
  // },
  {
    title: 'Facturas',
    href: '/dashboard/invoices',
    icon: 'invoice',
    label: 'facturas',
    feature: 'recibos'
  },
  {
    title: 'Productos',
    href: '/dashboard/products',
    icon: 'box',
    label: 'productos',
    feature: 'productos'
  },

  {
    title: 'Ajustes',
    href: '/dashboard/ajustes',
    icon: 'gear',
    label: 'ajustes'
  }
];
