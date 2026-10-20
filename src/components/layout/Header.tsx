"use client";

import Link from "next/link";
import { Wrench, Menu, X, Database } from "lucide-react";
import ThemeSwitch from "@/components/theme-switch";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  menuOpen: boolean;
  setMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export default function Header({ menuOpen, setMenuOpen }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-18 items-center justify-between border-b border-border bg-card/85 px-4 sm:px-7 backdrop-blur-md shadow-xs">
      {/* Brand & Logo */}
      <Link
        href="/"
        className="inline-flex items-center gap-3 text-[15px] font-extrabold tracking-tight text-foreground group"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
          <Wrench className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <span className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
            BAUCHI <span className="text-primary font-black">VSP</span>
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
            Vehicle Spare Parts
          </span>
        </div>
      </Link>

      {/* Action Tools */}
      <div className="flex items-center gap-3">
        {/* Local MongoDB Status Badge */}
        <div className="hidden sm:flex items-center">
          <Badge
            variant="outline"
            className="gap-1.5 py-1 px-3 text-xs font-medium border-border/80 bg-muted/40"
          >
            <Database className="size-3.5 text-primary" />
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {/* <span>MongoDB Local</span> */}
          </Badge>
        </div>

        {/* Theme Switcher Button */}
        <ThemeSwitch />

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-muted active:scale-95 md:hidden"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          aria-controls="portal-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="size-5 text-foreground" aria-hidden="true" />
          ) : (
            <Menu className="size-5 text-foreground" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
