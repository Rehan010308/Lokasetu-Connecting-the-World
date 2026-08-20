'use client';

/**
 * Every icon the app uses, imported once.
 *
 * A single import point means the icon set can be swapped, restyled or
 * tree-shaken from one file, and it keeps `lucide-react` out of forty
 * component headers.
 */

import type { ComponentType } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Car,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  Droplets,
  Filter,
  Globe,
  Hammer,
  Heart,
  Home,
  IndianRupee,
  Inbox,
  Info,
  Leaf,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paintbrush,
  Pencil,
  Plus,
  Scissors,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  TrendingUp,
  Truck,
  User,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

export {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Car,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock,
  Droplets,
  Filter,
  Globe,
  Hammer,
  Heart,
  Home,
  IndianRupee,
  Inbox,
  Info,
  Leaf,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paintbrush,
  Pencil,
  Plus,
  Scissors,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Trash2,
  TrendingUp,
  Truck,
  User,
  UserPlus,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
};

/**
 * The shape every icon in this app is used at.
 *
 * Written as an explicit `ComponentType` import rather than the `React.*` UMD
 * global, so this file does not depend on React being in scope ambiently.
 */
export type IconComponent = ComponentType<{
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  color?: string;
}>;

/** The name in `lib/catalog.ts` resolved to a component. */
const BY_NAME: Record<string, IconComponent> = {
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  Sparkles,
  ChefHat,
  Car,
  Leaf,
  Wrench,
  Scissors,
  Truck,
  ShieldCheck,
  BookOpen,
  Heart,
  Briefcase,
};

export function iconByName(name: string | null | undefined): IconComponent {
  if (!name) return Briefcase;
  return BY_NAME[name] ?? Briefcase;
}
