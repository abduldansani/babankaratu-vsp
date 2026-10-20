"use client";

import { useThemeMode } from "@/hooks/useThemeMode";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeSwitchProps {
  className?: string;
}

export default function ThemeSwitch({ className }: ThemeSwitchProps) {
  const { isDark, toggleTheme, mounted } = useThemeMode();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted
          ? `Switch to ${isDark ? "light" : "dark"} mode`
          : "Toggle theme"
      }
      className={cn(
        "grid size-10 cursor-pointer place-items-center rounded-xl border border-border bg-card text-foreground shadow-xs transition-all hover:bg-muted hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
        className
      )}
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-[18px] text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="size-[18px] text-slate-700 transition-transform duration-200 -rotate-12 hover:rotate-0" />
        )
      ) : (
        <span className="size-4 rounded-full bg-muted animate-pulse" />
      )}
    </button>
  );
}
