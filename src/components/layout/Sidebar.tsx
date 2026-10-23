"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  ArrowLeftRight,
  Package,
  SlidersHorizontal,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

export default function Sidebar({ menuOpen, setMenuOpen }: SidebarProps) {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "/dashboard";
    }
    if (href === "/products") {
      return pathname === "/products";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const operationsItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/sales", label: "Sales", icon: ShoppingCart },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/purchases", label: "Purchases", icon: ShoppingBag },
    { href: "/suppliers", label: "Suppliers", icon: Truck },
  ];

  const inventoryItems: NavItem[] = [
    { href: "/products", label: "Products", icon: Package },
    { href: "/products/settings", label: "Product Settings", icon: SlidersHorizontal },
  ];

  const financialItems: NavItem[] = [
    { href: "/profit", label: "Profit", icon: TrendingUp },
    { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  ];

  const renderNavGroup = (items: NavItem[]) => {
    return items.map(({ href, label, icon: Icon, badge }) => {
      const active = isItemActive(href);
      return (
        <Link
          key={href}
          href={href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            "flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150",
            active
              ? "bg-primary text-primary-foreground shadow-[inset_3px_0_#ffffff] shadow-md shadow-primary/25"
              : "text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.99]",
          )}
        >
          <div className="flex items-center gap-3">
            <Icon
              className={cn(
                "size-[18px]",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
              aria-hidden="true"
            />
            <span>{label}</span>
          </div>
          {badge && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                active
                  ? "bg-white/20 text-white"
                  : "bg-primary/10 text-primary",
              )}
            >
              {badge}
            </span>
          )}
        </Link>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {menuOpen && (
        <button
          className="fixed inset-0 top-18 z-20 bg-black/50 backdrop-blur-xs md:hidden"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar Aside */}
      <aside
        id="portal-navigation"
        className={cn(
          "fixed inset-y-0 left-0 top-18 z-20 flex w-64 flex-col border-r border-border bg-card/95 backdrop-blur-md p-4 text-foreground transition-transform duration-200 ease-in-out md:translate-x-0 shadow-xs",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <nav
          aria-label="Main navigation"
          className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto"
        >
          <small className="px-3 py-2 text-[10px] font-black tracking-widest text-primary uppercase">
            OPERATIONS
          </small>
          {renderNavGroup(operationsItems)}

          <small className="mt-5 px-3 py-2 text-[10px] font-black tracking-widest text-primary uppercase">
            INVENTORY & CATALOG
          </small>
          {renderNavGroup(inventoryItems)}

          <small className="mt-5 px-3 py-2 text-[10px] font-black tracking-widest text-primary uppercase">
            FINANCIALS & REPORTS
          </small>
          {renderNavGroup(financialItems)}
        </nav>

        {/* Bottom Status Card */}
        {/* <div className="mt-auto grid gap-2 border-t border-border/70 pt-3">
          <div className="rounded-xl border border-border/80 bg-muted/40 p-3 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground font-semibold">
              <span className="flex items-center gap-1.5">
                <Database className="size-3.5 text-primary" />
                Local MongoDB
              </span>
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[11px] text-muted-foreground">
              db: <code className="text-foreground font-mono">bauchi-vsp</code>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-primary font-bold mt-1">
              <Sparkles className="size-3" />
              <span>Fullstack Next.js Ready</span>
            </div>
          </div>
        </div> */}
      </aside>
    </>
  );
}
