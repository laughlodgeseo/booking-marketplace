import type { ReactNode } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

export type PortalRole = "vendor" | "admin" | "customer";
type TranslateFn = (key: string) => string;

export type PortalNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  group?: string;
};

function translate(translateFn: TranslateFn | undefined, key: string, fallback: string): string {
  if (!translateFn) return fallback;
  try {
    return translateFn(key);
  } catch {
    return fallback;
  }
}

export function roleLabel(role?: PortalRole, translateFn?: TranslateFn): string {
  if (role === "admin") return translate(translateFn, "roles.admin", "Admin Portal");
  if (role === "vendor") return translate(translateFn, "roles.vendor", "Vendor Portal");
  if (role === "customer") return translate(translateFn, "roles.customer", "Customer Portal");
  return translate(translateFn, "roles.default", "Portal");
}

export function getRoleNav(role?: PortalRole, translateFn?: TranslateFn): PortalNavItem[] {
  const gWorkspace = translate(translateFn, "groups.workspace", "Workspace");
  const gOperations = translate(translateFn, "groups.operations", "Operations");
  const gFinance = translate(translateFn, "groups.finance", "Finance");
  const gAccount = translate(translateFn, "groups.account", "Account");

  if (role === "vendor") {
    return [
      { href: "/vendor", label: translate(translateFn, "nav.dashboard", "Dashboard"), icon: <LayoutDashboard className="h-4 w-4" />, group: gWorkspace },
      { href: "/vendor/properties", label: translate(translateFn, "nav.properties", "Properties"), icon: <Building2 className="h-4 w-4" />, group: gWorkspace },
      { href: "/vendor/bookings", label: translate(translateFn, "nav.bookings", "Bookings"), icon: <ClipboardCheck className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/calendar", label: translate(translateFn, "nav.calendar", "Calendar"), icon: <CalendarDays className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/block-requests", label: translate(translateFn, "nav.blockRequests", "Block Requests"), icon: <CalendarDays className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/messages", label: translate(translateFn, "nav.messages", "Messages"), icon: <MessageSquare className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/notifications", label: translate(translateFn, "nav.notifications", "Notifications"), icon: <Bell className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/ops-tasks", label: translate(translateFn, "nav.opsTasks", "Ops Tasks"), icon: <Wrench className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/maintenance", label: translate(translateFn, "nav.maintenance", "Maintenance"), icon: <Wrench className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/work-orders", label: translate(translateFn, "nav.workOrders", "Work Orders"), icon: <Wrench className="h-4 w-4" />, group: gOperations },
      { href: "/vendor/statements", label: translate(translateFn, "nav.statements", "Statements"), icon: <CreditCard className="h-4 w-4" />, group: gFinance },
    ];
  }

  if (role === "admin") {
    return [
      { href: "/admin", label: translate(translateFn, "nav.dashboard", "Dashboard"), icon: <LayoutDashboard className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/review-queue", label: translate(translateFn, "nav.reviewQueue", "Review Queue"), icon: <ShieldCheck className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/reviews", label: translate(translateFn, "nav.guestReviews", "Guest Reviews"), icon: <ShieldCheck className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/vendors", label: translate(translateFn, "nav.vendors", "Vendors"), icon: <Users className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/properties", label: translate(translateFn, "nav.properties", "Properties"), icon: <Building2 className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/properties/new", label: translate(translateFn, "nav.createProperty", "Create Property"), icon: <Settings2 className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/contact-submissions", label: translate(translateFn, "nav.contactSubmissions", "Contact Submissions"), icon: <MessageSquare className="h-4 w-4" />, group: gWorkspace },
      { href: "/admin/bookings", label: translate(translateFn, "nav.bookings", "Bookings"), icon: <ClipboardCheck className="h-4 w-4" />, group: gOperations },
      { href: "/admin/calendar", label: translate(translateFn, "nav.calendar", "Calendar"), icon: <CalendarDays className="h-4 w-4" />, group: gOperations },
      { href: "/admin/block-requests", label: translate(translateFn, "nav.blockRequests", "Block Requests"), icon: <CalendarDays className="h-4 w-4" />, group: gOperations },
      { href: "/admin/messages", label: translate(translateFn, "nav.messages", "Messages"), icon: <MessageSquare className="h-4 w-4" />, group: gOperations },
      { href: "/admin/notifications", label: translate(translateFn, "nav.notifications", "Notifications"), icon: <Bell className="h-4 w-4" />, group: gOperations },
      { href: "/admin/ops-tasks", label: translate(translateFn, "nav.opsTasks", "Ops Tasks"), icon: <Wrench className="h-4 w-4" />, group: gOperations },
      { href: "/admin/properties/deletion-requests", label: translate(translateFn, "nav.deletionRequests", "Deletion Requests"), icon: <Wrench className="h-4 w-4" />, group: gOperations },
      { href: "/admin/properties/unpublish-requests", label: translate(translateFn, "nav.unpublishRequests", "Unpublish Requests"), icon: <Wrench className="h-4 w-4" />, group: gOperations },
      { href: "/admin/payments", label: translate(translateFn, "nav.payments", "Payments"), icon: <CreditCard className="h-4 w-4" />, group: gFinance },
      { href: "/admin/refunds", label: translate(translateFn, "nav.refunds", "Refunds"), icon: <CreditCard className="h-4 w-4" />, group: gFinance },
      { href: "/admin/customer-documents", label: translate(translateFn, "nav.guestDocuments", "Guest Documents"), icon: <ShieldCheck className="h-4 w-4" />, group: gOperations },
      { href: "/admin/statements", label: translate(translateFn, "nav.statements", "Statements"), icon: <CreditCard className="h-4 w-4" />, group: gFinance },
      { href: "/admin/payouts", label: translate(translateFn, "nav.payouts", "Payouts"), icon: <CreditCard className="h-4 w-4" />, group: gFinance },
    ];
  }

  if (role === "customer") {
    return [
      { href: "/account", label: translate(translateFn, "nav.dashboard", "Dashboard"), icon: <LayoutDashboard className="h-4 w-4" />, group: gAccount },
      { href: "/account/bookings", label: translate(translateFn, "nav.bookings", "Bookings"), icon: <ClipboardCheck className="h-4 w-4" />, group: gAccount },
      { href: "/account/documents", label: translate(translateFn, "nav.documents", "Documents"), icon: <ShieldCheck className="h-4 w-4" />, group: gAccount },
      { href: "/account/calendar", label: translate(translateFn, "nav.calendar", "Calendar"), icon: <CalendarDays className="h-4 w-4" />, group: gAccount },
      { href: "/account/messages", label: translate(translateFn, "nav.messages", "Messages"), icon: <MessageSquare className="h-4 w-4" />, group: gAccount },
      { href: "/account/notifications", label: translate(translateFn, "nav.notifications", "Notifications"), icon: <Bell className="h-4 w-4" />, group: gAccount },
      { href: "/account/refunds", label: translate(translateFn, "nav.refunds", "Refunds"), icon: <CreditCard className="h-4 w-4" />, group: gAccount },
    ];
  }

  return [];
}

export function groupNav(items: PortalNavItem[]): Array<{ group: string; items: PortalNavItem[] }> {
  const map = new Map<string, PortalNavItem[]>();
  for (const item of items) {
    const group = (item.group ?? "General").trim() || "General";
    const current = map.get(group) ?? [];
    current.push(item);
    map.set(group, current);
  }
  return Array.from(map.entries()).map(([group, groupedItems]) => ({ group, items: groupedItems }));
}
