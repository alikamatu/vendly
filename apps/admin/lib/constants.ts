import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Tag,
  Users,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  MessageSquare,
  Activity,
  Bell,
  Settings,
  Mail,
  type LucideIcon,
} from 'lucide-react';

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Commerce & Operations',
    items: [
      {
        title: 'Orders',
        href: '/orders',
        icon: ShoppingBag,
        badgeKey: 'pendingOrders',
      },
      {
        title: 'Products',
        href: '/products',
        icon: Package,
      },
      {
        title: 'Categories',
        href: '/categories',
        icon: FolderTree,
      },
      {
        title: 'Brands',
        href: '/brands',
        icon: Tag,
      },
      {
        title: 'Payments',
        href: '/payments',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Trust & Safety',
    items: [
      {
        title: 'Verifications',
        href: '/verifications',
        icon: ShieldCheck,
        badgeKey: 'pendingApprovals',
      },
      {
        title: 'Returns & Disputes',
        href: '/returns',
        icon: RotateCcw,
        badgeKey: 'pendingReturns',
      },
      {
        title: 'Reviews',
        href: '/reviews',
        icon: MessageSquare,
        badgeKey: 'flaggedReviews',
      },
    ],
  },
  {
    title: 'Audience & Growth',
    items: [
      {
        title: 'Users & Sellers',
        href: '/users',
        icon: Users,
      },
      {
        title: 'Newsletter',
        href: '/newsletter',
        icon: Mail,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Audit Log',
        href: '/audit-log',
        icon: Activity,
      },
      {
        title: 'Notifications',
        href: '/notifications',
        icon: Bell,
        badgeKey: 'unreadNotifications',
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
];

export const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
  },
  PAID: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
  },
  PROCESSING: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/20',
  },
  SHIPPED: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
  },
  DELIVERED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
  },
  CANCELLED: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-500 dark:text-zinc-400',
    border: 'border-zinc-500/20',
  },
  REFUNDED: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
  },
};

export const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', text: 'Admin' },
  SELLER: { bg: 'bg-brand/10 text-brand', text: 'Seller' },
  USER: { bg: 'bg-muted text-muted-foreground', text: 'Buyer' },
};
